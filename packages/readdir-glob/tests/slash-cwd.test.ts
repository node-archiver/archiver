import { beforeEach, it, describe, expect } from "bun:test";

// regression test to make sure that slash-ended patterns
// don't match files when using a different cwd.
import glob from "@archiver/readdir-glob";

const pattern = "{*.md,tests}/";
const expected = ["tests/"];

describe("slash-cwd", () => {
  beforeEach(() => {
    process.chdir(__dirname + "/..");
  });

  it("slashes only match directories", (done) => {
    glob(".", { mark: true, pattern }, (er, async) => {
      expect(er).toBeFalsy();
      expect(async).toEqual(expected);
      done();
    });
  });
});
