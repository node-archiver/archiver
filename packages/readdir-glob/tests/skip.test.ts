import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import glob, { type Options } from "@archiver/readdir-glob";

describe("skip", () => {
  beforeEach(() => {
    process.chdir(__dirname + "/fixtures");
  });

  // [cwd, options, expected]
  const cases: [string, Options, string[]][] = [
    [
      "a",
      { pattern: "**/*", mark: true, skip: ["*/g", "cb"] },
      [
        "abcdef/",
        "abcfed/",
        "b/",
        "b/c/",
        "b/c/d",
        "bc/",
        "bc/e/",
        "bc/e/f",
        "c/",
        "c/d/",
        "c/d/c/",
        "c/d/c/b",
        "symlink/",
        "symlink/a/",
        "symlink/a/b/",
        "symlink/a/b/c",
        "x/",
        "z/",
      ],
    ],
    ["a/c", { mark: true, skip: "**/c" }, ["d/"]],
    [
      "a",
      { pattern: "**/*", mark: true, skip: ["cb/"] },
      [
        "abcdef/",
        "abcdef/g/",
        "abcdef/g/h",
        "abcfed/",
        "abcfed/g/",
        "abcfed/g/h",
        "b/",
        "b/c/",
        "b/c/d",
        "bc/",
        "bc/e/",
        "bc/e/f",
        "c/",
        "c/d/",
        "c/d/c/",
        "c/d/c/b",
        "cb/",
        "cb/e/",
        "cb/e/f",
        "symlink/",
        "symlink/a/",
        "symlink/a/b/",
        "symlink/a/b/c",
        "x/",
        "z/",
      ],
    ],
  ];

  cases.forEach((c) => {
    const cwd = c[0];
    const options = c[1];
    let expected = c[2].sort();
    if (process.platform === "win32") {
      expected = expected.filter((path) => path.indexOf("symlink") === -1);
    }
    it(cwd + " " + JSON.stringify(options), async () => {
      await new Promise<void>((resolve) => {
        glob(cwd, options, (er, res) => {
          assert.ok(!er);
          assert.deepStrictEqual(res?.toSorted(), expected);
          resolve();
        });
      });
    });
  });
});
