import { it, beforeEach, describe, expect } from "bun:test";

import { ReaddirGlob } from "@archiver/readdir-glob";

describe("new-glob-optional-options", () => {
  beforeEach(() => {
    process.chdir(__dirname + "/fixtures");
  });

  it("new glob, with cb, and no options", (done) => {
    new ReaddirGlob("./a/bc/e/", function (er, results) {
      expect(er).toBeFalsy();
      expect(results).toEqual(["f"]);
      done();
    });
  });
});
