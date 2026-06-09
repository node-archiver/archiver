import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it, beforeEach } from "node:test";

import glob from "@archiver/readdir-glob";

const win32 = process.platform === "win32";

const fixtureDir = path.resolve(__dirname, "fixtures");
const pattern = "a/symlink/{*,**/*/*/*,*/*/**,*/*/*/*/*/*}";

describe("realpath", () => {
  beforeEach(() => {
    process.chdir(fixtureDir);
  });

  // options, results
  // absolute:true set on each option
  const cases = [
    [{}, ["a/symlink/a", "a/symlink/a/b", "a/symlink/a/b/c"]],

    [{ mark: true }, ["a/symlink/a/", "a/symlink/a/b/", "a/symlink/a/b/c"]],

    [{ stat: true }, ["a/symlink/a", "a/symlink/a/b", "a/symlink/a/b/c"]],

    [
      { cwd: "a" },
      ["symlink/a", "symlink/a/b", "symlink/a/b/c"],
      pattern.substr(2),
    ],

    [{ cwd: "a" }, [], "no one here but us chickens"],
  ];

  const _it = win32 ? it.skip : it;

  cases.forEach((c) => {
    const opt = c[0];

    _it(JSON.stringify(c), async () => {
      await new Promise<void>((resolve) => {
        let expected = c[1];
        if (!(opt.nonull && expected[0].match(/^no one here/))) {
          expected = expected.map((d) => {
            d = (opt.cwd ? path.resolve(opt.cwd) : fixtureDir) + "/" + d;
            return d.replace(/\\/g, "/");
          });
        }
        const p = c[2] || pattern;

        opt.absolute = true;
        opt.pattern = p;

        glob(opt.cwd || ".", opt, function (er, async) {
          assert.ok(!er);
          assert.deepStrictEqual(async, expected);
          resolve();
        });
      });
    });
  });
});
