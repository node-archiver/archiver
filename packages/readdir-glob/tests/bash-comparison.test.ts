// basic test
// show that it does the same thing by default as the shell.
import { it, beforeEach, describe, expect } from "bun:test";

import glob from "@archiver/readdir-glob";

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

describe("bash-comparison", () => {
  beforeEach(() => {
    process.chdir(__dirname + "/fixtures");
  });

  ["a/{b,c,d,e,f}/**/g"].forEach((pattern) => {
    let expectedFiles: string[] = [];

    // anything regarding the symlink thing will fail on windows, so just skip it
    if (process.platform === "win32") {
      expectedFiles = expectedFiles.filter((m) => m.indexOf("symlink") === -1);
    }

    it(pattern, (done) => {
      const g = glob(".", { pattern });
      let matches: string[] = [];
      g.on("match", (match) => {
        matches.push(match.relative);
      });
      g.on("end", () => {
        // sort and unmark, just to match the shell results
        matches = cleanResults(matches);
        expect(matches).toEqual(expectedFiles);
        done();
      });
    });
  });
});
