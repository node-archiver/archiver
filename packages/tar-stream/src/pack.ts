import { constants } from "node:fs";

import * as b4a from "./b4a";
import * as headers from "./headers";
import type { HeaderType, TarHeader } from "./headers";
import {
  Readable,
  Writable,
  getStreamError,
  type ReadableOptions,
} from "./streamx";

const DMODE = 0o755;
const FMODE = 0o644;

const END_OF_TAR = Buffer.alloc(1024);

interface SinkHeader {
  type: "symlink" | "file" | "contiguous-file";
  linkname: string;
  size: number;
}

class Sink extends Writable {
  written: number;
  header: SinkHeader;

  private _isLinkname: boolean;
  private _isVoid: boolean;
  private _finished: boolean;
  private _pack: TarPack;

  constructor(pack: TarPack, header: SinkHeader, callback?) {
    super({ mapWritable, eagerOpen: true });

    this.written = 0;
    this.header = header;

    this._callback = callback;
    this._linkname = null;
    this._isLinkname = header.type === "symlink" && !header.linkname;
    this._isVoid = header.type !== "file" && header.type !== "contiguous-file";
    this._finished = false;
    this._pack = pack;
    this._openCallback = null;

    if (this._pack._stream === null) this._pack._stream = this;
    else this._pack._pending.push(this);
  }

  _open(callback): void {
    this._openCallback = callback;
    if (this._pack._stream === this) this._continueOpen();
  }

  _continuePack(err: Error | null): void {
    if (this._callback === null) return;

    const callback = this._callback;
    this._callback = null;

    callback(err);
  }

  _continueOpen(): void {
    if (this._pack._stream === null) this._pack._stream = this;

    const callback = this._openCallback;
    this._openCallback = null;

    if (callback === null) return;

    if (this._pack.destroying) {
      return callback(new Error("pack stream destroyed"));
    }

    if (this._pack._finalized) {
      return callback(new Error("pack stream is already finalized"));
    }

    this._pack._stream = this;

    if (!this._isLinkname) {
      this._pack._encode(this.header);
    }

    if (this._isVoid) {
      this._finish();
      this._continuePack(null);
    }

    callback(null);
  }

  _write(data, callback): void {
    if (this._isLinkname) {
      this._linkname = this._linkname
        ? Buffer.concat([this._linkname, data])
        : data;
      return callback(null);
    }

    if (this._isVoid) {
      if (data.byteLength > 0) {
        return callback(new Error("No body allowed for this entry"));
      }
      return callback();
    }

    this.written += data.byteLength;
    if (this._pack.push(data)) return callback();
    this._pack._drain = callback;
  }

  _finish(): void {
    if (this._finished) return;
    this._finished = true;

    if (this._isLinkname) {
      this.header.linkname = this._linkname
        ? b4a.toString(this._linkname, "utf-8")
        : "";
      this._pack._encode(this.header);
    }

    overflow(this._pack, this.header.size);

    this._pack._done(this);
  }

  _final(callback: (err: Error | null) => void): void {
    if (this.written !== this.header.size) {
      // corrupting tar
      return callback(new Error("Size mismatch"));
    }

    this._finish();
    callback(null);
  }

  _getError(): Error {
    return getStreamError(this) || new Error("tar entry destroyed");
  }

  _predestroy(): void {
    this._pack.destroy(this._getError());
  }

  _destroy(callback: () => void): void {
    this._pack._done(this);

    this._continuePack(this._finished ? null : this._getError());

    callback();
  }
}

interface TarPackOptions extends ReadableOptions {}

class TarPack extends Readable {
  private _drain: () => void;
  private _finalized: boolean;
  private _finalizing: boolean;

  constructor(opts?: TarPackOptions) {
    super(opts);

    this._drain = () => {};
    this._finalized = false;
    this._finalizing = false;
    this._pending = [];
    this._stream = null;
  }

