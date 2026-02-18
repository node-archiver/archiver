import { PassThrough, isReadable, isWritable, type Stream } from "node:stream";

export function collectStream(
  source: Stream,
  callback: (err: unknown, sourceBuffer: Buffer) => void,
) {
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

export function dateify(dateish) {
  dateish = dateish || new Date();

  if (dateish instanceof Date) {
    return dateish;
  }

  if (typeof dateish === "string") {
    dateish = new Date(dateish);
  } else {
    dateish = new Date();
  }

  return dateish;
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

function normalizePath(path, stripTrailing) {
  if (typeof path !== "string") {
    throw new TypeError("expected path to be a string");
  }

  if (path === "\\" || path === "/") return "/";

  const len = path.length;
  if (len <= 1) return path;

  // ensure that win32 namespaces has two leading slashes, so that the path is
  // handled properly by the win32 version of path.parse() after being normalized
  // https://msdn.microsoft.com/library/windows/desktop/aa365247(v=vs.85).aspx#namespaces
  let prefix = "";
  if (len > 4 && path[3] === "\\") {
    const ch = path[2];
    if ((ch === "?" || ch === ".") && path.slice(0, 2) === "\\\\") {
      path = path.slice(2);
      prefix = "//";
    }
  }

  const segs = path.split(/[/\\]+/);
  if (stripTrailing !== false && segs[segs.length - 1] === "") {
    segs.pop();
  }
  return prefix + segs.join("/");
}

export function sanitizePath(filepath) {
  return normalizePath(filepath, false)
    .replace(/^\w+:/, "")
    .replace(/^(\.\.\/|\/)+/, "");
}

export function trailingSlashIt(str) {
  return str.slice(-1) !== "/" ? str + "/" : str;
}
