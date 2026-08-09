import assert from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it, beforeEach, mock } from "node:test";

import glob from "@archiver/readdir-glob";

describe.skip("eperm-stat", () => {
  beforeEach(() => {
    process.chdir(import.meta.dirname);
    const badPaths = /\ba[\\/]?$|\babcdef\b/;
    const lstat = fs.lstat;
    mock.method(fs, "lstat", function (path, cb) {
      // synthetically generate a non-ENOENT error
      if (badPaths.test(path)) {
        const er = new Error("synthetic");
        er.code = "EPERM";
        return process.nextTick(cb.bind(null, er));
      }
      return lstat.call(fs, path, cb);
    });
  });

  it("stat errors other than ENOENT are ok async", async () => {
    await new Promise<void>((resolve) => {
      const expectedFiles = [
        "a/abcdef",
        "a/abcdef/g",
        "a/abcdef/g/h",
        "a/abcfed",
        "a/abcfed/g",
        "a/abcfed/g/h",
      ];
      glob("fixtures", { stat: true, pattern: "a/*abc*/**" }, (er, matches) => {
        assert.ok(!er);
        assert.deepStrictEqual(matches, expectedFiles);
        resolve();
      });
    });
  });

  it("globstar with error in root async", async () => {
    await new Promise<void>((resolve) => {
      let expectedFiles = [
        "a",
        "a/abcdef",
        "a/abcdef/g",
        "a/abcdef/g/h",
        "a/abcfed",
        "a/abcfed/g",
        "a/abcfed/g/h",
        "a/b",
        "a/b/c",
        "a/b/c/d",
        "a/bc",
        "a/bc/e",
        "a/bc/e/f",
        "a/c",
        "a/c/d",
        "a/c/d/c",
        "a/c/d/c/b",
        "a/cb",
        "a/cb/e",
        "a/cb/e/f",
        "a/symlink",
        "a/symlink/a",
        "a/symlink/a/b",
        "a/symlink/a/b/c",
        "a/x",
        "a/z",
      ];
      if (process.platform === "win32") {
        expectedFiles = expectedFiles.filter(
          (path) => path.indexOf("/symlink") === -1,
        );
      }

      const pattern = "a/**";
      glob("fixtures", { pattern }, (er, matches) => {
        assert.ok(!er);
        assert.deepStrictEqual(matches, expectedFiles);
        resolve();
      });
    });
  });
});
