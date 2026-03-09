import { it, describe, expect, spyOn } from "bun:test";
import * as fs from "node:fs";

import glob from "@archiver/readdir-glob";

describe("multiple-weird-error", () => {
  // also test that silent:true is actually silent!
  it("multiple-weird-error", (done) => {
    spyOn(console, "error").mockImplementation(() => {
      throw new Error("SILENCE, INSECT!");
    });
    spyOn(fs, "readdir").mockImplementation((path, opts, cb) =>
      cb(new Error("expected")),
    );

    let count = 0;
    const max = 2;
    for (let i = 0; i < max; ++i) {
      glob(".", { silent: true, pattern: "*" }, function (err) {
        expect(err).toBeTruthy();
        count++;
        if (count === max) {
          done();
        }
      });
    }
  });
});
