import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";

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
  it("chdir", async () => {
    await new Promise<void>((resolve) => {
      const origCwd = process.cwd();
      process.chdir(fixtureDir);
      glob(".", { matchBase: true, pattern }, (er, res) => {
        assert.ok(!er);
        assert.deepStrictEqual(res?.toSorted(), expected.toSorted());
        process.chdir(origCwd);
        resolve();
      });
    });
  });

  it("cwd", async () => {
    await new Promise<void>((resolve) => {
      glob(fixtureDir, { matchBase: true, pattern }, (er, res) => {
        assert.ok(!er);
        assert.deepStrictEqual(res?.toSorted(), expected.toSorted());
        resolve();
      });
    });
  });
});
