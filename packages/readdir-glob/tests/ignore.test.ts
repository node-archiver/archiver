import assert from "node:assert/strict";
import { describe, it } from "node:test";

import glob from "@archiver/readdir-glob";

// [pattern, ignore, expect, opt (object) or cwd (string)]
const cases = [
  [
    "*",
    null,
    ["abcdef", "abcfed", "b", "bc", "c", "cb", "symlink", "x", "z"],
    "a",
  ],
  ["*", "b", ["abcdef", "abcfed", "bc", "c", "cb", "symlink", "x", "z"], "a"],
  ["*", "b*", ["abcdef", "abcfed", "c", "cb", "symlink", "x", "z"], "a"],
  ["b/**", "b/c/d", ["b", "b/c"], "a"],
  ["b/**", "d", ["b", "b/c", "b/c/d"], "a"],
  ["b/**", "b/c/**", ["b"], "a"],
  ["**/d", "b/c/d", ["c/d"], "a"],
  ["a/**/[gh]", ["a/abcfed/g/h"], ["a/abcdef/g", "a/abcdef/g/h", "a/abcfed/g"]],
  ["*", ["c", "bc", "symlink", "abcdef"], ["abcfed", "b", "cb", "x", "z"], "a"],
  [
    "**",
    ["c/**", "bc/**", "symlink/**", "abcdef/**"],
    [
      "abcfed",
      "abcfed/g",
      "abcfed/g/h",
      "b",
      "b/c",
      "b/c/d",
      "cb",
      "cb/e",
      "cb/e/f",
      "x",
      "z",
    ],
    "a",
  ],
  ["a/**", ["a/**"], []],
  ["a/**", ["a/**/**"], []],
  ["a/b/**", ["a/b"], ["a/b/c", "a/b/c/d"]],
  [
    "**",
    ["b"],
    [
      "abcdef",
      "abcdef/g",
      "abcdef/g/h",
      "abcfed",
      "abcfed/g",
      "abcfed/g/h",
      "b/c",
      "b/c/d",
      "bc",
      "bc/e",
      "bc/e/f",
      "c",
      "c/d",
      "c/d/c",
      "c/d/c/b",
      "cb",
      "cb/e",
      "cb/e/f",
      "symlink",
      "symlink/a",
      "symlink/a/b",
      "symlink/a/b/c",
      "x",
      "z",
    ],
    "a",
  ],
  [
    "**",
    ["b", "c"],
    [
      "abcdef",
      "abcdef/g",
      "abcdef/g/h",
      "abcfed",
      "abcfed/g",
      "abcfed/g/h",
      "b/c",
      "b/c/d",
      "bc",
      "bc/e",
      "bc/e/f",
      "c/d",
      "c/d/c",
      "c/d/c/b",
      "cb",
      "cb/e",
      "cb/e/f",
      "symlink",
      "symlink/a",
      "symlink/a/b",
      "symlink/a/b/c",
      "x",
      "z",
    ],
    "a",
  ],
  [
    "**",
    ["b**"],
    [
      "abcdef",
      "abcdef/g",
      "abcdef/g/h",
      "abcfed",
      "abcfed/g",
      "abcfed/g/h",
      "b/c",
      "b/c/d",
      "bc/e",
      "bc/e/f",
      "c",
      "c/d",
      "c/d/c",
      "c/d/c/b",
      "cb",
      "cb/e",
      "cb/e/f",
      "symlink",
      "symlink/a",
      "symlink/a/b",
      "symlink/a/b/c",
      "x",
      "z",
    ],
    "a",
  ],
  [
    "**",
    ["b/**"],
    [
      "abcdef",
      "abcdef/g",
      "abcdef/g/h",
      "abcfed",
      "abcfed/g",
      "abcfed/g/h",
      "bc",
      "bc/e",
      "bc/e/f",
      "c",
      "c/d",
      "c/d/c",
      "c/d/c/b",
      "cb",
      "cb/e",
      "cb/e/f",
      "symlink",
      "symlink/a",
      "symlink/a/b",
      "symlink/a/b/c",
      "x",
      "z",
    ],
    "a",
  ],
  [
    "**",
    ["b**/**"],
    [
      "abcdef",
      "abcdef/g",
      "abcdef/g/h",
      "abcfed",
      "abcfed/g",
      "abcfed/g/h",
      "c",
      "c/d",
      "c/d/c",
      "c/d/c/b",
      "cb",
      "cb/e",
      "cb/e/f",
      "symlink",
      "symlink/a",
      "symlink/a/b",
      "symlink/a/b/c",
      "x",
      "z",
    ],
    "a",
  ],
  [
    "**",
    ["ab**ef/**"],
    [
      "abcfed",
      "abcfed/g",
      "abcfed/g/h",
      "b",
      "b/c",
      "b/c/d",
      "bc",
      "bc/e",
      "bc/e/f",
      "c",
      "c/d",
      "c/d/c",
      "c/d/c/b",
      "cb",
      "cb/e",
      "cb/e/f",
      "symlink",
      "symlink/a",
      "symlink/a/b",
      "symlink/a/b/c",
      "x",
      "z",
    ],
    "a",
  ],
  [
    "**",
    ["abc{def,fed}/**"],
    [
      "b",
      "b/c",
      "b/c/d",
      "bc",
      "bc/e",
      "bc/e/f",
      "c",
      "c/d",
      "c/d/c",
      "c/d/c/b",
      "cb",
      "cb/e",
      "cb/e/f",
      "symlink",
      "symlink/a",
      "symlink/a/b",
      "symlink/a/b/c",
      "x",
      "z",
    ],
    "a",
  ],
  [
    "**",
    ["abc{def,fed}/*"],
    [
      "abcdef",
      "abcdef/g/h",
      "abcfed",
      "abcfed/g/h",
      "b",
      "b/c",
      "b/c/d",
      "bc",
      "bc/e",
      "bc/e/f",
      "c",
      "c/d",
      "c/d/c",
      "c/d/c/b",
      "cb",
      "cb/e",
      "cb/e/f",
      "symlink",
      "symlink/a",
      "symlink/a/b",
      "symlink/a/b/c",
      "x",
      "z",
    ],
    "a",
  ],
  ["c/**", ["c/*"], ["c", "c/d/c", "c/d/c/b"], "a"],
  ["a/c/**", ["a/c/*"], ["a/c", "a/c/d/c", "a/c/d/c/b"]],
  ["a/c/**", ["a/c/**", "a/c/*", "a/c/*/c"], []],
  ["a/**/.y", ["a/x/**"], ["a/z/.y"]],
  ["a/**/.y", ["a/x/**"], ["a/z/.y"], { dot: true }],
  ["a/**/b", ["a/x/**"], ["a/b", "a/c/d/c/b", "a/symlink/a/b"]],
  [
    "a/**/b",
    ["a/x/**"],
    ["a/b", "a/c/d/c/b", "a/symlink/a/b", "a/z/.y/b"],
    { dot: true },
  ],
  ["*/.abcdef", "a/**", []],
  ["a/*/.y/b", "a/x/**", ["a/z/.y/b"]],
];

