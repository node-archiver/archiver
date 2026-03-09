import type { Stream } from "node:stream";

function collectStream(
  source: Stream,
  callback: (err: Error | null, sourceBuffer: Buffer) => void,
): void {
  const collection: Buffer[] = [];
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

export { collectStream };
