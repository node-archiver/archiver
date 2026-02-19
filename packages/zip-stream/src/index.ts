import type { Stream } from "node:stream";

import {
  ZipArchiveOutputStream,
  ZipArchiveEntry,
} from "@archiver/compress-commons";

import { dateify, sanitizePath } from "./utils.js";

interface ZlibOptions {}

interface ZipOptions {
  /**
   * Sets the zip archive comment.
   * @default ""
   */
  comment: string;
  /** @default false */
  forceUTC: boolean;
  /** Forces the archive to contain local file times instead of UTC. */
  forceLocalTime?: boolean;
  /** Forces the archive to contain ZIP64 headers. */
  forceZip64?: boolean;
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
  zlib?: ZlibOptions;
}

class ZipStream extends ZipArchiveOutputStream {
  constructor(options: Partial<ZipOptions> = {}) {
    options.zlib = options.zlib || {};

    if (typeof options.level === "number" && options.level >= 0) {
      options.zlib.level = options.level;
      delete options.level;
    }

    if (
      !options.forceZip64 &&
      typeof options.zlib.level === "number" &&
      options.zlib.level === 0
    ) {
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
  _normalizeFileData(data) {
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
   *
   * @param  {Object} data
   * @param  {String} data.name Sets the entry name including internal path.
   * @param  {String} [data.comment] Sets the entry comment.
   * @param  {(String|Date)} [data.date=NOW()] Sets the entry date.
   * @param  {Number} [data.mode=D:0755/F:0644] Sets the entry permissions.
   * @param  {Boolean} [data.store=options.store] Sets the compression method to STORE.
   * @param  {String} [data.type=file] Sets the entry type. Defaults to `directory` if name ends with trailing slash.
   * @param  {Function} callback
   */
  entry(source: Buffer | Stream | string, data, callback): this {
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

export { ZipStream, ZipStream as default, type ZipOptions };
