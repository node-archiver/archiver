import { test, expect } from "bun:test";
const concat = require("concat-stream");
const fs = require("fs");
import * as tar from "../src/index.js";
const fixtures = require("./fixtures");

test("one-file", () => {
  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "test.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("hello world\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.ONE_FILE_TAR));
});

test("chunked-one-file", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "test.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("hello world\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  const b = fs.readFileSync(fixtures.ONE_FILE_TAR);

  for (let i = 0; i < b.length; i += 321) {
    extract.write(b.subarray(i, clamp(i + 321, b.length, b.length)));
  }
  extract.end();
});

test("multi-file", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.once("entry", onfile1);

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.MULTI_FILE_TAR));

  function onfile1(header, stream, cb) {
    expect(header).toEqual({
      name: "file-1.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    extract.on("entry", onfile2);
    stream.pipe(
      concat(function (data) {
        expect(data.toString()).toBe("i am file-1\n");
        cb();
      }),
    );
  }

  function onfile2(header, stream, cb) {
    expect(header).toEqual({
      name: "file-2.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("i am file-2\n");
        cb();
      }),
    );
  }
});

test("chunked-multi-file", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.once("entry", onfile1);

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  const b = fs.readFileSync(fixtures.MULTI_FILE_TAR);
  for (let i = 0; i < b.length; i += 321) {
    extract.write(b.subarray(i, clamp(i + 321, b.length, b.length)));
  }
  extract.end();

  function onfile1(header, stream, cb) {
    expect(header).toEqual({
      name: "file-1.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    extract.on("entry", onfile2);
    stream.pipe(
      concat(function (data) {
        expect(data.toString()).toBe("i am file-1\n");
        cb();
      }),
    );
  }

  function onfile2(header, stream, cb) {
    expect(header).toEqual({
      name: "file-2.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("i am file-2\n");
        cb();
      }),
    );
  }
});

test("pax", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "pax.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: { path: "pax.txt", special: "sauce" },
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("hello world\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.PAX_TAR));
});

test("types", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.once("entry", ondir);

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.TYPES_TAR));

  function ondir(header, stream, cb) {
    expect(header).toEqual({
      name: "directory",
      mode: 0o755,
      uid: 501,
      gid: 20,
      size: 0,
      mtime: new Date(1387580181000),
      type: "directory",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });
    stream.on("data", function () {
      expect.unreachable();
    });
    stream.on("end", function () {
      expect().pass("ended");
    });
    extract.once("entry", onlink);
    cb();
  }

  function onlink(header, stream, cb) {
    expect(header).toEqual({
      name: "directory-link",
      mode: 0o755,
      uid: 501,
      gid: 20,
      size: 0,
      mtime: new Date(1387580181000),
      type: "symlink",
      linkname: "directory",
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });
    stream.on("data", function () {
      expect.unreachable();
    });
    stream.on("end", function () {
      expect().pass("ended");
    });
    noEntries = true;
    cb();
  }
});

test("long-name", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "my/file/is/longer/than/100/characters/and/should/use/the/prefix/header/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/filename.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 16,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("hello long name\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.LONG_NAME_TAR));
});

test("unicode-bsd", function () {
  // can unpack a bsdtar unicoded tarball

  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "høllø.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 4,
      mtime: new Date(1387588646000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: {
        "SCHILY.dev": "16777217",
        "SCHILY.ino": "3599143",
        "SCHILY.nlink": "1",
        atime: "1387589077",
        ctime: "1387588646",
        path: "høllø.txt",
      },
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("hej\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.UNICODE_BSD_TAR));
});

test("unicode", function () {
  // can unpack a bsdtar unicoded tarball

  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "høstål.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 8,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: { path: "høstål.txt" },
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("høllø\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.UNICODE_TAR));
});

test("name-is-100", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    expect(header.name.length).toBe(100);

    stream.pipe(
      concat(function (data) {
        expect(data.toString()).toBe("hello\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect().pass();
  });

  extract.end(fs.readFileSync(fixtures.NAME_IS_100_TAR));
});

test("invalid-file", function () {
  const extract = tar.extract();

  extract.on("error", function (err) {
    expect(!!err).toBeTrue();
    extract.destroy();
  });

  extract.end(fs.readFileSync(fixtures.INVALID_TGZ));
});

test("space prefixed", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    expect().pass();
    cb();
  });

  extract.on("finish", function () {
    expect().pass();
  });

  extract.end(fs.readFileSync(fixtures.SPACE_TAR_GZ));
});

test("gnu long path", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    expect(header.name.length).toBeGreaterThan(100);
    cb();
  });

  extract.on("finish", function () {
    expect().pass();
  });

  extract.end(fs.readFileSync(fixtures.GNU_LONG_PATH));
});

