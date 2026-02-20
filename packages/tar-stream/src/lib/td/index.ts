import { PassThroughDecoder } from "./pass-through-decoder";
import { UTF8Decoder } from "./utf8-decoder";

class TextDecoder {
  encoding: BufferEncoding;
  decoder: PassThroughDecoder | UTF8Decoder;

  constructor(encoding: BufferEncoding = "utf8") {
    this.encoding = normalizeEncoding(encoding);

    switch (this.encoding) {
      case "utf8":
        this.decoder = new UTF8Decoder();
        break;
      case "utf16le":
      case "base64":
        throw new Error("Unsupported encoding: " + this.encoding);
      default:
        this.decoder = new PassThroughDecoder(this.encoding);
    }
  }

  get remaining(): number {
    return this.decoder.remaining;
  }

  push(data): string {
    if (typeof data === "string") return data;
    return this.decoder.decode(data);
  }

  // For Node.js compatibility
  write(data): string {
    return this.push(data);
  }

  end(data): string {
    let result = "";
    if (data) result = this.push(data);
    result += this.decoder.flush();
    return result;
  }
}

function normalizeEncoding(
  encoding: BufferEncoding,
): "ascii" | "utf8" | "utf16le" | "base64" | "latin1" | "hex" {
  const encoding_ = encoding.toLowerCase();

  switch (encoding_) {
    case "utf8":
    case "utf-8":
      return "utf8";
    case "ucs2":
    case "ucs-2":
    case "utf16le":
    case "utf-16le":
      return "utf16le";
    case "latin1":
    case "binary":
      return "latin1";
    case "base64":
    case "ascii":
    case "hex":
      return encoding_;
    default:
      throw new Error("Unknown encoding: " + encoding_);
  }
}

export { TextDecoder };
