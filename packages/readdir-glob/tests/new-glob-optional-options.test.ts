import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { readdirGlob } from "@archiver/readdir-glob";

describe("new-glob-optional-options", () => {
  beforeEach(() => {
    process.chdir(`${import.meta.dirname}/fixtures`);
  });

  it("new glob, with cb, and no options", async () => {
    await new Promise<void>((resolve) => {
      readdirGlob("./a/bc/e/", function (er, results) {
        assert.ok(!er);
        assert.deepStrictEqual(results, ["f"]);
        resolve();
      });
    });
  });
});
