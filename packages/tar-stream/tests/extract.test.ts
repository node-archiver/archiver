import assert from "node:assert/strict";
import * as fs from "node:fs";
import { test } from "node:test";

import concat from "es-concat-stream";

import * as tar from "../src/index.js";
import * as fixtures from "./fixtures";

test("one-file", () => {
  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "hello world\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.ONE_FILE_TAR));
});

test("chunked-one-file", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "hello world\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  const b = fs.readFileSync(fixtures.ONE_FILE_TAR);

  for (let i = 0; i < b.length; i += 321) {
    extract.write(b.subarray(i, clamp(i + 321, b.length)));
  }
  extract.end();
});

test("multi-file", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.once("entry", onfile1);

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.MULTI_FILE_TAR));

  function onfile1(header: unknown, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "i am file-1\n");
        cb();
      }),
    );
  }

  function onfile2(header: unknown, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "i am file-2\n");
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
    assert.ok(noEntries);
  });

  const b = fs.readFileSync(fixtures.MULTI_FILE_TAR);
  for (let i = 0; i < b.length; i += 321) {
    extract.write(b.subarray(i, clamp(i + 321, b.length)));
  }
  extract.end();

  function onfile1(header: unknown, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "i am file-1\n");
        cb();
      }),
    );
  }

  function onfile2(header: unknown, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "i am file-2\n");
        cb();
      }),
    );
  }
});

test("pax", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "hello world\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.PAX_TAR));
});

test("types", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.once("entry", ondir);

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.TYPES_TAR));

  function ondir(header: unknown, stream, cb) {
    assert.deepStrictEqual(header, {
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
      assert.fail();
    });
    stream.on("end", function () {
      assert.ok(true);
    });
    extract.once("entry", onlink);
    cb();
  }

  function onlink(header: unknown, stream, cb) {
    assert.deepStrictEqual(header, {
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
      assert.fail();
    });
    stream.on("end", function () {
      assert.ok(true);
    });
    noEntries = true;
    cb();
  }
});

test("long-name", function () {
  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "hello long name\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.LONG_NAME_TAR));
});

test("unicode-bsd", function () {
  // can unpack a bsdtar unicoded tarball

  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "hej\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.UNICODE_BSD_TAR));
});

test("unicode", function () {
  // can unpack a bsdtar unicoded tarball

  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "høllø\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.UNICODE_TAR));
});

test("name-is-100", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    assert.strictEqual(header.name.length, 100);

    stream.pipe(
      concat(function (data) {
        assert.strictEqual(data.toString(), "hello\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(true);
  });

  extract.end(fs.readFileSync(fixtures.NAME_IS_100_TAR));
});

test("invalid-file", function () {
  const extract = tar.extract();

  extract.on("error", function (err) {
    assert.ok(err);
    extract.destroy();
  });

  extract.end(fs.readFileSync(fixtures.INVALID_TGZ));
});

test("space prefixed", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    assert.ok(true);
    cb();
  });

  extract.on("finish", function () {
    assert.ok(true);
  });

  extract.end(fs.readFileSync(fixtures.SPACE_TAR_GZ));
});

test("gnu long path", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    assert.ok(header.name.length > 100);
    cb();
  });

  extract.on("finish", function () {
    assert.ok(true);
  });

  extract.end(fs.readFileSync(fixtures.GNU_LONG_PATH));
});

test("base 256 uid and gid", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    assert.strictEqual(header.uid, 116435139);
    assert.strictEqual(header.gid, 1876110778);
    cb();
  });

  extract.end(fs.readFileSync(fixtures.BASE_256_UID_GID));
});

test("base 256 size", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    assert.deepStrictEqual(header, {
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
    assert.ok(true);
  });

  extract.end(fs.readFileSync(fixtures.BASE_256_SIZE));
});

test("latin-1", function () {
  // can unpack filenames encoded in latin-1

  // This is the older name for the "latin1" encoding in Node
  const extract = tar.extract({ filenameEncoding: "binary" });
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "Hello, world!\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.LATIN1_TAR));
});

test("incomplete", function () {
  const extract = tar.extract();

  extract.on("entry", function (header, stream, cb) {
    cb();
  });

  extract.on("error", function (err) {
    assert.strictEqual(err.message, "Unexpected end of data");
  });

  extract.on("finish", function () {
    assert.fail("should not finish");
  });

  extract.end(fs.readFileSync(fixtures.INCOMPLETE_TAR));
});

test("gnu", function () {
  // can correctly unpack gnu-tar format

  const extract = tar.extract();
  let noEntries = false;

  extract.on("entry", function (header, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "Hello, world!\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(noEntries);
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
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "Hello, world!\n");
        cb();
      }),
    );
  });

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.GNU_INCREMENTAL_TAR));
});

test("v7 unsupported", function () {
  // correctly fails to parse v7 tarballs

  const extract = tar.extract();

  extract.on("error", function (err) {
    assert.ok(err);
    extract.destroy();
  });

  extract.end(fs.readFileSync(fixtures.V7_TAR));
});

test("unknown format doesn't extract by default", function () {
  const extract = tar.extract();

  extract.on("error", function (err) {
    assert.ok(err);
    extract.destroy();
  });

  extract.end(fs.readFileSync(fixtures.UNKNOWN_FORMAT));
});

test("unknown format attempts to extract if allowed", function () {
  const extract = tar.extract({ allowUnknownFormat: true });
  let noEntries = false;

  extract.once("entry", onfile1);

  extract.on("finish", function () {
    assert.ok(noEntries);
  });

  extract.end(fs.readFileSync(fixtures.UNKNOWN_FORMAT));

  function onfile1(header: unknown, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "i am file-1\n");
        cb();
      }),
    );
  }

  function onfile2(header: unknown, stream, cb) {
    assert.deepStrictEqual(header, {
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
        assert.strictEqual(data.toString(), "i am file-2\n");
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
    assert.strictEqual(entry.header.name, expected.shift());
    entry.resume();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
});

test("async iterator - early break calls destroy", async function () {
  const extract = tar.extract();
  const b = fs.readFileSync(fixtures.MULTI_FILE_TAR);

  let closed = false;
  extract.on("close", () => {
    closed = true;
  });

  // Feed the data
  extract.end(b);

  // Iterate but break after the first entry
  // This triggers the iterator's .return() -> internal destroy()
  for await (const entry of extract) {
    assert.strictEqual(entry.header.name, "file-1.txt");
    entry.resume();
    break;
  }

  assert.ok(extract.destroyed);
  assert.ok(closed);
});

test("async iterator - explicit throw calls destroy", async function () {
  const extract = tar.extract();
  const b = fs.readFileSync(fixtures.MULTI_FILE_TAR);
  const error = new Error("Manual abort");

  extract.end(b);

  try {
    for await (const entry of extract) {
      entry.resume();
      throw error; // This triggers the iterator's .throw() or .return()
    }
  } catch (err) {
    assert.strictEqual(err, error);
  }

  assert.ok(extract.destroyed);
});

function clamp(index: number, len: number) {
  index = ~~index; // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}
