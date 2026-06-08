import assert from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it, beforeEach, afterEach, mock } from "node:test";

import glob from "@archiver/readdir-glob";

const cwd = process.cwd().toLowerCase().replace(/\\/g, "/");

function fakeStat(path) {
  let ret;
  switch (path.toLowerCase().replace(/\\/g, "/")) {
    case cwd + "/tmp":
    case cwd + "/tmp/":
      ret = { isDirectory: () => true, isSymbolicLink: () => false };
      break;
    case cwd + "/tmp/a":
      ret = { isDirectory: () => false, isSymbolicLink: () => false };
      break;
  }
  return ret;
}

function fakeReaddir(path, opts) {
  let ret;
  switch (path.toLowerCase().replace(/\\/g, "/")) {
    case cwd + "/tmp":
    case cwd + "/tmp/":
      ret = ["a", "A"].map((name) =>
        opts.withFileTypes ? { name, isDirectory: () => false } : name,
      );
      break;
    case cwd:
    case cwd + "/":
      ret = ["tmp", "tMp", "tMP", "TMP"].map((name) =>
        opts.withFileTypes ? { name, isDirectory: () => true } : name,
      );
  }
  return ret;
}

describe.skip("nocase-nomagic", () => {
  let statSpy, lstatSpy, readdirSpy;

  beforeEach(() => {
    const originalStat = fs.stat;
    const originalLstat = fs.lstat;
    const originalRead = fs.readdir;

    statSpy = mock.method(fs, "stat", (path, cb) => {
      const f = fakeStat(path);
      if (f) {
        process.nextTick(() => cb(null, f));
      } else {
        originalStat.call(fs, path, cb);
      }
    });

    lstatSpy = mock.method(fs, "lstat", (path, cb) => {
      const f = fakeStat(path);
      if (f) {
        process.nextTick(() => cb(null, f));
      } else {
        originalLstat.call(fs, path, cb);
      }
    });

    readdirSpy = mock.method(fs, "readdir", (path, opts, cb) => {
      const f = fakeReaddir(path, opts);
      if (f) {
        process.nextTick(() => cb(null, f));
      } else {
        originalRead.call(fs, path, opts, cb);
      }
    });
  });

  afterEach(() => {
    statSpy.mock.restore();
    lstatSpy.mock.restore();
    readdirSpy.mock.restore();
  });

  it("nocase, nomagic", async () => {
    await new Promise<void>((resolve) => {
      let n = 2;
      const want = [
        "TMP/A",
        "TMP/a",
        "tMP/A",
        "tMP/a",
        "tMp/A",
        "tMp/a",
        "tmp/A",
        "tmp/a",
      ];
      glob(".", { nocase: true, pattern: "tmp/a" }, (er, res) => {
        assert.ok(!er);
        res.sort();
        assert.deepStrictEqual(res, want);
        if (--n === 0) {
          resolve();
        }
      });
      glob(".", { nocase: true, pattern: "tmp/A" }, (er, res) => {
        assert.ok(!er);
        res.sort();
        assert.deepStrictEqual(res, want);
        if (--n === 0) {
          resolve();
        }
      });
    });
  });

  it("nocase, with some magic", async () => {
    await new Promise<void>((resolve) => {
      const want = [
        "TMP/A",
        "TMP/a",
        "tMP/A",
        "tMP/a",
        "tMp/A",
        "tMp/a",
        "tmp/A",
        "tmp/a",
      ];

      glob(".", { nocase: true, pattern: "tmp/*" }, (er, res) => {
        assert.ok(!er);
        res.sort();
        assert.deepStrictEqual(res, want);
        resolve();
      });
    });
  });
});
