import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import glob from "@archiver/readdir-glob";

describe("pattern-list", () => {
  beforeEach(() => {
    process.chdir(import.meta.dirname + "/fixtures");
  });

  // [cwd, options, expected]
  const cases = [
    ["a", { pattern: ["abcdef/*", "z"], mark: true }, ["abcdef/g/", "z/"]],
  ];

  cases.forEach((c) => {
    const cwd = c[0];
    const options = c[1];
    const expected = c[2].sort();
    it(cwd + " " + JSON.stringify(options), async () => {
      await new Promise<void>((resolve) => {
        glob(cwd, options, (er, res) => {
          assert.ok(!er);
          res.sort();
          assert.deepStrictEqual(res, expected);
          resolve();
        });
      });
    });
  });
});
