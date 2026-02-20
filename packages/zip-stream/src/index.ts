import type { Stream } from "node:stream";

import {
  ZipArchiveOutputStream,
  ZipArchiveEntry,
  type ZipOptions as ZipArchiveOutputStreamOptions,
} from "@archiver/compress-commons";

import { dateify, sanitizePath } from "./utils";

interface ZlibOptions {
  level?: number;
}

interface ZipOptions extends ZipArchiveOutputStreamOptions, ZlibOptions {
  /**
   * Sets the zip archive comment.
   * @default ""
   */
  comment: string;
  /** @default false */
  forceUTC: boolean;
  /**
   * Prepends a forward slash to archive file paths.
   * @default false
   */
  namePrependSlash: boolean;
  /**
   * Sets the compression method to STORE.
   * @default false
   */
  store: boolean;
}

interface EntryData {
  name: string;
  comment?: string;
  date?: Date;
  mode?: number;
  store?: boolean;
  type?: "file" | "directory" | "symlink";
  namePrependSlash?: boolean;
  linkname?: string;
}

class ZipStream extends ZipArchiveOutputStream {
  declare options: ZipOptions;

  constructor(options?: Partial<ZipOptions>) {
    options ??= {};

    options.zlib ??= {};

    if (typeof options.level === "number") {
      options.zlib.level = options.level;
    }

    if (!options.forceZip64 && options.zlib.level === 0) {
      options.store = true;
    }

    options.namePrependSlash = options.namePrependSlash || false;

    super(options);

    if (options.comment && options.comment.length > 0) {
      this.setComment(options.comment);
    }
  }

  /**
   * Normalizes entry data with fallbacks for key properties.
   */
  private _normalizeFileData(data: EntryData): EntryData {
    data = {
      type: "file",
      name: null,
      namePrependSlash: this.options.namePrependSlash,
      linkname: null,
      date: null,
      mode: null,
      store: this.options.store,
      comment: "",
      ...data,
    };
    let isDir = data.type === "directory";
    const isSymlink = data.type === "symlink";
    if (data.name) {
      data.name = sanitizePath(data.name);
      if (!isSymlink && data.name.slice(-1) === "/") {
        isDir = true;
        data.type = "directory";
      } else if (isDir) {
        data.name += "/";
      }
    }
    if (isDir || isSymlink) {
      data.store = true;
    }
    data.date = dateify(data.date);
    return data;
  }

  /**
   * Appends an entry given an input source (text string, buffer, or stream).
   */
  // @ts-expect-error
  entry(
    source: Buffer | Stream | string,
    data: EntryData,
    callback?: (error: Error) => void,
  ): this {
    if (typeof callback !== "function") {
      callback = this._emitErrorCallback.bind(this);
    }
    data = this._normalizeFileData(data);
    if (
      data.type !== "file" &&
      data.type !== "directory" &&
      data.type !== "symlink"
    ) {
      callback(new Error(data.type + " entries not currently supported"));
      return;
    }
    if (typeof data.name !== "string" || data.name.length === 0) {
      callback(new Error("entry name must be a non-empty string value"));
      return;
    }
    if (data.type === "symlink" && typeof data.linkname !== "string") {
      callback(
        new Error(
          "entry linkname must be a non-empty string value when type equals symlink",
        ),
      );
      return;
    }
    const entry = new ZipArchiveEntry(data.name);
    entry.setTime(data.date, this.options.forceLocalTime);
    if (data.namePrependSlash) {
      entry.setName(data.name, true);
    }
    if (data.store) {
      entry.setMethod(0);
    }
    if (data.comment.length > 0) {
      entry.setComment(data.comment);
    }
    if (data.type === "symlink" && typeof data.mode !== "number") {
      data.mode = 40960; // 0120000
    }
    if (typeof data.mode === "number") {
      if (data.type === "symlink") {
        data.mode |= 40960;
      }
      entry.setUnixMode(data.mode);
    }
    if (data.type === "symlink" && typeof data.linkname === "string") {
      source = Buffer.from(data.linkname);
    }
    return super.entry(entry, source, callback);
  }

  /**
   * Finalizes the instance and prevents further appending to the archive structure (queue will continue til drained).
   */
  finalize(): void {
    this.finish();
  }
}

export { ZipStream, type ZipOptions };
