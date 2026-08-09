import assert from "node:assert/strict";
import * as fs from "node:fs";
import { test } from "node:test";

import * as tar from "@archiver/tar-stream";
import concat from "es-concat-stream";

import { Writable } from "../src/lib/streamx.ts";
import * as fixtures from "./fixtures/index.ts";

test("one-file", function () {
  const pack = tar.pack();

  pack.entry(
    {
      name: "test.txt",
      mtime: new Date(1387580181000),
      mode: 0o644,
      uname: "maf",
      gname: "staff",
      uid: 501,
      gid: 20,
    },
    "hello world\n",
  );

  pack.finalize();

  pack.pipe(
    concat(function (data) {
      assert.strictEqual(data.length & 511, 0);
      assert.deepStrictEqual(data, fs.readFileSync(fixtures.ONE_FILE_TAR));
    }),
  );
});

test("multi-file", function () {
  const pack = tar.pack();

  pack.entry(
    {
      name: "file-1.txt",
      mtime: new Date(1387580181000),
      mode: 0o644,
      uname: "maf",
      gname: "staff",
      uid: 501,
      gid: 20,
    },
    "i am file-1\n",
  );

  pack
    .entry({
      name: "file-2.txt",
      mtime: new Date(1387580181000),
      mode: 0o644,
      size: 12,
      uname: "maf",
      gname: "staff",
      uid: 501,
      gid: 20,
    })
    .end("i am file-2\n");

  pack.finalize();

  pack.pipe(
    concat(function (data) {
      assert.strictEqual(data.length & 511, 0);
      assert.deepStrictEqual(data, fs.readFileSync(fixtures.MULTI_FILE_TAR));
    }),
  );
});

test("pax", function () {
  const pack = tar.pack();

  pack.entry(
    {
      name: "pax.txt",
      mtime: new Date(1387580181000),
      mode: 0o644,
      uname: "maf",
      gname: "staff",
      uid: 501,
      gid: 20,
      pax: { special: "sauce" },
    },
    "hello world\n",
  );

  pack.finalize();

  pack.pipe(
    concat(function (data) {
      assert.strictEqual(data.length & 511, 0);
      assert.deepStrictEqual(data, fs.readFileSync(fixtures.PAX_TAR));
    }),
  );
});

test("types", function () {
  const pack = tar.pack();

  pack.entry({
    name: "directory",
    mtime: new Date(1387580181000),
    type: "directory",
    mode: 0o755,
    uname: "maf",
    gname: "staff",
    uid: 501,
    gid: 20,
  });

  pack.entry({
    name: "directory-link",
    mtime: new Date(1387580181000),
    type: "symlink",
    linkname: "directory",
    mode: 0o755,
    uname: "maf",
    gname: "staff",
    uid: 501,
    gid: 20,
    size: 9, // Should convert to zero
  });

  pack.finalize();

  pack.pipe(
    concat(function (data) {
      assert.strictEqual(data.length & 511, 0);
      assert.deepStrictEqual(data, fs.readFileSync(fixtures.TYPES_TAR));
    }),
  );
});

test("empty directory body is valid", () => {
  return new Promise<void>((resolve) => {
    const pack = tar.pack();

    pack.entry(
      {
        name: "directory",
        mtime: new Date(1387580181000),
        type: "directory",
        mode: 0o755,
        uname: "maf",
        gname: "staff",
        uid: 501,
        gid: 20,
      },
      "",
    );

    pack.finalize();

    pack.resume();

    pack.on("error", () => assert.fail("should not throw"));
    pack.on("close", () => {
      assert.ok(true);
      resolve();
    });
  });
});

test("long-name", function () {
  const pack = tar.pack();

  pack.entry(
    {
      name: "my/file/is/longer/than/100/characters/and/should/use/the/prefix/header/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/filename.txt",
      mtime: new Date(1387580181000),
      type: "file",
      mode: 0o644,
      uname: "maf",
      gname: "staff",
      uid: 501,
      gid: 20,
    },
    "hello long name\n",
  );

  pack.finalize();

  pack.pipe(
    concat(function (data) {
      assert.strictEqual(data.length & 511, 0);
      assert.deepStrictEqual(data, fs.readFileSync(fixtures.LONG_NAME_TAR));
    }),
  );
});

test("large-uid-gid", function () {
  const pack = tar.pack();

  pack.entry(
    {
      name: "test.txt",
      mtime: new Date(1387580181000),
      mode: 0o644,
      uname: "maf",
      gname: "staff",
      uid: 1000000001,
      gid: 1000000002,
    },
    "hello world\n",
  );

  pack.finalize();

  pack.pipe(
    concat(function (data) {
      assert.strictEqual(data.length & 511, 0);
      assert.deepStrictEqual(data, fs.readFileSync(fixtures.LARGE_UID_GID));
    }),
  );
});

test("unicode", function () {
  const pack = tar.pack();

  pack.entry(
    {
      name: "høstål.txt",
      mtime: new Date(1387580181000),
      type: "file",
      mode: 0o644,
      uname: "maf",
      gname: "staff",
      uid: 501,
      gid: 20,
    },
    "høllø\n",
  );

  pack.finalize();

  pack.pipe(
    concat(function (data) {
      assert.strictEqual(data.length & 511, 0);
      assert.deepStrictEqual(data, fs.readFileSync(fixtures.UNICODE_TAR));
    }),
  );
});

test("backpressure", () => {
  return new Promise<void>((resolve) => {
    const slowStream = new Writable({
      highWaterMark: 1,

      write(data, cb) {
        setImmediate(cb);
      },
    });

    slowStream.on("finish", () => {
      assert.ok(true);
      resolve();
    });

    const pack = tar.pack();

    let later = false;

    setImmediate(() => {
      later = true;
    });

    pack.on("end", () => assert.ok(later)).pipe(slowStream);

    let i = 0;
    const next = () => {
      if (++i < 25) {
        const header = {
          name: `file${i}.txt`,
          mtime: new Date(1387580181000),
          mode: 0o644,
          uname: "maf",
          gname: "staff",
          uid: 501,
          gid: 20,
        };

        const buffer = Buffer.alloc(1024);

        pack.entry(header, buffer, next);
      } else {
        pack.finalize();
      }
    };

    next();
  });
});
