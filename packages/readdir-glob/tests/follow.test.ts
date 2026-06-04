import { it, beforeEach, describe, expect } from "bun:test";

import glob from "@archiver/readdir-glob";

const win32 = process.platform === "win32";

describe("follow", () => {
  beforeEach(() => {
    process.chdir(`${__dirname}/fixtures`);
  });

  it.skipIf(win32)("follow symlinks", (done) => {
    const pattern = "a/symlink/**";
    const long = "a/symlink/a/b/c/c/d";

    glob(".", { pattern }, (er, res) => {
      expect(er).toBeFalsy();
      const noFollow = res.sort();
      expect(noFollow).not.toContain(long);

      glob(".", { follow: true, pattern }, (er, res) => {
        expect(er).toBeFalsy();
        const follow = res.sort();

        expect(follow).toContain(long);
        done();
      });
    });
  });
});
