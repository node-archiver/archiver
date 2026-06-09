import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it, beforeEach, mock } from "node:test";

import glob from "@archiver/readdir-glob";

describe.skip("enotsup", () => {
  beforeEach(() => {
    process.chdir(`${__dirname}/fixtures`);
    const readdir = fs.readdir;
    mock.method(fs, "readdir", function (p, opts, cb) {
      if (
        allowedDirs.indexOf(path.resolve(p)) === -1 &&
        !p.match(/[\\/]node_modules[\\/]/)
      ) {
        setTimeout(() => {
          sawAsyncENOTSUP = true;
          const er = new Error("ENOTSUP: Operation not supported");
          er.path = path;
          er.code = "ENOTSUP";
          return cb(er);
        });
      } else {
        readdir.call(fs, p, opts, cb);
      }
    });
  });

  let sawAsyncENOTSUP = false;
  const fixtureDir = path.resolve(__dirname, "fixtures");
  const allowedDirs = [
    path.resolve(fixtureDir),
    path.resolve(fixtureDir, "a"),
    path.resolve(fixtureDir, "a", "abcdef"),
    path.resolve(fixtureDir, "a", "abcfed"),
    path.resolve(fixtureDir, "a", "abcdef", "g"),
    path.resolve(fixtureDir, "a", "abcfed", "g"),
  ];
  const pattern = "a/**/h";

  it(pattern, async () => {
    await new Promise<void>((resolve) => {
      glob(".", { pattern }, (er, res) => {
        assert.ok(!er);
        assert.ok(sawAsyncENOTSUP);
        res.sort();
        assert.deepStrictEqual(res, ["a/abcdef/g/h", "a/abcfed/g/h"]);
        resolve();
      });
    });
  });
});
