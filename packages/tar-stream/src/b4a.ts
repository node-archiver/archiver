function isBuffer(value) {
  return Buffer.isBuffer(value) || value instanceof Uint8Array;
}

function alloc(size, fill, encoding) {
  return Buffer.alloc(size, fill, encoding);
}

function copy(source, target, targetStart, start, end) {
  return toBuffer(source).copy(target, targetStart, start, end);
}

function equals(a, b) {
  return toBuffer(a).equals(b);
}

function toBuffer(buffer) {
  if (Buffer.isBuffer(buffer)) return buffer;
  return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function toString(buffer, encoding, start, end) {
  return toBuffer(buffer).toString(encoding, start, end);
}

function write(buffer, string, offset, length, encoding) {
  return toBuffer(buffer).write(string, offset, length, encoding);
}

export { isBuffer, alloc, copy, equals, toString, write };
