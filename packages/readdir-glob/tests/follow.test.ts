import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import glob from "@archiver/readdir-glob";

const win32 = process.platform === "win32";

describe("follow", () => {
  beforeEach(() => {
    process.chdir(`${import.meta.dirname}/fixtures`);
  });

  const _it = win32 ? it.skip : it;

  _it("follow symlinks", async () => {
    await new Promise<void>((resolve) => {
      const pattern = "a/symlink/**";
      const long = "a/symlink/a/b/c/c/d";

      glob(".", { pattern }, (er, res) => {
        assert.ok(!er);
        const noFollow = res.sort();
        assert.ok(!noFollow.includes(long));

        glob(".", { follow: true, pattern }, (er, res) => {
          assert.ok(!er);
          const follow = res.sort();

          assert.ok(follow.includes(long));
          resolve();
        });
      });
    });
  });
});
