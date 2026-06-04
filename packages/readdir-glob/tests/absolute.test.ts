import { it, beforeEach, describe, expect } from "bun:test";
import { isAbsolute } from "node:path";

import glob from "@archiver/readdir-glob";

import bashResults from "./bash-results.json";

describe("absolute", () => {
  beforeEach(() => {
    process.chdir(`${__dirname}/fixtures`);
  });

  [true, false].forEach(function (mark) {
    it(`Emits absolute matches if option set, mark=${mark}`, function (done) {
      const pattern = "a/b/**";
      const g = glob(".", { pattern });

      let matchCount = 0;
      g.on("match", (m) => {
        expect(isAbsolute(m.absolute)).toBeTrue();
        matchCount++;
        // console.log("..");
      });

      g.on("end", () => {
        expect(matchCount).toBe(bashResults[pattern].length);
        done();
      });
    });
  });
});