  entry(
    header: Partial<TarHeader>,
    callback?: (err?: Error | null) => void,
  ): Sink;
  entry(
    header: Partial<TarHeader>,
    buffer: string | Buffer | ((err?: Error | null) => void),
    callback?: (err?: Error | null) => void,
  ): Sink;

  entry(header: Partial<TarHeader>, bufferOrCallback, callback?): Sink {
    if (this._finalized || this.destroying) {
      throw new Error("already finalized or destroyed");
    }

    if (typeof bufferOrCallback === "function") {
      callback = bufferOrCallback;
      bufferOrCallback = null;
    }

    if (!callback) callback = () => {};

    if (!header.size || header.type === "symlink") header.size = 0;
    if (!header.type) header.type = modeToType(header.mode);
    if (!header.mode) header.mode = header.type === "directory" ? DMODE : FMODE;
    if (!header.uid) header.uid = 0;
    if (!header.gid) header.gid = 0;
    if (!header.mtime) header.mtime = new Date();

    if (typeof bufferOrCallback === "string")
      bufferOrCallback = Buffer.from(bufferOrCallback);

    const sink = new Sink(this, header, callback);

    if (b4a.isBuffer(bufferOrCallback)) {
      header.size = bufferOrCallback.byteLength;
      sink.write(bufferOrCallback);
      sink.end();
      return sink;
    }

    if (sink._isVoid) {
      return sink;
    }

    return sink;
  }

  finalize(): void {
    if (this._stream || this._pending.length > 0) {
      this._finalizing = true;
      return;
    }

    if (this._finalized) return;
    this._finalized = true;

    this.push(END_OF_TAR);
    this.push(null);
  }

  _done(stream): void {
    if (stream !== this._stream) return;

    this._stream = null;

    if (this._finalizing) this.finalize();
    if (this._pending.length) this._pending.shift()._continueOpen();
  }

  _encode(header): void {
    if (!header.pax) {
      const buf = headers.encode(header);
      if (buf) {
        this.push(buf);
        return;
      }
    }
    this._encodePax(header);
  }

  _encodePax(header: TarHeader): void {
    const paxHeader = headers.encodePax({
      name: header.name,
      linkname: header.linkname,
      pax: header.pax,
    });

    const newHeader = {
      name: "PaxHeader",
      mode: header.mode,
      uid: header.uid,
      gid: header.gid,
      size: paxHeader.byteLength,
      mtime: header.mtime,
      type: "pax-header",
      linkname: header.linkname && "PaxHeader",
      uname: header.uname,
      gname: header.gname,
      devmajor: header.devmajor,
      devminor: header.devminor,
    } satisfies TarHeader;

    this.push(headers.encode(newHeader));
    this.push(paxHeader);
    overflow(this, paxHeader.byteLength);

    newHeader.size = header.size;
    newHeader.type = header.type;
    this.push(headers.encode(newHeader));
  }

  _doDrain(): void {
    const drain = this._drain;
    this._drain = () => {};
    drain();
  }

  _predestroy(): void {
    const err = getStreamError(this);

    if (this._stream) this._stream.destroy(err);

    while (this._pending.length) {
      const stream = this._pending.shift();
      stream.destroy(err);
      stream._continueOpen();
    }

    this._doDrain();
  }

  _read(callback: () => void): void {
    this._doDrain();
    callback();
  }
}

function modeToType(mode: number): HeaderType {
  switch (mode & constants.S_IFMT) {
    case constants.S_IFBLK:
      return "block-device";
    case constants.S_IFCHR:
      return "character-device";
    case constants.S_IFDIR:
      return "directory";
    case constants.S_IFIFO:
      return "fifo";
    case constants.S_IFLNK:
      return "symlink";
  }

  return "file";
}

function overflow(self: TarPack, size: number): void {
  size &= 511;
  if (size) self.push(END_OF_TAR.subarray(0, 512 - size));
}

function mapWritable(buf) {
  return b4a.isBuffer(buf) ? buf : Buffer.from(buf);
}

function pack(opts?: TarPackOptions): TarPack {
  return new TarPack(opts);
}

export { pack, type TarPack, type TarPackOptions };
