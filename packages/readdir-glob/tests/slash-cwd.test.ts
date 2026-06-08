import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

// regression test to make sure that slash-ended patterns
// don't match files when using a different cwd.
import glob from "@archiver/readdir-glob";

const pattern = "{*.md,tests}/";
const expected = ["tests/"];

describe("slash-cwd", () => {
  beforeEach(() => {
    process.chdir(`${__dirname}/..`);
  });

  it("slashes only match directories", async () => {
    await new Promise<void>((resolve) => {
      glob(".", { mark: true, pattern }, (er, async) => {
        assert.ok(!er);
        assert.deepStrictEqual(async, expected);
        resolve();
      });
    });
  });
});
