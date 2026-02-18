import crypto from "crypto";
import { readFileSync, WriteStream } from "fs";
import { inherits } from "util";
import { Stream } from "stream";

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

function UnBufferedStream() {
  this.readable = true;
}
inherits(UnBufferedStream, Stream);
function WriteHashStream(path, options) {
  WriteStream.call(this, path, options);
  this.hash = crypto.createHash("sha1");
  this.digest = null;
  this.on("close", function () {
    this.digest = this.hash.digest("hex");
  });
}
inherits(WriteHashStream, WriteStream);
WriteHashStream.prototype.write = function (chunk) {
  if (chunk) {
    this.hash.update(chunk);
  }
  return WriteStream.prototype.write.call(this, chunk);
};

export { UnBufferedStream, WriteHashStream };
