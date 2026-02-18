import { PassThrough, isReadable, isWritable } from "node:stream";

export function normalizeInputSource(source) {
  if (source === null) {
    return Buffer.alloc(0);
  } else if (typeof source === "string") {
    return Buffer.from(source);
  } else if (
    (isReadable(source) || isWritable(source)) &&
    !source._readableState
  ) {
    var normalized = new PassThrough();
    source.pipe(normalized);
    return normalized;
  }
  return source;
}
