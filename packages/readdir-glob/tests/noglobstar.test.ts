import { describe, expect, it } from "bun:test";
import * as path from "node:path";

import { readdirGlob } from "@archiver/readdir-glob";

describe("noglobstar", () => {
  it("noglobstar:true — a/** must not match 'a' itself (zero extra segments)", (done) => {
    const fixtureDir = path.resolve(__dirname, "fixtures");

    readdirGlob(
      fixtureDir,
      { pattern: "a/**", noglobstar: true },
      (err, matches) => {
        expect(err).toBeNull();

        // With noglobstar:true, ** degrades to a single-segment wildcard (*),
        // so "a/**" is equivalent to "a/*" and requires exactly one additional
        // segment.  The top-level directory "a" (zero extra segments) must
        // NOT appear in the results.
        expect(matches).not.toContain("a"); // ← the regression assertion

        // Direct children of "a" are still expected (they satisfy "a/*").
        expect(matches).toContain("a/b");
        done();
      },
    );
  });
});
