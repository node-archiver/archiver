import { PassThrough, isReadable, isWritable, type Stream } from "node:stream";

export function collectStream(
  source: Stream,
  callback: (err: unknown, sourceBuffer: Buffer) => void,
): void {
  const collection: unknown[] = [];
  let size = 0;

  source.on("error", callback);

  source.on("data", function (chunk) {
    collection.push(chunk);
    size += chunk.length;
  });

  source.on("end", function () {
    const buf = Buffer.alloc(size);
    let offset = 0;

    collection.forEach(function (data) {
      data.copy(buf, offset);
      offset += data.length;
    });

    callback(null, buf);
  });
}

export function normalizeInputSource(source) {
  if (source === null) {
    return Buffer.alloc(0);
  } else if (typeof source === "string") {
    return Buffer.from(source);
  } else if (isReadable(source) || isWritable(source)) {
    // Always pipe through a PassThrough stream to guarantee pausing the stream if it's already flowing,
    // since it will only be processed in a (distant) future iteration of the event loop, and will lose
    // data if already flowing now.
    return source.pipe(new PassThrough());
  }

  return source;
}

export function trailingSlashIt(str: string): string {
  return str.slice(-1) !== "/" ? str + "/" : str;
}
