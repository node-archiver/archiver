import { constants } from "node:fs";
import type { ReadableOptions } from "node:stream";

import * as b4a from "./b4a";
import * as headers from "./headers";
import { Readable, Writable, getStreamError } from "./streamx";

const DMODE = 0o755;
const FMODE = 0o644;

const END_OF_TAR = Buffer.alloc(1024);

type HeaderType =
  | "symlink"
  | "file"
  | "block-device"
  | "character-device"
  | "directory"
  | "fifo"
  | "contiguous-file"
  | "pax-header";

interface TarHeader {
  name: string;
  mode: number;
  uid: number;
  gid: number;
  pax: null | { path?: string; special: string };
  size: number;
  mtime: Date;
  type: HeaderType;
  linkname: string;
  uname: string;
  gname: string;
  devmajor: number;
  devminor: number;
}

class Sink extends Writable {
  written: number;
  header: TarHeader;

  constructor(pack: TarPack, header: TarHeader, callback) {
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

  _open(cb) {
    this._openCallback = cb;
    if (this._pack._stream === this) this._continueOpen();
  }

  _continuePack(err) {
    if (this._callback === null) return;

    const callback = this._callback;
    this._callback = null;

    callback(err);
  }

  _continueOpen() {
    if (this._pack._stream === null) this._pack._stream = this;

    const cb = this._openCallback;
    this._openCallback = null;
    if (cb === null) return;

    if (this._pack.destroying) return cb(new Error("pack stream destroyed"));
    if (this._pack._finalized)
      return cb(new Error("pack stream is already finalized"));

    this._pack._stream = this;

    if (!this._isLinkname) {
      this._pack._encode(this.header);
    }

    if (this._isVoid) {
      this._finish();
      this._continuePack(null);
    }

    cb(null);
  }

  _write(data, cb) {
    if (this._isLinkname) {
      this._linkname = this._linkname
        ? Buffer.concat([this._linkname, data])
        : data;
      return cb(null);
    }

    if (this._isVoid) {
      if (data.byteLength > 0) {
        return cb(new Error("No body allowed for this entry"));
      }
      return cb();
    }

    this.written += data.byteLength;
    if (this._pack.push(data)) return cb();
    this._pack._drain = cb;
  }

  _finish() {
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

  _final(cb) {
    if (this.written !== this.header.size) {
      // corrupting tar
      return cb(new Error("Size mismatch"));
    }

    this._finish();
    cb(null);
  }

  _getError() {
    return getStreamError(this) || new Error("tar entry destroyed");
  }

  _predestroy() {
    this._pack.destroy(this._getError());
  }

  _destroy(cb) {
    this._pack._done(this);

    this._continuePack(this._finished ? null : this._getError());

    cb();
  }
}

interface TarPackOptions extends ReadableOptions {}

class TarPack extends Readable {
  constructor(opts?: TarPackOptions) {
    super(opts);

    this._drain = () => {};
    this._finalized = false;
    this._finalizing = false;
    this._pending = [];
    this._stream = null;
  }

  entry(header: Partial<TarHeader>, callback?): Sink;
  entry(header: Partial<TarHeader>, buffer, callback?): Sink;

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

  finalize() {
    if (this._stream || this._pending.length > 0) {
      this._finalizing = true;
      return;
    }

    if (this._finalized) return;
    this._finalized = true;

    this.push(END_OF_TAR);
    this.push(null);
  }

  _done(stream) {
    if (stream !== this._stream) return;

    this._stream = null;

    if (this._finalizing) this.finalize();
    if (this._pending.length) this._pending.shift()._continueOpen();
  }

  _encode(header) {
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

  _read(cb: () => void): void {
    this._doDrain();
    cb();
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

function overflow(self, size: number): void {
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
