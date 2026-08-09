import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import glob from "@archiver/readdir-glob";

describe("mark", () => {
  beforeEach(() => {
    process.chdir(`${import.meta.dirname}/fixtures`);
  });

  it("mark with cwd", async () => {
    await new Promise<void>((resolve) => {
      const pattern = "*/*";
      const opt = { mark: true };
      glob("a", { ...opt, pattern }, (er, res) => {
        assert.ok(!er);

        const expected = [
          "abcdef/g/",
          "abcfed/g/",
          "b/c/",
          "bc/e/",
          "c/d/",
          "cb/e/",
        ];

        if (process.platform !== "win32") {
          expected.push("symlink/a/");
        }

        assert.deepStrictEqual(res?.toSorted(), expected.toSorted());
        resolve();
      });
    });
  });

  it("mark, with **", async () => {
    await new Promise<void>((resolve) => {
      const pattern = "a/*b*/**";
      const opt = { mark: true };
      glob(".", { ...opt, pattern }, (er, results) => {
        assert.ok(!er);
        const expected = [
          "a/abcdef/",
          "a/abcdef/g/",
          "a/abcdef/g/h",
          "a/abcfed/",
          "a/abcfed/g/",
          "a/abcfed/g/h",
          "a/b/",
          "a/b/c/",
          "a/b/c/d",
          "a/bc/",
          "a/bc/e/",
          "a/bc/e/f",
          "a/cb/",
          "a/cb/e/",
          "a/cb/e/f",
        ];

        assert.deepStrictEqual(results?.toSorted(), expected.toSorted());
        resolve();
      });
    });
  });

  it("mark, no / on pattern", async () => {
    await new Promise<void>((resolve) => {
      const pattern = "a/*";
      const opt = { mark: true };
      glob(".", { ...opt, pattern }, (er, results) => {
        assert.ok(!er);
        const expected = [
          "a/abcdef/",
          "a/abcfed/",
          "a/b/",
          "a/bc/",
          "a/c/",
          "a/cb/",
          "a/x/",
          "a/z/",
        ];

        if (process.platform !== "win32") {
          expected.push("a/symlink/");
        }

        assert.deepStrictEqual(results?.toSorted(), expected.toSorted());
        resolve();
      }).on("match", (m) => {
        assert.ok(m.relative.endsWith("/"));
      });
    });
  });

  it("mark=false, no / on pattern", async () => {
    await new Promise<void>((resolve) => {
      const pattern = "a/*";
      glob(".", { pattern }, (er, results) => {
        assert.ok(!er);
        const expected = [
          "a/abcdef",
          "a/abcfed",
          "a/b",
          "a/bc",
          "a/c",
          "a/cb",
          "a/x",
          "a/z",
        ];

        if (process.platform !== "win32") {
          expected.push("a/symlink");
        }

        assert.deepStrictEqual(results?.toSorted(), expected.toSorted());
        resolve();
      }).on("match", (m) => {
        assert.ok(/[^/]$/.test(m.relative));
      });
    });
  });

  it("mark=true, / on pattern", async () => {
    await new Promise<void>((resolve) => {
      const pattern = "a/*/";
      const opt = { mark: true };
      glob(".", { ...opt, pattern }, (er, results) => {
        assert.ok(!er);
        const expected = [
          "a/abcdef/",
          "a/abcfed/",
          "a/b/",
          "a/bc/",
          "a/c/",
          "a/cb/",
          "a/x/",
          "a/z/",
        ];

        if (process.platform !== "win32") {
          expected.push("a/symlink/");
        }

        assert.deepStrictEqual(results?.toSorted(), expected.toSorted());
        resolve();
      }).on("match", (m) => {
        assert.ok(m.relative.endsWith("/"));
      });
    });
  });

  it("mark=false, / on pattern", async () => {
    await new Promise<void>((resolve) => {
      const pattern = "a/*/";
      glob(".", { pattern }, (er, results) => {
        assert.ok(!er);
        const expected = [
          "a/abcdef",
          "a/abcfed",
          "a/b",
          "a/bc",
          "a/c",
          "a/cb",
          "a/x",
          "a/z",
        ];
        if (process.platform !== "win32") {
          expected.push("a/symlink");
        }

        assert.deepStrictEqual(results?.toSorted(), expected.toSorted());
        resolve();
      });
    });
  });
});
