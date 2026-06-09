import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it, beforeEach } from "node:test";

import glob from "@archiver/readdir-glob";

describe("cwd-test", () => {
  beforeEach(() => {
    process.chdir(`${__dirname}/fixtures`);
  });

  it('changing cwd and searching for **/d, "."', async () => {
    await new Promise<void>((resolve) => {
      glob(".", { pattern: "**/d" }, (er, matches) => {
        assert.ok(!er);
        assert.deepStrictEqual(matches?.toSorted(), ["a/b/c/d", "a/c/d"]);
        resolve();
      });
    });
  });

  it('changing cwd and searching for **/d, "a"', async () => {
    await new Promise<void>((resolve) => {
      glob(path.resolve("a"), { pattern: "**/d" }, (er, matches) => {
        assert.ok(!er);
        assert.deepStrictEqual(matches?.toSorted(), ["b/c/d", "c/d"]);
        resolve();
      });
    });
  });

  it('changing cwd and searching for **/d, "a/b"', async () => {
    await new Promise<void>((resolve) => {
      glob(path.resolve("a/b"), { pattern: "**/d" }, (er, matches) => {
        assert.ok(!er);
        assert.deepStrictEqual(matches, ["c/d"]);
        resolve();
      });
    });
  });

  it('changing cwd and searching for **/d, "a/b/"', async () => {
    await new Promise<void>((resolve) => {
      glob(path.resolve("a/b/"), { pattern: "**/d" }, (er, matches) => {
        assert.ok(!er);
        assert.deepStrictEqual(matches, ["c/d"]);
        resolve();
      });
    });
  });

  it("changing cwd and searching for **/d, process.cwd()", async () => {
    await new Promise<void>((resolve) => {
      glob(process.cwd(), { pattern: "**/d" }, (er, matches) => {
        assert.ok(!er);
        assert.deepStrictEqual(matches?.toSorted(), ["a/b/c/d", "a/c/d"]);
        resolve();
      });
    });
  });

  it("non-dir cwd should raise error", async () => {
    await new Promise<void>((resolve) => {
      const notdir = "a/b/c/d";
      const abs = path.resolve(notdir);

      glob(notdir, { pattern: "*" }, (er) => {
        assert.ok(er);
        assert.strictEqual(er.code, "ENOTDIR");
        assert.strictEqual(er.path, abs);
        resolve();
      });
    });
  });
});
