import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";

import { readdirGlob } from "@archiver/readdir-glob";

describe("noglobstar", () => {
  it("noglobstar:true — a/** must not match 'a' itself (zero extra segments)", async () => {
    await new Promise<void>((resolve) => {
      const fixtureDir = path.resolve(import.meta.dirname, "fixtures");

      readdirGlob(
        fixtureDir,
        { pattern: "a/**", noglobstar: true },
        (err, matches) => {
          assert.strictEqual(err, null);

          // With noglobstar:true, ** degrades to a single-segment wildcard (*),
          // so "a/**" is equivalent to "a/*" and requires exactly one additional
          // segment.  The top-level directory "a" (zero extra segments) must
          // NOT appear in the results.
          assert.ok(!matches.includes("a")); // ← the regression assertion

          // Direct children of "a" are still expected (they satisfy "a/*").
          assert.ok(matches.includes("a/b"));
          resolve();
        },
      );
    });
  });
});
