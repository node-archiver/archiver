import { Transform } from "node:stream";
// @ts-expect-error
import { DeflateRaw } from "node:zlib";
import { crc32 } from "node:zlib";

class CRC32Stream extends Transform {
  checksum: number;
  rawSize: number;

  constructor(options?) {
    super(options);
    this.checksum = 0;
    this.rawSize = 0;
  }

  _transform(chunk, encoding, callback) {
    if (chunk) {
      this.checksum = crc32(chunk, this.checksum) >>> 0;
      this.rawSize += chunk.length;
    }
    callback(null, chunk);
  }

  digest(encoding) {
    const checksum = Buffer.allocUnsafe(4);
    checksum.writeUInt32BE(this.checksum >>> 0, 0);
    return encoding ? checksum.toString(encoding) : checksum;
  }

  hex() {
    return this.digest("hex").toUpperCase();
  }

  size() {
    return this.rawSize;
  }
}

// @ts-expect-error
class DeflateCRC32Stream extends DeflateRaw {
  checksum: number;
  rawSize: number;
  compressedSize: number;

  constructor(options) {
    super(options);
    this.checksum = 0;
    this.rawSize = 0;
    this.compressedSize = 0;
  }

  push(chunk, encoding) {
    if (chunk) {
      this.compressedSize += chunk.length;
    }
    return super.push(chunk, encoding);
  }
  _transform(chunk, encoding, callback) {
    if (chunk) {
      this.checksum = crc32(chunk, this.checksum) >>> 0;
      this.rawSize += chunk.length;
    }
    super._transform(chunk, encoding, callback);
  }

  digest<T extends string | Buffer>(encoding?: "hex"): T {
    const checksum = Buffer.allocUnsafe(4);
    checksum.writeUInt32BE(this.checksum >>> 0, 0);
    return (encoding ? checksum.toString(encoding) : checksum) as T;
  }

  hex() {
    return this.digest<string>("hex").toUpperCase();
  }

  size(compressed = false) {
    if (compressed) {
      return this.compressedSize;
    } else {
      return this.rawSize;
    }
  }
}

export { CRC32Stream, DeflateCRC32Stream };
