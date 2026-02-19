import type { Stream } from "node:stream";

import ZipStream from "@archiver/zip-stream";

interface ZipEntryData {}

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

class Zip {
  engine: ZipStream;
  options: ZipOptions;

  constructor(options?: Partial<ZipOptions>) {
    const normalizedOptions = {
      comment: "",
      forceUTC: false,
      namePrependSlash: false,
      store: false,
      ...options,
    };
    this.options = normalizedOptions;
    this.engine = new ZipStream(normalizedOptions);
  }

  /**
   * @param  {ZipEntryData} data
   * @param  {String} data.name Sets the entry name including internal path.
   * @param  {(String|Date)} [data.date=NOW()] Sets the entry date.
   * @param  {Number} [data.mode=D:0755/F:0644] Sets the entry permissions.
   * @param  {String} [data.prefix] Sets a path prefix for the entry name. Useful
   * when working with methods like `directory` or `glob`.
   * @param  {fs.Stats} [data.stats] Sets the fs stat data for this entry allowing
   * for reduction of fs stat calls when stat data is already known.
   * @param  {Boolean} [data.store=ZipOptions.store] Sets the compression method to STORE.
   * @param  {Function} callback
   */
  append(source: Buffer | Stream, data: ZipEntryData, callback): void {
    this.engine.entry(source, data, callback);
  }

  finalize(): void {
    this.engine.finalize();
  }

  /**
   * @return this.engine
   */
  on() {
    return this.engine.on.apply(this.engine, arguments);
  }
  /**
   * @return this.engine
   */
  pipe() {
    return this.engine.pipe.apply(this.engine, arguments);
  }
  /**
   * @return this.engine
   */
  unpipe() {
    return this.engine.unpipe.apply(this.engine, arguments);
  }
}

export { Zip, type ZipOptions };
