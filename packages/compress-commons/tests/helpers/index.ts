import * as crypto from "node:crypto";
import { WriteStream } from "node:fs";

function binaryBuffer(n: number): Buffer<ArrayBuffer> {
  const buffer = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    buffer.writeUInt8(i & 255, i);
  }
  return buffer;
}

class WriteHashStream extends WriteStream {
  hash: crypto.Hash;
  digest: null | string;

  constructor(path: string, options?) {
    super(path, options);
    this.hash = crypto.createHash("sha1");
    this.digest = null;
    this.on("close", () => {
      this.digest = this.hash.digest("hex");
    });
  }

  write(chunk): boolean {
    if (chunk) {
      this.hash.update(chunk);
    }
    return super.write(chunk);
  }
}

export { WriteHashStream, binaryBuffer };
