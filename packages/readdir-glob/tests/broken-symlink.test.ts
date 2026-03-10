import { it, beforeEach, describe, expect, afterEach } from "bun:test";
import * as fs from "node:fs";

import glob from "@archiver/readdir-glob";

const win32 = process.platform === "win32";

function cleanup() {
  fs.rmSync("broken-symlink", { recursive: true, force: true });
}

describe("broken-symlink", () => {
  beforeEach(() => {
    process.chdir(__dirname);
    fs.mkdirSync(process.cwd() + "/broken-symlink/a/broken-link", {
      recursive: true,
    });
    fs.symlinkSync("this-does-not-exist", "broken-symlink/a/broken-link/link");
  });

  afterEach(() => {
    process.chdir(__dirname);
    cleanup();
  });

  const link = "broken-symlink/a/broken-link/link";
  const patterns = [
    "broken-symlink/a/broken-link/*",
    "broken-symlink/a/broken-link/**",
    "broken-symlink/a/broken-link/**/link",
    "broken-symlink/a/broken-link/**/*",
    "broken-symlink/a/broken-link/link",
    "broken-symlink/a/broken-link/{link,asdf}",
    "broken-symlink/a/broken-link/+(link|asdf)",
    "broken-symlink/a/broken-link/!(asdf)",
  ];
  const opts = [
    null,
    { nonull: true },
    { mark: true },
    { stat: true },
    { follow: true },
  ];

  patterns.forEach((pattern) => {
    opts.forEach((opt) => {
      it.skipIf(win32)(
        "async test pattern=" + pattern + ", opts=" + JSON.stringify(opt),
        (done) => {
          glob(".", { ...opt, pattern }, (er, res) => {
            if (er) {
              expect().fail(er.message);
              return done();
            }
            expect(res.indexOf(link)).not.toBe(-1);
            done();
          });
        },
      );
    });
  });
});