describe("ignore", () => {
  cases.forEach((c, i) => {
    const pattern = c[0];
    const ignore = c[1];
    let expectedFiles = c[2].sort();
    let opt = c[3];
    let name = i + " " + pattern + " " + JSON.stringify(ignore);
    if (typeof opt === "string") {
      opt = { cwd: opt };
    }

    if (opt) {
      name += " " + JSON.stringify(opt);
    } else {
      opt = {};
    }

    const matches: string[] = [];
    opt.ignore = ignore;

    it(name, async () => {
      await new Promise<void>((resolve) => {
        process.chdir(`${__dirname}/fixtures`);

        glob(opt.cwd || ".", { ...opt, pattern }, (er, res) => {
          assert.ok(!er);

          if (process.platform === "win32") {
            expectedFiles = expectedFiles.filter(
              (f) => f.indexOf("symlink") === -1,
            );
          }

          assert.deepStrictEqual(res?.toSorted(), expectedFiles);
          assert.deepStrictEqual(matches.toSorted(), expectedFiles);
          resolve();
        }).on("match", (p) => matches.push(p.relative));
      });
    });
  });

  const pattern = "fixtures/*";
  [true, false].forEach((dot) => {
    ["fixtures/**", null].forEach((ignore) => {
      [false, true].forEach((nonull) => {
        [false, __dirname, "."].forEach((cwd) => {
          const opt = {
            dot: dot,
            ignore: ignore,
            nonull: nonull,
            cwd,
          };
          const expectedFiles = ignore ? [] : ["fixtures/a"];
          it("race condition: " + JSON.stringify(opt), async () => {
            await new Promise<void>((resolve) => {
              let cb;
              const cbSet = new Promise((resolve, _) => (cb = resolve));
              process.chdir(__dirname);
              glob(cwd, { ...opt, pattern }, (_, matches) => cb(matches)).on(
                "end",
                () => {
                  cbSet.then((res) => {
                    assert.deepStrictEqual(res, expectedFiles);
                    resolve();
                  });
                },
              );
            });
          });
        });
      });
    });
  });
});
