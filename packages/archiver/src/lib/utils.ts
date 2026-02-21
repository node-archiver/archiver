import { PassThrough, isReadable, isWritable, type Stream } from "node:stream";

const isStream = (source: unknown): source is Stream =>
  // @ts-expect-error
  isReadable(source) || isWritable(source);

function collectStream(
  source: Stream,
  callback: (err: Error | null, sourceBuffer: Buffer) => void,
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

function normalizeInputSource(source: Buffer | Stream | string | null) {
  if (source === null) {
    return Buffer.alloc(0);
  } else if (typeof source === "string") {
    return Buffer.from(source);
  } else if (isStream(source)) {
    // Always pipe through a PassThrough stream to guarantee pausing the stream if it's already flowing,
    // since it will only be processed in a (distant) future iteration of the event loop, and will lose
    // data if already flowing now.
    return source.pipe(new PassThrough());
  }

  return source;
}

function trailingSlashIt(str: string): string {
  return str.slice(-1) !== "/" ? str + "/" : str;
}

export { isStream, trailingSlashIt, normalizeInputSource, collectStream };
