import { it, beforeEach, describe, expect } from "bun:test";

import glob from "@archiver/readdir-glob";
const bashResults = require("./bash-results.json");
const isAbsolute = require("node:path").isAbsolute;

describe("absolute", () => {
  beforeEach(() => {
    process.chdir(__dirname + "/fixtures");
  });

  [true, false].forEach(function (mark) {
    it("Emits absolute matches if option set, mark=" + mark, function (done) {
      const pattern = "a/b/**";
      const g = new glob.ReaddirGlob(".", { pattern });

      let matchCount = 0;
      g.on("match", (m) => {
        expect(isAbsolute(m.absolute)).toBeTrue();
        matchCount++;
        console.log("..");
      });

      g.on("end", () => {
        expect(matchCount).toBe(bashResults[pattern].length);
        done();
      });
    });
  });
});
