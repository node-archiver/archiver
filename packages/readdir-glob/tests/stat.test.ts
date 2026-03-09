import { describe, it, expect } from "bun:test";
import { Stats } from "node:fs";

import glob from "@archiver/readdir-glob";
const dir = __dirname + "/fixtures";

describe("stat", () => {
  it("stat all the things", (done) => {
    const g = new glob.ReaddirGlob(dir, { stat: true, pattern: "a/*abc*/**" });
    const matches: string[] = [];
    g.on("match", (m) => {
      matches.push(m.relative);
      expect(m.stat instanceof Stats).toBe(true);
    });
    g.on("end", () => {
      expect(matches).toEqual([
        "a/abcdef",
        "a/abcdef/g",
        "a/abcdef/g/h",
        "a/abcfed",
        "a/abcfed/g",
        "a/abcfed/g/h",
      ]);
      done();
    });
  });
});
