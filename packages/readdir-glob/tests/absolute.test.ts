import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { describe, it, beforeEach } from "node:test";

import glob from "@archiver/readdir-glob";

import bashResults from "./bash-results.json";

describe("absolute", () => {
  beforeEach(() => {
    process.chdir(`${__dirname}/fixtures`);
  });

  [true, false].forEach(function (mark) {
    it(`Emits absolute matches if option set, mark=${mark}`, async () => {
      await new Promise<void>((resolve) => {
        const pattern = "a/b/**";
        const g = glob(".", { pattern });

        let matchCount = 0;
        g.on("match", (m) => {
          assert.ok(isAbsolute(m.absolute));
          matchCount++;
        });

        g.on("end", () => {
          assert.strictEqual(matchCount, bashResults[pattern].length);
          resolve();
        });
      });
    });
  });
});
