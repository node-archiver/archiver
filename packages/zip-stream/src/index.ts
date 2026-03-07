import type { Stream } from "node:stream";

import {
  ZipArchiveOutputStream,
  ZipArchiveEntry,
  type ZipOptions,
} from "@archiver/compress-commons";

import { dateify, sanitizePath } from "./utils";

interface ZlibOptions {
  level?: number;
}

interface ZipStreamOptions extends ZipOptions, ZlibOptions {
  /**
   * Sets the zip archive comment.
   * @default ""
   */
  comment: string;
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

interface FileEntryData {
  /**
   * Entry type. Defaults to `directory` if name ends with forward slash
   * @default "file"
   */
  type: "file" | "directory" | "symlink";
  /** Entry name, including internal path */
  name: string | null;
  /** Prepends a forward slash to archive file paths. */
  namePrependSlash: boolean;
  linkname: string | null;
  /** Sets the entry date. Defaults to current date */
  date: Date | null;
  /** Sets the entry permissions. Defaults to D:0755/F:0644 */
  mode: number | null;
  /** Sets the compression method to STORE */
  store: boolean;
  /**
   * Sets the entry comment
   * @default ""
   */
  comment: string;
}

class ZipStream extends ZipArchiveOutputStream {
  declare options: ZipStreamOptions;

  constructor(options?: Partial<ZipStreamOptions>) {
    options ??= {};

    options.zlib ??= {};

    if (typeof options.level === "number") {
      options.zlib.level = options.level;
    }

    if (!options.forceZip64 && options.zlib.level === 0) {
      options.store = true;
    }

    options.namePrependSlash ??= false;

    super(options);

    if (options.comment && options.comment.length > 0) {
      this.setComment(options.comment);
    }
  }

  /**
   * Normalizes entry data with fallbacks for key properties.
   */
  _normalizeFileData(data: Partial<FileEntryData>): FileEntryData {
    const normalizedData = {
      type: "file",
      name: null,
      namePrependSlash: this.options.namePrependSlash,
      linkname: null,
      date: null,
      mode: null,
      store: this.options.store,
      comment: "",
      ...data,
    } satisfies FileEntryData;

    let isDir = normalizedData.type === "directory";
    const isSymlink = normalizedData.type === "symlink";

    if (normalizedData.name) {
      normalizedData.name = sanitizePath(normalizedData.name);
      if (!isSymlink && normalizedData.name.slice(-1) === "/") {
        isDir = true;
        normalizedData.type = "directory";
      } else if (isDir) {
        normalizedData.name += "/";
      }
    }

    if (isDir || isSymlink) {
      normalizedData.store = true;
    }
    normalizedData.date = dateify(data.date ?? undefined);
    return normalizedData;
  }

  /**
   * Appends an entry given an input source (text string, buffer, or stream).
   */
  // @ts-expect-error
  entry(
    source: Buffer | Stream | string,
    data: Partial<FileEntryData>,
    callback?: (error: Error) => void,
  ): this {
    const cb = typeof callback === "function" ? callback : this._emitErrorCallback.bind(this);
    const normalizedData = this._normalizeFileData(data);
    if (
      normalizedData.type !== "file" &&
      normalizedData.type !== "directory" &&
      normalizedData.type !== "symlink"
    ) {
      cb(new Error(normalizedData.type + " entries not currently supported"));
      return this;
    }
    if (typeof normalizedData.name !== "string" || normalizedData.name.length === 0) {
      cb(new Error("entry name must be a non-empty string value"));
      return this;
    }
    if (normalizedData.type === "symlink" && typeof normalizedData.linkname !== "string") {
      cb(
        new Error(
          "entry linkname must be a non-empty string value when type equals symlink",
        ),
      );
      return this;
    }
    const entry = new ZipArchiveEntry(normalizedData.name);
    if (normalizedData.date) {
      entry.setTime(normalizedData.date, this.options.forceLocalTime);
    }
    if (normalizedData.namePrependSlash) {
      entry.setName(normalizedData.name, true);
    }
    if (normalizedData.store) {
      entry.setMethod(0);
    }
    if (normalizedData.comment.length > 0) {
      entry.setComment(normalizedData.comment);
    }
    if (normalizedData.type === "symlink" && typeof normalizedData.mode !== "number") {
      normalizedData.mode = 40960; // 0120000
    }
    if (typeof normalizedData.mode === "number") {
      if (normalizedData.type === "symlink") {
        normalizedData.mode |= 40960;
      }
      entry.setUnixMode(normalizedData.mode);
    }
    if (normalizedData.type === "symlink" && typeof normalizedData.linkname === "string") {
      source = Buffer.from(normalizedData.linkname);
    }
    return super.entry(entry, source, cb);
  }

  /**
   * Finalizes the instance and prevents further appending to the archive structure (queue will continue til drained).
   */
  finalize(): void {
    this.finish();
  }
}

export { ZipStream, type ZipStreamOptions, type FileEntryData };
