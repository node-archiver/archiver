import { describe, it, expect } from "bun:test";
import { Stats } from "node:fs";

import glob from "@archiver/readdir-glob";
const dir = __dirname + "/fixtures";

describe("stat", () => {
  it("stat all the things", (done) => {
    const g = glob(dir, { stat: true, pattern: "a/*abc*/**" });
    const matches: string[] = [];
    g.on("match", (m) => {
      matches.push(m.relative);
      expect(m.stat).not.toBeInstanceOf(Stats);
      expect(m.stat).toHaveProperty("isFile");
      expect(m.stat).toHaveProperty("isDirectory");
      expect(m.stat).toHaveProperty("isSymbolicLink");
      expect(m.stat).toHaveProperty("isBlockDevice");
      expect(m.stat).toHaveProperty("isCharacterDevice");
      expect(m.stat).toHaveProperty("isFIFO");
      expect(m.stat).toHaveProperty("isSocket");
      expect(m.stat).toHaveProperty("dev");
      expect(m.stat).toHaveProperty("ino");
      expect(m.stat).toHaveProperty("mode");
      expect(m.stat).toHaveProperty("nlink");
      expect(m.stat).toHaveProperty("uid");
      expect(m.stat).toHaveProperty("gid");
      expect(m.stat).toHaveProperty("rdev");
      expect(m.stat).toHaveProperty("size");
      expect(m.stat).toHaveProperty("blksize");
      expect(m.stat).toHaveProperty("blocks");
      expect(m.stat).toHaveProperty("atimeMs");
      expect(m.stat).toHaveProperty("mtimeMs");
      expect(m.stat).toHaveProperty("ctimeMs");
      expect(m.stat).toHaveProperty("birthtimeMs");
    });
    g.on("end", () => {
      expect(matches.toSorted()).toEqual(
        [
          "a/abcdef",
          "a/abcdef/g",
          "a/abcdef/g/h",
          "a/abcfed",
          "a/abcfed/g",
          "a/abcfed/g/h",
        ].toSorted(),
      );
      done();
    });
  });
});
