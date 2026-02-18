export function dateToDos(d, forceLocalTime) {
  forceLocalTime = forceLocalTime || false;
  const year = forceLocalTime ? d.getFullYear() : d.getUTCFullYear();
  if (year < 1980) {
    return 2162688; // 1980-1-1 00:00:00
  } else if (year >= 2044) {
    return 2141175677; // 2043-12-31 23:59:58
  }
  const val = {
    year: year,
    month: forceLocalTime ? d.getMonth() : d.getUTCMonth(),
    date: forceLocalTime ? d.getDate() : d.getUTCDate(),
    hours: forceLocalTime ? d.getHours() : d.getUTCHours(),
    minutes: forceLocalTime ? d.getMinutes() : d.getUTCMinutes(),
    seconds: forceLocalTime ? d.getSeconds() : d.getUTCSeconds(),
  };
  return (
    ((val.year - 1980) << 25) |
    ((val.month + 1) << 21) |
    (val.date << 16) |
    (val.hours << 11) |
    (val.minutes << 5) |
    (val.seconds / 2)
  );
}
export function dosToDate(dos) {
  return new Date(
    ((dos >> 25) & 0x7f) + 1980,
    ((dos >> 21) & 0x0f) - 1,
    (dos >> 16) & 0x1f,
    (dos >> 11) & 0x1f,
    (dos >> 5) & 0x3f,
    (dos & 0x1f) << 1,
  );
}
export function fromDosTime(buf) {
  return dosToDate(buf.readUInt32LE(0));
}
export function getEightBytes(v) {
  const buf = Buffer.alloc(8);
  buf.writeUInt32LE(v % 0x0100000000, 0);
  buf.writeUInt32LE((v / 0x0100000000) | 0, 4);
  return buf;
}
export function getShortBytes(v) {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE((v & 0xffff) >>> 0, 0);
  return buf;
}
export function getShortBytesValue(buf, offset) {
  return buf.readUInt16LE(offset);
}
export function getLongBytes(v) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE((v & 0xffffffff) >>> 0, 0);
  return buf;
}
export function getLongBytesValue(buf, offset) {
  return buf.readUInt32LE(offset);
}
export function toDosTime(d) {
  return getLongBytes(util.dateToDos(d));
}
export function normalizePath(path, stripTrailing) {
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
