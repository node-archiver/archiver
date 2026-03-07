import type { Stream, Writable } from "node:stream";
import { type Gzip, type ZlibOptions, createGzip } from "node:zlib";

import * as tar from "@archiver/tar-stream";

import type { ArchiverModule, EntryData } from "../core";
import { collectStream } from "../utils";

interface TarEntryData extends EntryData {
  mtime?: Date;
  size?: number;
}

interface TarOptions extends Partial<tar.TarPackOptions> {
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
    data: EntryData,
    callback: (error: Error | null, data?: TarEntryData) => void,
  ): void {
    const normalizedData: TarEntryData = { ...data, mtime: data.date };

    const append = (err: Error | null, sourceBuffer: Buffer) => {
      if (err) {
        callback(err);
        return;
      }
      this.engine.entry(normalizedData as never, sourceBuffer, function (err) {
        callback(err ?? null, normalizedData);
      });
    };

    if (normalizedData.sourceType === "buffer") {
      append(null, source as Buffer);
      return;
    }

    if (normalizedData.sourceType !== "stream") return;

    if (normalizedData.stats) {
      normalizedData.size = normalizedData.stats.size;
      const entry = this.engine.entry(normalizedData as never, function (err) {
        callback(err ?? null, normalizedData);
      });
      (source as Stream).pipe(entry as unknown as Writable);
    } else {
      collectStream(source as Stream, append);
    }
  }

  finalize(): void {
    this.engine.finalize();
  }

  on(event: string, listener: (...args: unknown[]) => void): unknown {
    return this.engine.on(event, listener as (...args: unknown[]) => void);
  }

  pipe(destination: unknown): unknown {
    if (this.compressor) {
      return (this.engine.pipe(this.compressor as never) as unknown as { pipe(dest: unknown): unknown }).pipe(destination);
    } else {
      return this.engine.pipe(destination as never);
    }
  }

  unpipe(destination?: unknown): unknown {
    if (this.compressor) {
      return this.compressor.unpipe(destination as NodeJS.WritableStream);
    } else {
      return (this.engine as unknown as NodeJS.ReadableStream).unpipe(destination as NodeJS.WritableStream);
    }
  }
}

export { type TarOptions, Tar };
