import * as b4a from "../b4a";

class PassThroughDecoder {
  constructor(encoding) {
    this.encoding = encoding;
  }

  get remaining() {
    return 0;
  }

  decode(data) {
    return b4a.toString(data, this.encoding);
  }

  flush() {
    return "";
  }
}

export { PassThroughDecoder };
