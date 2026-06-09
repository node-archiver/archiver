import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readdirGlob } from "@archiver/readdir-glob";

describe("globstar-match", () => {
  it("globstar should not have dupe matches", async () => {
    await new Promise<void>((done) => {
      const pattern = "a/**/[gh]";
      let cb;
      const cbSet = new Promise<string[]>((resolve) => (cb = resolve));
      const g = readdirGlob(".", { cwd: __dirname, pattern }, (_, matches) =>
        cb(matches),
      );
      const matches: string[] = [];
      g.on("match", (m) => matches.push(m.relative));
      g.on("end", () => {
        cbSet.then((set) => {
          matches.sort();
          set.sort();
          assert.deepStrictEqual(matches, set);
          done();
        });
      });
    });
  });
});
