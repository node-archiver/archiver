import * as fs from "node:fs";
import * as path from "node:path";

import * as tarStream from "@archiver/tar-stream";
import pump from "pump";

const win32 =
  (global.Bare ? global.Bare.platform : process.platform) === "win32";

export function pack(cwd: string, opts?: PackOptions): tarStream.TarPack {
  if (!cwd) cwd = ".";
  if (!opts) opts = {};

  const ignore = opts.ignore || opts.filter || noop;
  const mapStream = opts.mapStream || echo;
  const statNext = statAll(
    fs,
    opts.dereference ? fs.stat : fs.lstat,
    cwd,
    ignore,
    opts.entries,
    opts.sort,
  );
  const strict = opts.strict !== false;
  const umask = typeof opts.umask === "number" ? ~opts.umask : ~processUmask();
  const pack = opts.pack || tarStream.pack();
  const finish = opts.finish || noop;

  let map = opts.map || noop;
  let dmode = typeof opts.dmode === "number" ? opts.dmode : 0;
  let fmode = typeof opts.fmode === "number" ? opts.fmode : 0;

  if (opts.strip) map = strip(map, opts.strip);

  if (opts.readable) {
    dmode |= 0o555;
    fmode |= 0o444;
  }
  if (opts.writable) {
    dmode |= 0o333;
    fmode |= 0o222;
  }

  onnextentry();

  function onsymlink(filename, header) {
    fs.readlink(path.join(cwd, filename), function (err, linkname) {
      if (err) return pack.destroy(err);
      header.linkname = normalize(linkname);
      pack.entry(header, onnextentry);
    });
  }

  function onstat(err, filename, stat) {
    if (pack.destroyed) return;
    if (err) return pack.destroy(err);
    if (!filename) {
      if (opts.finalize !== false) pack.finalize();
      return finish(pack);
    }

    if (stat.isSocket()) return onnextentry(); // tarStream does not support sockets...

    let header = {
      name: normalize(filename),
      mode: (stat.mode | (stat.isDirectory() ? dmode : fmode)) & umask,
      mtime: stat.mtime,
      size: stat.size,
      type: "file",
      uid: stat.uid,
      gid: stat.gid,
    };

    if (stat.isDirectory()) {
      header.size = 0;
      header.type = "directory";
      header = map(header) || header;
      return pack.entry(header, onnextentry);
    }

    if (stat.isSymbolicLink()) {
      header.size = 0;
      header.type = "symlink";
      header = map(header) || header;
      return onsymlink(filename, header);
    }

    // TODO: add fifo etc...

    header = map(header) || header;

    if (!stat.isFile()) {
      if (strict)
        return pack.destroy(new Error("unsupported type for " + filename));
      return onnextentry();
    }

    const entry = pack.entry(header, onnextentry);
    const rs = mapStream(
      fs.createReadStream(path.join(cwd, filename), {
        start: 0,
        end: header.size > 0 ? header.size - 1 : header.size,
      }),
      header,
    );

    rs.on("error", function (err) {
      // always forward errors on destroy
      entry.destroy(err);
    });

    pump(rs, entry);
  }

  function onnextentry(err?) {
    if (err) return pack.destroy(err);
    statNext(onstat);
  }

  return pack;
}

function head(list) {
  return list.length ? list[list.length - 1] : null;
}

function processGetuid() {
  return !global.Bare && process.getuid ? process.getuid() : -1;
}

function processUmask() {
  return !global.Bare && process.umask ? process.umask() : 0;
}

