import type { Stream } from "node:stream";
import type { ZlibOptions } from "node:zlib";

import { ZipStream, type FileEntryData } from "@archiver/zip-stream";

interface ZipEntryData extends FileEntryData {}

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

  append(
    source: Buffer | Stream,
    data: ZipEntryData,
    callback?: (error: Error) => void,
  ): void {
    this.engine.entry(source, data, callback);
  }

  finalize(): void {
    this.engine.finalize();
  }

  on(): ZipStream {
    return this.engine.on.apply(this.engine, arguments);
  }

  pipe(): ZipStream {
    return this.engine.pipe.apply(this.engine, arguments);
  }

  unpipe(): ZipStream {
    return this.engine.unpipe.apply(this.engine, arguments);
  }
}

export { Zip, type ZipOptions };
