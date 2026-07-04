import assert from "node:assert/strict";
import { describe, it } from "node:test";

import glob from "@archiver/readdir-glob";

// Patterns that cannot match anything
const patterns = [
  "# comment",
  " ",
  "\n",
  "just doesnt happen to match anything so this is a control",
];

describe("empty-set", () => {
  patterns.forEach((p) => {
    it("Empty-set: " + JSON.stringify(p), async () => {
      await new Promise<void>((resolve) => {
        glob(".", { pattern: p }, (e, f) => {
          assert.strictEqual(e, null);
          assert.deepStrictEqual(f, []);
          resolve();
        });
      });
    });
  });
});
