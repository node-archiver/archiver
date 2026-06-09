import assert from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it, beforeEach, mock } from "node:test";

import glob from "@archiver/readdir-glob";

describe.skip("error-callback", () => {
  let logCalled = undefined;
  beforeEach(() => {
    logCalled = [];
    mock.method(fs, "readdir", (path, opts, cb) => {
      process.nextTick(() => cb(new Error("mock fs.readdir error")));
    });
    mock.method(console, "error", function (...args) {
      args.forEach((arg) => logCalled.push(arg));
    });
  });

  it("error callback", async () => {
    await new Promise<void>((resolve) => {
      glob(".", { pattern: "*" }, (err) => {
        assert.ok(err);

        setTimeout(() => {
          assert.strictEqual(logCalled.length, 1);
          assert.strictEqual(logCalled[0].message, "mock fs.readdir error");
          resolve();
        });
      });
    });
  });
});
