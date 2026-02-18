import crypto from "node:crypto";
import { WriteStream } from "node:fs";

export function binaryBuffer(n) {
  const buffer = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    buffer.writeUInt8(i & 255, i);
  }
  return buffer;
}

export class WriteHashStream extends WriteStream {
  constructor(path, options) {
    super(path, options);
    this.hash = crypto.createHash("sha1");
    this.digest = null;
    this.on("close", function () {
      this.digest = this.hash.digest("hex");
    });
  }

  write(chunk) {
    if (chunk) {
      this.hash.update(chunk);
    }
    return super.write(chunk);
  }
}
