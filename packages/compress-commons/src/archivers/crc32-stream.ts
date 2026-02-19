import { Transform, type TransformCallback } from "node:stream";
import { DeflateRaw, type ZlibOptions } from "node:zlib";
import { crc32 } from "node:zlib";

class CRC32Stream extends Transform {
  checksum: number;
  rawSize: number;

  constructor() {
    super();
    this.checksum = 0;
    this.rawSize = 0;
  }

  _transform(
    chunk: string | Buffer,
    encoding: string,
    callback: (error?: Error | null, data?: string | Buffer) => void,
  ): void {
    if (chunk) {
      this.checksum = crc32(chunk, this.checksum) >>> 0;
      this.rawSize += chunk.length;
    }
    callback(null, chunk);
  }

  digest<T extends string | Buffer>(encoding?: "hex"): T {
    const checksum = Buffer.allocUnsafe(4);
    checksum.writeUInt32BE(this.checksum >>> 0, 0);
    return (encoding ? checksum.toString(encoding) : checksum) as T;
  }

  hex(): string {
    return this.digest<string>("hex").toUpperCase();
  }

  size(): number {
    return this.rawSize;
  }
}

class DeflateCRC32Stream extends DeflateRaw {
  checksum: number;
  rawSize: number;
  compressedSize: number;

  constructor(options?: ZlibOptions) {
    super(options);
    this.checksum = 0;
    this.rawSize = 0;
    this.compressedSize = 0;
  }

  push(chunk: string | Buffer, encoding?: BufferEncoding): boolean {
    if (chunk) {
      this.compressedSize += chunk.length;
    }
    return super.push(chunk, encoding);
  }

  _transform(
    chunk: string | Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
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

  hex(): string {
    return this.digest<string>("hex").toUpperCase();
  }

  size(compressed: boolean = false): number {
    if (compressed) {
      return this.compressedSize;
    } else {
      return this.rawSize;
    }
  }
}

export { CRC32Stream, DeflateCRC32Stream };
