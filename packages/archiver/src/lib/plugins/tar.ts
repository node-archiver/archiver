import type { Stream } from "node:stream";
import zlib from "node:zlib";

import TarStream from "tar-stream";

import { collectStream } from "../utils";

type Pack = ReturnType<typeof TarStream.pack>;

export default class Tar {
  engine: Pack;
  compressor: zlib.Gzip | null;

  constructor(options) {
    options = this.options = { gzip: false, ...options };
    if (typeof options.gzipOptions !== "object") {
      options.gzipOptions = {};
    }
    this.engine = TarStream.pack(options);
    this.compressor = null;
    if (options.gzip) {
      this.compressor = zlib.createGzip(options.gzipOptions);
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
      collectStream(source, append);
    }
  }
  /**
   * [finalize description]
   *
   * @return void
   */
  finalize() {
    this.engine.finalize();
  }

  /**
   * @return this.engine
   */
  on() {
    return this.engine.on.apply(this.engine, arguments);
  }

  pipe(destination: string, options): zlib.Gzip {
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
