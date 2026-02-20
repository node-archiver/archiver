import * as b4a from "../b4a";

class PassThroughDecoder {
  encoding?: BufferEncoding;

  constructor(encoding?: BufferEncoding) {
    this.encoding = encoding;
  }

  get remaining() {
    return 0;
  }

  decode(data): string {
    return b4a.toString(data, this.encoding);
  }

  flush() {
    return "";
  }
}

export { PassThroughDecoder };
