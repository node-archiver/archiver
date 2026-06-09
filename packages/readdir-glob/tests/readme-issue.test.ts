import assert from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it, beforeEach, afterEach } from "node:test";

import glob from "@archiver/readdir-glob";

const dir = __dirname + "/package";

describe("readme-issue", () => {
  beforeEach(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dir + "/package.json", "{}", "ascii");
    fs.writeFileSync(dir + "/README", "x", "ascii");
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("glob", async () => {
    await new Promise<void>((resolve) => {
      const opt = {
        pattern: "README?(.*)",
        nocase: true,
        mark: true,
      };

      glob(dir, opt, (er, files) => {
        assert.ok(!er);
        assert.deepStrictEqual(files, ["README"]);
        resolve();
      });
    });
  });
});
