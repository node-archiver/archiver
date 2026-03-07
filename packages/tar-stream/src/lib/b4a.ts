function toBuffer(buffer): Buffer {
  if (Buffer.isBuffer(buffer)) return buffer;
  return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function toString(
  buffer: Buffer | { buffer: ArrayBufferLike; byteOffset: number; byteLength: number },
  encoding?: BufferEncoding,
  start?: number,
  end?: number,
): string {
  return toBuffer(buffer).toString(encoding, start, end);
}

export { toString };
