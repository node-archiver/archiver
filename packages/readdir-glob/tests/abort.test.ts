import { spyOn, it, beforeEach, describe } from "bun:test";
import * as fs from "node:fs";

import glob from "@archiver/readdir-glob";

describe.todo("abort", () => {
  beforeEach(() => {
    process.chdir(__dirname);
  });

  it("abort prevents any action", () => {
    const globs = [
      glob(".", { pattern: "a/**" }),
      glob(".", { pattern: "a/" }),
      glob(".", { pattern: "a/" }),
    ];

    globs.forEach((glob) =>
      spyOn(glob, "emit").mockImplementation(() => {
        throw new Error("Invalid call");
      }),
    );
    spyOn(fs, "readdir").mockImplementation(() => {
      throw new Error("Invalid call");
    });
    spyOn(fs, "stat").mockImplementation(() => {
      throw new Error("Invalid call");
    });
    spyOn(fs, "lstat").mockImplementation(() => {
      throw new Error("Invalid call");
    });

    globs.forEach((glob) => glob.abort());
  });
});
