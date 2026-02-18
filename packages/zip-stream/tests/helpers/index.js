import { readFileSync } from "node:fs";

export function binaryBuffer(n) {
  var buffer = Buffer.alloc(n);
  for (var i = 0; i < n; i++) {
    buffer.writeUInt8(i & 255, i);
  }
  return buffer;
}

export function fileBuffer(filepath) {
  return readFileSync(filepath);
}
