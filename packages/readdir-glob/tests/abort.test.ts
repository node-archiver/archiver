import * as fs from "node:fs";
import { describe, it, beforeEach, mock } from "node:test";

import glob from "@archiver/readdir-glob";

describe.skip("abort", () => {
  beforeEach(() => {
    process.chdir(__dirname);
  });

  it("abort prevents any action", () => {
    const globs = [
      glob(".", { pattern: "a/**" }),
      glob(".", { pattern: "a/" }),
      glob(".", { pattern: "a/" }),
    ];

    globs.forEach((g) =>
      mock.method(g, "emit", () => {
        throw new Error("Invalid call");
      }),
    );
    mock.method(fs, "readdir", () => {
      throw new Error("Invalid call");
    });
    mock.method(fs, "stat", () => {
      throw new Error("Invalid call");
    });
    mock.method(fs, "lstat", () => {
      throw new Error("Invalid call");
    });

    globs.forEach((g) => g.abort());
  });
});
