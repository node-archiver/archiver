function isBuffer(value: unknown) {
  return Buffer.isBuffer(value) || value instanceof Uint8Array;
}

function copy(
  source: Buffer,
  target: Uint8Array,
  targetStart?: number,
  start?: number,
  end?: number,
): number {
  return toBuffer(source).copy(target, targetStart, start, end);
}

function equals(a: Buffer, b: Uint8Array): boolean {
  return toBuffer(a).equals(b);
}

export function toBuffer(buffer): Buffer {
  if (Buffer.isBuffer(buffer)) return buffer;
  return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function toString(
  buffer,
  encoding?: BufferEncoding,
  start?: number,
  end?: number,
): string {
  return toBuffer(buffer).toString(encoding, start, end);
}

export { isBuffer, copy, equals, toString };
