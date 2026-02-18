import Stream, { Transform, TransformCallback } from "node:stream";

import crc32 from "buffer-crc32";

import { collectStream } from "../utils.js";

export default class Json extends Transform {
  /**
   * @constructor
   * @param {(TransformOptions)} options
   */
  constructor(options) {
    super({ ...options });
    this.files = [];
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    callback(null, chunk);
  }

  /**
   * [_writeStringified description]
   *
   * @private
   * @return void
   */
  _writeStringified() {
    const fileString = JSON.stringify(this.files);
    this.write(fileString);
  }
  /**
   * [append description]
   *
   * @param  {(Buffer|Stream)}   source
   * @param  {EntryData}   data
   * @param  {Function} callback
   * @return void
   */
  append(source: Buffer | Stream, data, callback): void {
    data.crc32 = 0;
    const onend = (err, sourceBuffer) => {
      if (err) {
        callback(err);
        return;
      }
      data.size = sourceBuffer.length || 0;
      data.crc32 = crc32.unsigned(sourceBuffer);
      this.files.push(data);
      callback(null, data);
    };

    if (data.sourceType === "buffer") {
      onend(null, source);
    } else if (data.sourceType === "stream") {
      collectStream(source, onend);
    }
  }
  /**
   * [finalize description]
   *
   * @return void
   */
  finalize() {
    this._writeStringified();
    this.end();
  }
}
