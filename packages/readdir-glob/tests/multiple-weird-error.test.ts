import assert from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it, mock } from "node:test";

import glob from "@archiver/readdir-glob";

describe.skip("multiple-weird-error", () => {
  // also test that silent:true is actually silent!
  it("multiple-weird-error", async () => {
    await new Promise<void>((resolve) => {
      mock.method(console, "error", () => {
        throw new Error("SILENCE, INSECT!");
      });
      mock.method(fs, "readdir", (path, opts, cb) => cb(new Error("expected")));

      let count = 0;
      const max = 2;
      for (let i = 0; i < max; ++i) {
        glob(".", { silent: true, pattern: "*" }, function (err) {
          assert.ok(err);
          count++;
          if (count === max) {
            resolve();
          }
        });
      }
    });
  });
});
