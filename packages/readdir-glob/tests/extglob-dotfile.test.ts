import assert from "node:assert/strict";
import { describe, it } from "node:test";

import glob from "@archiver/readdir-glob";

/**
 * Regression test for the createMatcher checkDots guard.
 *
 * A positive extglob such as `@(.y)` explicitly references a dotfile segment.
 * With `dot: false`, that match should still succeed because the dot is
 * deliberate in the pattern.
 */
describe("extglob-dotfile", () => {
  it("positive extglob @(.y) should match the explicit dotfile segment with dot:false", async () => {
    await new Promise<void>((resolve) => {
      process.chdir(`${import.meta.dirname}/fixtures`);

      glob(".", { pattern: "a/x/@(.y)/b", dot: false }, (er, res) => {
        assert.ok(!er);
        assert.deepStrictEqual(res, ["a/x/.y/b"]);
        resolve();
      });
    });
  });
});
