import type { WriteStream } from "node:fs";
import type { Stream } from "node:stream";
import { type Gzip, type ZlibOptions, createGzip } from "node:zlib";

import * as tar from "@archiver/tar-stream";

import type { ArchiverModule, EntryData } from "../core";
import { collectStream } from "../utils";

interface TarEntryData extends EntryData {}

interface TarOptions {
  gzip: boolean;
  gzipOptions?: ZlibOptions;
}

class Tar implements ArchiverModule {
  engine: tar.TarPack;
  compressor: Gzip | null;
  options: TarOptions;

  constructor(options?: Partial<TarOptions>) {
    const normalizedOptions = (this.options = { gzip: false, ...options });

    this.engine = tar.pack(normalizedOptions);
    this.compressor = null;
    if (normalizedOptions.gzip) {
      this.compressor = createGzip(normalizedOptions.gzipOptions);
      this.compressor.on("error", this._onCompressorError.bind(this));
    }
  }

  private _onCompressorError(err: Error): void {
    this.engine.emit("error", err);
  }

  append(
    source: Buffer | Stream,
    data: TarEntryData,
    callback: (error: Error | null, data?: TarEntryData) => void,
  ): void {
    const normalizedData = { ...data, mtime: data.date };

    const append = (err: Error | null, sourceBuffer: Buffer) => {
      if (err) {
        callback(err);
        return;
      }
      this.engine.entry(normalizedData, sourceBuffer, function (err) {
        callback(err, normalizedData);
      });
    };

    if (normalizedData.sourceType === "buffer") {
      append(null, source as Buffer);
      return;
    }

    if (normalizedData.sourceType !== "stream") return;

    if (normalizedData.stats) {
      normalizedData.size = normalizedData.stats.size;
      const entry = this.engine.entry(normalizedData, function (err) {
        callback(err, normalizedData);
      });
      (source as Stream).pipe(entry);
    } else {
      collectStream(source as Stream, append);
    }
  }

  finalize(): void {
    this.engine.finalize();
  }

  on(): tar.TarPack {
    return this.engine.on.apply(this.engine, arguments);
  }

  pipe(destination: WriteStream): Gzip {
    if (this.compressor) {
      return this.engine.pipe
        .apply(this.engine, [this.compressor])
        .pipe(destination);
    } else {
      return this.engine.pipe.apply(this.engine, arguments);
    }
  }

  unpipe(): tar.TarPack {
    if (this.compressor) {
      return this.compressor.unpipe.apply(this.compressor, arguments);
    } else {
      return this.engine.unpipe.apply(this.engine, arguments);
    }
  }
}

export { type TarOptions, Tar };
