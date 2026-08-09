import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import glob from "@archiver/readdir-glob";

describe("nodir", () => {
  beforeEach(() => {
    process.chdir(import.meta.dirname + "/fixtures");
  });

  // [pattern, options, expected]
  const cases = [
    [
      "*/**",
      { cwd: "a" },
      [
        "abcdef/g/h",
        "abcfed/g/h",
        "b/c/d",
        "bc/e/f",
        "c/d/c/b",
        "cb/e/f",
        "symlink/a/b/c",
      ],
    ],
    [
      "a/*b*/**",
      {},
      ["a/abcdef/g/h", "a/abcfed/g/h", "a/b/c/d", "a/bc/e/f", "a/cb/e/f"],
    ],
    ["a/*b*/**/", {}, []],
    ["*/*", { cwd: "a" }, []],
  ];

  cases.forEach((c) => {
    const pattern = c[0];
    const options = c[1] || {};
    options.nodir = true;
    let expected = c[2].sort();
    if (process.platform === "win32") {
      expected = expected.filter((path) => path.indexOf("symlink") === -1);
    }
    it(pattern + " " + JSON.stringify(options), async () => {
      await new Promise<void>((resolve) => {
        glob(options.cwd || ".", { pattern, ...options }, (er, res) => {
          assert.ok(!er);
          res.sort();
          assert.deepStrictEqual(res, expected);
          resolve();
        });
      });
    });
  });
});
