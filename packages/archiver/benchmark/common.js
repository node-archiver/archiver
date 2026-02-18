function binaryBuffer(n) {
  const buffer = Buffer.alloc(n);

  for (let i = 0; i < n; i++) {
    buffer.writeUInt8(i & 255, i);
  }

  return buffer;
}

export { binaryBuffer };
