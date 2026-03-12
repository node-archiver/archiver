import { it, describe, expect } from "bun:test";
import * as path from "node:path";

import glob from "@archiver/readdir-glob";

const fixtureDir = path.resolve(__dirname, "fixtures");
const pattern = "a*";
let expected = [
  "a",
  "a/.abcdef/x/y/z/a",
  "a/abcdef",
  "a/abcfed",
  "a/symlink/a",
];
if (process.platform === "win32") {
  expected = expected.filter((path) => path.indexOf("/symlink") === -1);
}

describe("match-base", () => {
  it("chdir", (done) => {
    const origCwd = process.cwd();
    process.chdir(fixtureDir);
    glob(".", { matchBase: true, pattern }, (er, res) => {
      expect(er).toBeFalsy();
      expect(res?.toSorted()).toEqual(expected.toSorted());
      process.chdir(origCwd);
      done();
    });
  });

  it("cwd", (done) => {
    glob(fixtureDir, { matchBase: true, pattern }, (er, res) => {
      expect(er).toBeFalsy();
      expect(res?.toSorted()).toEqual(expected.toSorted());
      done();
    });
  });
});
