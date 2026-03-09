import { it, beforeEach, describe, expect } from "bun:test";

import { readdirGlob } from "@archiver/readdir-glob";

import bashResults from "./bash-results.json";

const pattern = "a/!(symlink)/**";

describe("pause-resume", () => {
  beforeEach(() => {
    process.chdir(__dirname + "/fixtures");
  });

  function alphasort(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a > b ? 1 : a < b ? -1 : 0;
  }

  function cleanResults(m) {
    // normalize discrepancies in ordering, duplication,
    // and ending slashes.
    return m.sort(alphasort);
  }

  it("use a ReaddirGlob object, and pause/resume it", (done) => {
    let globResults: string[] = [];

    let cb;
    const cbSet = new Promise((resolve) => (cb = resolve));

    const g = readdirGlob(".", { pattern }, (_, matches) => cb(matches));
    const expected = bashResults[pattern];

    g.on("match", (m) => {
      expect(g.paused).toBeFalsy();
      globResults.push(m.relative);
      g.pause();
      expect(g.paused).toBeTruthy();
      setTimeout(g.resume.bind(g), 10);
    });

    g.on("end", () => {
      cbSet.then((matches) => {
        globResults = cleanResults(globResults);
        matches = cleanResults(matches);
        expect(matches).toEqual(globResults);
        expect(matches).toEqual(expected);
        done();
      });
    });
  });
});
