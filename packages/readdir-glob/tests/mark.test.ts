import { it, beforeEach, describe, expect } from "bun:test";

import glob from "@archiver/readdir-glob";

describe("mark", () => {
  beforeEach(() => {
    process.chdir(__dirname + "/fixtures");
  });

  it("mark with cwd", (done) => {
    const pattern = "*/*";
    const opt = { mark: true };
    glob("a", { ...opt, pattern }, (er, res) => {
      expect(er).toBeFalsy();

      const expected = [
        "abcdef/g/",
        "abcfed/g/",
        "b/c/",
        "bc/e/",
        "c/d/",
        "cb/e/",
      ].toSorted();

      if (process.platform !== "win32") {
        expected.push("symlink/a/");
      }

      expect(res?.toSorted()).toEqual(expected);
      done();
    });
  });

  it("mark, with **", (done) => {
    const pattern = "a/*b*/**";
    const opt = { mark: true };
    glob(".", { ...opt, pattern }, (er, results) => {
      expect(er).toBeFalsy();
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
      ].toSorted();

      expect(results?.toSorted()).toEqual(expected);
      done();
    });
  });

  it("mark, no / on pattern", (done) => {
    const pattern = "a/*";
    const opt = { mark: true };
    glob(".", { ...opt, pattern }, (er, results) => {
      expect(er).toBeFalsy();
      const expected = [
        "a/abcdef/",
        "a/abcfed/",
        "a/b/",
        "a/bc/",
        "a/c/",
        "a/cb/",
        "a/x/",
        "a/z/",
      ].toSorted();

      if (process.platform !== "win32") {
        expected.push("a/symlink/");
      }

      expect(results?.toSorted()).toEqual(expected);
      done();
    }).on("match", (m) => {
      expect(m.relative).toMatch(/\/$/);
    });
  });

  it("mark=false, no / on pattern", (done) => {
    const pattern = "a/*";
    glob(".", { pattern }, (er, results) => {
      expect(er).toBeFalsy();
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

      expect(results?.toSorted()).toEqual(expected.toSorted());
      done();
    }).on("match", (m) => {
      expect(m.relative).toMatch(/[^/]$/);
    });
  });

  it("mark=true, / on pattern", (done) => {
    const pattern = "a/*/";
    const opt = { mark: true };
    glob(".", { ...opt, pattern }, (er, results) => {
      expect(er).toBeFalsy();
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

      expect(results?.toSorted()).toEqual(expected.toSorted());
      done();
    }).on("match", (m) => {
      expect(m.relative).toMatch(/\/$/);
    });
  });

  it("mark=false, / on pattern", (done) => {
    const pattern = "a/*/";
    glob(".", { pattern }, (er, results) => {
      expect(er).toBeFalsy();
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

      expect(results?.toSorted()).toEqual(expected.toSorted());
      done();
    });
  });
});