export function extract(
  cwd: string,
  opts?: ExtractOptions,
): tarStream.TarExtract {
  if (!cwd) cwd = ".";
  if (!opts) opts = {};

  cwd = path.resolve(cwd);

  const ignore = opts.ignore || opts.filter || noop;
  const mapStream = opts.mapStream || echo;
  const own = opts.chown !== false && !win32 && processGetuid() === 0;
  const extract = opts.extract || tarStream.extract();
  const stack = [];
  const now = new Date();
  const umask = typeof opts.umask === "number" ? ~opts.umask : ~processUmask();
  const strict = opts.strict !== false;
  const validateSymLinks = opts.validateSymlinks !== false;

  let map = opts.map || noop;
  let dmode = typeof opts.dmode === "number" ? opts.dmode : 0;
  let fmode = typeof opts.fmode === "number" ? opts.fmode : 0;

  if (opts.strip) map = strip(map, opts.strip);

  if (opts.readable) {
    dmode |= 0o555;
    fmode |= 0o444;
  }
  if (opts.writable) {
    dmode |= 0o333;
    fmode |= 0o222;
  }

  extract.on("entry", onentry);

  if (opts.finish) extract.on("finish", opts.finish);

  return extract;

  function onentry(header, stream, next) {
    header = map(header) || header;
    header.name = normalize(header.name);

    const name = path.join(cwd, path.join("/", header.name));

    if (ignore(name, header)) {
      stream.resume();
      return next();
    }

    const dir =
      path.join(name, ".") === path.join(cwd, ".") ? cwd : path.dirname(name);

    validate(fs, dir, path.join(cwd, "."), function (err, valid) {
      if (err) return next(err);
      if (!valid) return next(new Error(dir + " is not a valid path"));

      if (header.type === "directory") {
        stack.push([name, header.mtime]);
        return mkdirfix(
          name,
          {
            fs: fs,
            own,
            uid: header.uid,
            gid: header.gid,
            mode: header.mode,
          },
          stat,
        );
      }

      mkdirfix(
        dir,
        {
          fs: fs,
          own,
          uid: header.uid,
          gid: header.gid,
          // normally, the folders with rights and owner should be part of the TAR file
          // if this is not the case, create folder for same user as file and with
          // standard permissions of 0o755 (rwxr-xr-x)
          mode: 0o755,
        },
        function (err) {
          if (err) return next(err);

          switch (header.type) {
            case "file":
              return onfile();
            case "link":
              return onlink();
            case "symlink":
              return onsymlink();
          }

          if (strict)
            return next(
              new Error(
                "unsupported type for " + name + " (" + header.type + ")",
              ),
            );

          stream.resume();
          next();
        },
      );
    });

    function stat(err) {
      if (err) return next(err);
      utimes(name, header, function (err) {
        if (err) return next(err);
        if (win32) return next();
        chperm(name, header, next);
      });
    }

    function onsymlink() {
      if (win32) return next(); // skip symlinks on win for now before it can be tested
      fs.unlink(name, function () {
        const dst = path.resolve(path.dirname(name), header.linkname);
        if (!inCwd(dst) && validateSymLinks)
          return next(new Error(name + " is not a valid symlink"));

        validateNotSymlink(fs, dst, path.join(cwd, "."), function (err, valid) {
          if (err) return next(err);
          if (!valid && validateSymLinks)
            return next(new Error(name + " is not a valid symlink"));
          fs.symlink(header.linkname, name, stat);
        });
      });
    }

    function onlink() {
      if (win32) return next(); // skip links on win for now before it can be tested
      fs.unlink(name, function () {
        const link = path.join(cwd, path.join("/", header.linkname));

        fs.realpath(link, function (err, dst) {
          if (err || !inCwd(dst))
            return next(new Error(name + " is not a valid hardlink"));

          fs.link(dst, name, function (err) {
            if (err && err.code === "EPERM" && opts.hardlinkAsFilesFallback) {
              stream = fs.createReadStream(dst);
              return onfile();
            }

            stat(err);
          });
        });
      });
    }

    function inCwd(dst) {
      return dst === cwd || dst.startsWith(cwd + path.sep);
    }

    function onfile() {
      const ws = fs.createWriteStream(name);
      const rs = mapStream(stream, header);

      ws.on("error", function (err) {
        // always forward errors on destroy
        rs.destroy(err);
      });

      pump(rs, ws, function (err) {
        if (err) return next(err);
        ws.on("close", stat);
      });
    }
  }

  function utimesParent(name, cb) {
    // we just set the mtime on the parent dir again everytime we write an entry
    let top;
    while ((top = head(stack)) && name.slice(0, top[0].length) !== top[0])
      stack.pop();
    if (!top) return cb();
    fs.utimes(top[0], now, top[1], cb);
  }

  function utimes(name, header, cb) {
    if (opts.utimes === false) return cb();

    if (header.type === "directory")
      return fs.utimes(name, now, header.mtime, cb);
    if (header.type === "symlink") return utimesParent(name, cb); // TODO: how to set mtime on link?

    fs.utimes(name, now, header.mtime, function (err) {
      if (err) return cb(err);
      utimesParent(name, cb);
    });
  }

  function chperm(name, header, cb) {
    const link = header.type === "symlink";

    /* eslint-disable n/no-deprecated-api */
    const chmod = link ? fs.lchmod : fs.chmod;
    const chown = link ? fs.lchown : fs.chown;
    /* eslint-enable n/no-deprecated-api */

    if (!chmod) return cb();

    const mode =
      (header.mode | (header.type === "directory" ? dmode : fmode)) & umask;

    if (chown && own) chown.call(fs, name, header.uid, header.gid, onchown);
    else onchown(null);

    function onchown(err) {
      if (err) return cb(err);
      if (!chmod) return cb();
      chmod.call(fs, name, mode, cb);
    }
  }

  function mkdirfix(name, opts, cb) {
    // when mkdir is called on an existing directory, the permissions
    // will be overwritten (?), to avoid this we check for its existance first
    fs.stat(name, function (err) {
      if (!err) return cb(null);
      if (err.code !== "ENOENT") return cb(err);
      fs.mkdir(name, { mode: opts.mode, recursive: true }, function (err) {
        if (err) return cb(err);
        chperm(name, opts, cb);
      });
    });
  }
}

