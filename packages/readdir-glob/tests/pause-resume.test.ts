import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { readdirGlob } from "@archiver/readdir-glob";

import bashResults from "./bash-results.json" with { type: "json" };

const pattern = "a/!(symlink)/**";

describe("pause-resume", () => {
  beforeEach(() => {
    process.chdir(`${import.meta.dirname}/fixtures`);
  });

  function alphasort(a: string, b: string) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a > b ? 1 : a < b ? -1 : 0;
  }

  function cleanResults(m: string[]) {
    // normalize discrepancies in ordering, duplication,
    // and ending slashes.
    return m.sort(alphasort);
  }

  it("use a ReaddirGlob object, and pause/resume it", async () => {
    await new Promise<void>((resolve, reject) => {
      let globResults: string[] = [];

      let cb: (value: string[]) => void;
      const cbSet = new Promise<string[]>((resolve) => (cb = resolve));

      const g = readdirGlob(".", { pattern }, (err, matches) => {
        if (err) return reject(err);
        cb(matches);
      });
      const expected = bashResults[pattern];

      g.on("match", (m) => {
        assert.ok(!g.paused);
        globResults.push(m.relative);
        g.pause();
        assert.ok(g.paused);
        setTimeout(g.resume.bind(g), 10);
      });

      g.on("end", () => {
        cbSet
          .then((matches) => {
            globResults = cleanResults(globResults);
            matches = cleanResults(matches);
            assert.deepStrictEqual(matches, globResults);
            assert.deepStrictEqual(matches, expected);
            resolve();
          })
          .catch(reject);
      });
    });
  });
});
