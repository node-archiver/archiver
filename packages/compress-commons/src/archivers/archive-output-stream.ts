import {
  Stream,
  Transform,
  isReadable,
  isWritable,
  PassThrough,
} from "node:stream";

import { ArchiveEntry } from "./archive-entry";

function normalizeInputSource(source: null | string | Stream) {
  if (source === null) {
    return Buffer.alloc(0);
  }

  if (typeof source === "string") {
    return Buffer.from(source);
  }

  if ((isReadable(source) || isWritable(source)) && !source._readableState) {
    const normalized = new PassThrough();
    source.pipe(normalized);
    return normalized;
  }

  return source;
}

class ArchiveOutputStream extends Transform {
  offset: number;
  private _archive: { finish: boolean; finished: boolean; processing: boolean };

  constructor(options?: Stream.TransformOptions) {
    super(options);

    this.offset = 0;
    this._archive = {
      finish: false,
      finished: false,
      processing: false,
    };
  }

  _appendBuffer(zae, source, callback) {
    // scaffold only
  }

  _appendStream(zae, source, callback) {
    // scaffold only
  }

  _emitErrorCallback(err) {
    if (err) {
      this.emit("error", err);
    }
  }

  _finish(ae?) {
    // scaffold only
  }

  _normalizeEntry(ae) {
    // scaffold only
  }

  _transform(chunk, encoding, callback) {
    callback(null, chunk);
  }

  entry(ae, source, callback) {
    source = source || null;
    if (typeof callback !== "function") {
      callback = this._emitErrorCallback.bind(this);
    }
    if (!(ae instanceof ArchiveEntry)) {
      callback(new Error("not a valid instance of ArchiveEntry"));
      return;
    }
    if (this._archive.finish || this._archive.finished) {
      callback(new Error("unacceptable entry after finish"));
      return;
    }
    if (this._archive.processing) {
      callback(new Error("already processing an entry"));
      return;
    }
    this._archive.processing = true;
    this._normalizeEntry(ae);
    this._entry = ae;
    source = normalizeInputSource(source);
    if (Buffer.isBuffer(source)) {
      this._appendBuffer(ae, source, callback);
    } else if (isReadable(source) || isWritable(source)) {
      this._appendStream(ae, source, callback);
    } else {
      this._archive.processing = false;
      callback(
        new Error("input source must be valid Stream or Buffer instance"),
      );
      return;
    }
    return this;
  }

  finish() {
    if (this._archive.processing) {
      this._archive.finish = true;
      return;
    }
    this._finish();
  }

  getBytesWritten() {
    return this.offset;
  }

  write(chunk, cb?) {
    if (chunk) {
      this.offset += chunk.length;
    }
    return super.write(chunk, cb);
  }
}

export { ArchiveOutputStream };
