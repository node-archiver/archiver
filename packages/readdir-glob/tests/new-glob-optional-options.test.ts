import { it, beforeEach, describe, expect } from "bun:test";

import { readdirGlob } from "@archiver/readdir-glob";

describe("new-glob-optional-options", () => {
  beforeEach(() => {
    process.chdir(__dirname + "/fixtures");
  });

  it("new glob, with cb, and no options", (done) => {
    readdirGlob("./a/bc/e/", function (er, results) {
      expect(er).toBeFalsy();
      expect(results).toEqual(["f"]);
      done();
    });
  });
});
