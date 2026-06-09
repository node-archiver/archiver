import assert from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it, beforeEach, afterEach } from "node:test";

import glob from "@archiver/readdir-glob";

const win32 = process.platform === "win32";

function cleanup() {
  fs.rmSync("broken-symlink", { recursive: true, force: true });
}

describe("broken-symlink", () => {
  beforeEach(() => {
    process.chdir(__dirname);
    fs.mkdirSync(`${process.cwd()}/broken-symlink/a/broken-link`, {
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

  const _it = win32 ? it.skip : it;

  patterns.forEach((pattern) => {
    opts.forEach((opt) => {
      _it(
        `async test pattern=${pattern}, opts=${JSON.stringify(opt)}`,
        async () => {
          await new Promise<void>((resolve) => {
            glob(".", { ...opt, pattern }, (er, res) => {
              if (er) {
                assert.fail(er.message);
              }
              assert.notStrictEqual(res.indexOf(link), -1);
              resolve();
            });
          });
        },
      );
    });
  });
});
