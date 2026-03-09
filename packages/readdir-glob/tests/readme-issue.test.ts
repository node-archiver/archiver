import { it, beforeEach, describe, expect, afterEach } from "bun:test";
import * as fs from "node:fs";

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

  it("glob", (done) => {
    const opt = {
      pattern: "README?(.*)",
      nocase: true,
      mark: true,
    };

    glob(dir, opt, (er, files) => {
      expect(er).toBeFalsy();
      expect(files).toEqual(["README"]);
      done();
    });
  });
});
