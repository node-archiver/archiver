import type { Stream } from "node:stream";
import { type Gzip, type ZlibOptions, createGzip } from "node:zlib";

import * as TarStream from "@archiver/tar-stream";

import { collectStream } from "../utils";

type TarPack = ReturnType<typeof TarStream.pack>;

interface TarOptions {
  gzip: boolean;
  gzipOptions?: ZlibOptions;
}

class Tar {
  engine: TarPack;
  compressor: Gzip | null;
  options: TarOptions;

  constructor(options?: Partial<TarOptions>) {
    const normalizedOptions = (this.options = { gzip: false, ...options });

    this.engine = TarStream.pack(normalizedOptions);
    this.compressor = null;
    if (normalizedOptions.gzip) {
      this.compressor = createGzip(normalizedOptions.gzipOptions);
      this.compressor.on("error", this._onCompressorError.bind(this));
    }
  }

  private _onCompressorError(err: Error): void {
    this.engine.emit("error", err);
  }

  append(source: Buffer | Stream, data, callback): void {
    data.mtime = data.date;
    const append = (err, sourceBuffer) => {
      if (err) {
        callback(err);
        return;
      }
      this.engine.entry(data, sourceBuffer, function (err) {
        callback(err, data);
      });
    };

    if (data.sourceType === "buffer") {
      append(null, source);
    } else if (data.sourceType === "stream" && data.stats) {
      data.size = data.stats.size;
      const entry = this.engine.entry(data, function (err) {
        callback(err, data);
      });
      source.pipe(entry);
    } else if (data.sourceType === "stream") {
      collectStream(source as Stream, append);
    }
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

  pipe(destination: string, options): Gzip {
    if (this.compressor) {
      return this.engine.pipe
        .apply(this.engine, [this.compressor])
        .pipe(destination, options);
    } else {
      return this.engine.pipe.apply(this.engine, arguments);
    }
  }

  /**
   * @return this.engine
   */
  unpipe() {
    if (this.compressor) {
      return this.compressor.unpipe.apply(this.compressor, arguments);
    } else {
      return this.engine.unpipe.apply(this.engine, arguments);
    }
  }
}

export { type TarOptions, Tar };
