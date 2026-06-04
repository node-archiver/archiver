import { it, describe, expect } from "bun:test";

import glob from "@archiver/readdir-glob";

/**
 * Regression test for the createMatcher checkDots guard.
 *
 * A positive extglob such as `@(.y)` explicitly references a dotfile segment.
 * With `dot: false`, that match should still succeed because the dot is
 * deliberate in the pattern.
 */
describe("extglob-dotfile", () => {
  it("positive extglob @(.y) should match the explicit dotfile segment with dot:false", (done) => {
    process.chdir(`${__dirname}/fixtures`);

    glob(".", { pattern: "a/x/@(.y)/b", dot: false }, (er, res) => {
      expect(er).toBeFalsy();
      expect(res).toEqual(["a/x/.y/b"]);
      done();
    });
  });
});
