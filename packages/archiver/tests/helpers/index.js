import { readFileSync } from "node:fs";

export function binaryBuffer(n) {
  const buffer = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    buffer.writeUInt8(i & 255, i);
  }
  return buffer;
}

export function readJSON(filepath) {
  let contents;
  try {
    contents = readFileSync(String(filepath));
    contents = JSON.parse(contents);
  } catch {
    contents = null;
  }
  return contents;
}
