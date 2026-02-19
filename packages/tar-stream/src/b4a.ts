function isBuffer(value: unknown) {
  return Buffer.isBuffer(value) || value instanceof Uint8Array;
}

function copy(
  source: Buffer,
  target: Uint8Array,
  targetStart?: number,
  start?: number,
  end?: number,
) {
  return toBuffer(source).copy(target, targetStart, start, end);
}

function equals(a: Buffer, b: Uint8Array) {
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

export { isBuffer, copy, equals, toString, write };
