import Stream, {
  Transform,
  type TransformCallback,
  type TransformOptions,
} from "node:stream";
import { crc32 } from "node:zlib";

import { collectStream } from "../utils";

class Json extends Transform {
  files: unknown[];

  constructor(options: TransformOptions) {
    super(options);
    this.files = [];
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    callback(null, chunk);
  }

  private _writeStringified(): void {
    const fileString = JSON.stringify(this.files);
    this.write(fileString);
  }

  append(source: Buffer | Stream, data, callback): void {
    data.crc32 = 0;

    const onend = (err, sourceBuffer: Buffer) => {
      if (err) {
        callback(err);
        return;
      }

      data.size = sourceBuffer.length || 0;
      data.crc32 = crc32(sourceBuffer) >>> 0;
      this.files.push(data);
      callback(null, data);
    };

    if (data.sourceType === "buffer") {
      onend(null, source as Buffer);
    } else if (data.sourceType === "stream") {
      collectStream(source as Stream, onend);
    }
  }

  finalize(): void {
    this._writeStringified();
    this.end();
  }
}

export { Json };
