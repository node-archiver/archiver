import { type Stream, Transform, PassThrough } from "node:stream";

import { isStream } from "../util";
import { ArchiveEntry } from "./archive-entry";

function normalizeInputSource(
  source: null | string | Stream | Buffer,
): Stream | Buffer {
  if (source === null) {
    return Buffer.alloc(0);
  }

  if (typeof source === "string") {
    return Buffer.from(source);
  }

  if (
    isStream(source) &&
    // @ts-expect-error
    !source._readableState
  ) {
    const normalized = new PassThrough();
    source.pipe(normalized);
    return normalized;
  }

  return source;
}

abstract class ArchiveOutputStream extends Transform {
  offset: number;

  protected _archive: {
    finish: boolean;
    finished: boolean;
    processing: boolean;
  };
  protected _entry: ArchiveEntry;

  constructor(options?: Stream.TransformOptions) {
    super(options);

    this.offset = 0;
    this._archive = {
      finish: false,
      finished: false,
      processing: false,
    };
  }

  abstract _appendBuffer(
    ae: ArchiveEntry,
    source: Buffer,
    callback: (error: Error) => void,
  ): void;

  abstract _appendStream(
    ae: ArchiveEntry,
    source: Stream,
    callback: (error: Error) => void,
  ): void;

  _emitErrorCallback(err: Error): void {
    if (err) {
      this.emit("error", err);
    }
  }

  abstract _finish(ae?: ArchiveEntry): void;

  abstract _normalizeEntry(ae: ArchiveEntry): void;

  _transform(
    chunk: string | Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: string | Buffer) => void,
  ): void {
    callback(null, chunk);
  }

  entry(
    ae: ArchiveEntry,
    source: string | Stream | Buffer,
    callback?: (error: Error) => void,
  ): this {
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
    } else if (isStream(source)) {
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

  finish(): void {
    if (this._archive.processing) {
      this._archive.finish = true;
      return;
    }
    this._finish();
  }

  getBytesWritten(): number {
    return this.offset;
  }

  // @ts-expect-error
  write(chunk: string | Buffer, callback?: (error: Error) => void): boolean {
    if (chunk) {
      this.offset += chunk.length;
    }
    return super.write(chunk, callback);
  }
}

export { ArchiveOutputStream };
