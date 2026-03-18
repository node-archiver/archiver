class PassThroughDecoder {
  encoding?: BufferEncoding;

  constructor(encoding?: "ascii" | "latin1" | "hex") {
    this.encoding = encoding;
  }

  get remaining() {
    return 0;
  }

  decode(data: string | Buffer): string {
    return data.toString(this.encoding);
  }

  flush() {
    return "";
  }
}

export { PassThroughDecoder };
