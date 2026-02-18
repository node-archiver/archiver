import { readFileSync } from "node:fs";

export function binaryBuffer(n) {
  var buffer = Buffer.alloc(n);
  for (var i = 0; i < n; i++) {
    buffer.writeUInt8(i & 255, i);
  }
  return buffer;
}

export function readJSON(filepath) {
  var contents;
  try {
    contents = readFileSync(String(filepath));
    contents = JSON.parse(contents);
  } catch (e) {
    contents = null;
  }
  return contents;
}
