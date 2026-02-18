import { Transform } from "node:stream";
import { DeflateRaw } from "node:zlib";

import crc32 from "crc-32";

class CRC32Stream extends Transform {
  constructor(options) {
    super(options);
    this.checksum = Buffer.allocUnsafe(4);
    this.checksum.writeInt32BE(0, 0);
    this.rawSize = 0;
  }
  _transform(chunk, encoding, callback) {
    if (chunk) {
      this.checksum = crc32.buf(chunk, this.checksum) >>> 0;
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

class DeflateCRC32Stream extends DeflateRaw {
  constructor(options) {
    super(options);
    this.checksum = Buffer.allocUnsafe(4);
    this.checksum.writeInt32BE(0, 0);
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
      this.checksum = crc32.buf(chunk, this.checksum) >>> 0;
      this.rawSize += chunk.length;
    }
    super._transform(chunk, encoding, callback);
  }
  digest(encoding) {
    const checksum = Buffer.allocUnsafe(4);
    checksum.writeUInt32BE(this.checksum >>> 0, 0);
    return encoding ? checksum.toString(encoding) : checksum;
  }
  hex() {
    return this.digest("hex").toUpperCase();
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
