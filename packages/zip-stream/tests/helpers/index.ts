import { readFileSync, type PathOrFileDescriptor } from "node:fs";

export function binaryBuffer(n: number): Buffer {
  const buffer = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    buffer.writeUInt8(i & 255, i);
  }
  return buffer;
}

export function fileBuffer(filepath: PathOrFileDescriptor): Buffer {
  return readFileSync(filepath);
}
