import assert from "node:assert/strict";
import { Stats } from "node:fs";
import { describe, it } from "node:test";

import glob from "@archiver/readdir-glob";

const dir = `${import.meta.dirname}/fixtures`;

describe("stat", () => {
  it("stat all the things", async () => {
    await new Promise<void>((resolve) => {
      const g = glob(dir, { stat: true, pattern: "a/*abc*/**" });
      const matches: string[] = [];
      g.on("match", (m) => {
        matches.push(m.relative);
        assert.ok(m.stat instanceof Stats);
        assert.ok("isFile" in m.stat);
        assert.ok("isDirectory" in m.stat);
        assert.ok("isSymbolicLink" in m.stat);
        assert.ok("isBlockDevice" in m.stat);
        assert.ok("isCharacterDevice" in m.stat);
        assert.ok("isFIFO" in m.stat);
        assert.ok("isSocket" in m.stat);
        assert.ok("dev" in m.stat);
        assert.ok("ino" in m.stat);
        assert.ok("mode" in m.stat);
        assert.ok("nlink" in m.stat);
        assert.ok("uid" in m.stat);
        assert.ok("gid" in m.stat);
        assert.ok("rdev" in m.stat);
        assert.ok("size" in m.stat);
        assert.ok("blksize" in m.stat);
        assert.ok("blocks" in m.stat);
        assert.ok("atimeMs" in m.stat);
        assert.ok("mtimeMs" in m.stat);
        assert.ok("ctimeMs" in m.stat);
        assert.ok("birthtimeMs" in m.stat);
      });
      g.on("end", () => {
        assert.deepStrictEqual(
          matches.toSorted(),
          [
            "a/abcdef",
            "a/abcdef/g",
            "a/abcdef/g/h",
            "a/abcfed",
            "a/abcfed/g",
            "a/abcfed/g/h",
          ].toSorted(),
        );
        resolve();
      });
    });
  });
});