function validateNotSymlink(fs, name, root, cb) {
  if (name === root) return cb(null, true);
  if (!name.startsWith(root + path.sep)) return cb(null, false);

  fs.lstat(name, function (err, st) {
    if (err && err.code !== "ENOENT" && err.code !== "EPERM") return cb(err);
    if (err || !st.isSymbolicLink())
      return validateNotSymlink(fs, path.join(name, ".."), root, cb);
    cb(null, false);
  });
}

function validate(fs, name, root, cb) {
  if (name === root) return cb(null, true);

  fs.lstat(name, function (err, st) {
    if (err && err.code !== "ENOENT" && err.code !== "EPERM") return cb(err);
    if (err || st.isDirectory())
      return validate(fs, path.join(name, ".."), root, cb);
    cb(null, false);
  });
}

function noop() {}

function echo(name) {
  return name;
}

function normalize(name) {
  return win32 ? name.replace(/\\/g, "/").replace(/[:?<>|]/g, "_") : name;
}

function statAll(fs, stat, cwd, ignore, entries, sort) {
  if (!entries) entries = ["."];
  const queue = entries.slice(0);

  return function loop(callback) {
    if (!queue.length) return callback(null);

    const next = queue.shift();
    const nextAbs = path.join(cwd, next);

    stat.call(fs, nextAbs, function (err, stat) {
      // ignore errors if the files were deleted while buffering
      if (err)
        return callback(
          entries.indexOf(next) === -1 && err.code === "ENOENT" ? null : err,
        );

      if (!stat.isDirectory()) return callback(null, next, stat);

      fs.readdir(nextAbs, function (err, files) {
        if (err) return callback(err);

        if (sort) files.sort();

        for (let i = 0; i < files.length; i++) {
          if (!ignore(path.join(cwd, next, files[i])))
            queue.push(path.join(next, files[i]));
        }

        callback(null, next, stat);
      });
    });
  };
}

function strip(map, level) {
  return function (header) {
    header.name = header.name.split("/").slice(level).join("/");

    const linkname = header.linkname;
    if (linkname && (header.type === "link" || path.isAbsolute(linkname))) {
      header.linkname = linkname.split("/").slice(level).join("/");
    }

    return map(header);
  };
}

export interface Options {
  ignore?: (name: string) => boolean;
  filter?: (name: string) => boolean;
  map?: (header: Headers) => Headers | void;
  mapStream?: (fileStream: fs.ReadStream, header: Headers) => fs.ReadStream;
  finish?: (pack: tarStream.TarPack) => void;
  dmode?: number;
  fmode?: number;
  readable?: boolean;
  writable?: boolean;
  strict?: boolean;
}

export interface PackOptions extends Options {
  entries?: string[];
  dereference?: boolean;
  finalize?: boolean;
  pack?: tarStream.TarPack;
}

export interface ExtractOptions extends Options {
  ignore?: (name: string, header?: Headers) => boolean;
  filter?: (name: string, header?: Headers) => boolean;
  strip?: number;
  hardlinkAsFilesFallback?: boolean;
}

export interface Headers {
  name: string;
  mode: number;
  mtime: Date;
  size: number;
  type: "file" | "directory" | "link" | "symlink";
  uid: number;
  gid: number;
}