test("base 256 uid and gid", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    expect(header.uid).toBe(116435139);
    expect(header.gid).toBe(1876110778);
    cb();
  });

  extract.end(fs.readFileSync(fixtures.BASE_256_UID_GID));
});

test("base 256 size", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "test.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });
    cb();
  });

  extract.on("finish", function () {
    expect().pass();
  });

  extract.end(fs.readFileSync(fixtures.BASE_256_SIZE));
});

test("latin-1", function () {
  // can unpack filenames encoded in latin-1

  // This is the older name for the "latin1" encoding in Node
  const extract = tar.extract({ filenameEncoding: "binary" });
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "En français, s'il vous plaît?.txt",
      mode: 0o644,
      uid: 0,
      gid: 0,
      size: 14,
      mtime: new Date(1495941034000),
      type: "file",
      linkname: null,
      uname: "root",
      gname: "root",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("Hello, world!\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.LATIN1_TAR));
});

test("incomplete", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    cb();
  });

  extract.on("error", function (err) {
    expect(err.message).toBe("Unexpected end of data");
  });

  extract.on("finish", function () {
    expect.unreachable("should not finish");
  });

  extract.end(fs.readFileSync(fixtures.INCOMPLETE_TAR));
});

test("gnu", function () {
  // can correctly unpack gnu-tar format

  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "test.txt",
      mode: 0o644,
      uid: 12345,
      gid: 67890,
      size: 14,
      mtime: new Date(1559239869000),
      type: "file",
      linkname: null,
      uname: "myuser",
      gname: "mygroup",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("Hello, world!\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.GNU_TAR));
});

test("gnu-incremental", function () {
  // can correctly unpack gnu-tar incremental format. In this situation,
  // the tarball will have additional ctime and atime values in the header,
  // and without awareness of the 'gnu' tar format, the atime (offset 345) is mistaken
  // for a directory prefix (also offset 345).

  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    expect(header).toEqual({
      name: "test.txt",
      mode: 0o644,
      uid: 12345,
      gid: 67890,
      size: 14,
      mtime: new Date(1559239869000),
      type: "file",
      linkname: null,
      uname: "myuser",
      gname: "mygroup",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("Hello, world!\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.GNU_INCREMENTAL_TAR));
});

test("v7 unsupported", function () {
  // correctly fails to parse v7 tarballs

  const extract = tar.extract();

  extract.on("error", function (err) {
    expect(!!err).toBeTrue();
    extract.destroy();
  });

  extract.end(fs.readFileSync(fixtures.V7_TAR));
});

test("unknown format doesn't extract by default", function () {
  const extract = tar.extract();

  extract.on("error", function (err) {
    expect(!!err).toBeTrue();
    extract.destroy();
  });

  extract.end(fs.readFileSync(fixtures.UNKNOWN_FORMAT));
});

test("unknown format attempts to extract if allowed", function () {
  const extract = tar.extract({ allowUnknownFormat: true });
  let noEntries = false;

  extract.once("entry", onfile1);

  extract.on("finish", function () {
    expect(noEntries).toBeTrue();
  });

  extract.end(fs.readFileSync(fixtures.UNKNOWN_FORMAT));

  function onfile1(header, stream, cb) {
    expect(header).toEqual({
      name: "file-1.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    extract.on("entry", onfile2);
    stream.pipe(
      concat(function (data) {
        expect(data.toString()).toBe("i am file-1\n");
        cb();
      }),
    );
  }

  function onfile2(header, stream, cb) {
    expect(header).toEqual({
      name: "file-2.txt",
      mode: 0o644,
      uid: 501,
      gid: 20,
      size: 12,
      mtime: new Date(1387580181000),
      type: "file",
      linkname: null,
      uname: "maf",
      gname: "staff",
      devmajor: 0,
      devminor: 0,
      pax: null,
    });

    stream.pipe(
      concat(function (data) {
        noEntries = true;
        expect(data.toString()).toBe("i am file-2\n");
        cb();
      }),
    );
  }
});

test("extract streams are async iterators", async function () {
  const extract = tar.extract();
  const b = fs.readFileSync(fixtures.MULTI_FILE_TAR);

  extract.end(b);

  const expected = ["file-1.txt", "file-2.txt"];

  for await (const entry of extract) {
    expect(entry.header.name).toBe(expected.shift());
    entry.resume();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
});

function clamp(index, len, defaultValue) {
  if (typeof index !== "number") return defaultValue;
  index = ~~index; // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}
