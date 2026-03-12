import { it, beforeEach, describe, expect, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

import glob from "@archiver/readdir-glob";

describe.todo("enotsup", () => {
  beforeEach(() => {
    process.chdir(__dirname + "/fixtures");
    const readdir = fs.readdir;
    spyOn(fs, "readdir").mockImplementation(function (p, opts, cb) {
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

  it(pattern, (done) => {
    glob(".", { pattern }, (er, res) => {
      expect(er).toBeFalsy();
      expect(sawAsyncENOTSUP).toBeTruthy();
      res.sort();
      expect(res).toEqual(["a/abcdef/g/h", "a/abcfed/g/h"]);
      done();
    });
  });
});
