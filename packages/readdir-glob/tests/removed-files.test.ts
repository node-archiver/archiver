import assert from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it, beforeEach, afterEach } from "node:test";

import glob from "@archiver/readdir-glob";

const dir = import.meta.dirname + "/removed-files";

describe("removed-files", () => {
  beforeEach(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(`${dir}/b`, { recursive: true });
    fs.mkdirSync(`${dir}/a`, { recursive: true });
    fs.writeFileSync(dir + "/a/a.txt", "a", "ascii");
    fs.writeFileSync(dir + "/a/b.txt", "b", "ascii");
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("removed file during exploration", async () => {
    await new Promise<void>((resolve) => {
      const g = glob(dir, { stat: true });
      const files: string[] = [];

      g.on("match", (match) => {
        if (/a\/.+/.test(match.relative)) {
          fs.rmSync(`${dir}/a`, { recursive: true, force: true });
          files.push(match.relative);
        }
      });

      g.on("end", () => {
        assert.deepStrictEqual(files.sort(), ["a/a.txt", "a/b.txt"]);
        resolve();
      });
    });
  });

  it("folder turned into a file during exploration", async () => {
    await new Promise<void>((resolve) => {
      const g = glob(dir, { stat: true });
      const files: string[] = [];

      g.on("match", (match) => {
        if (match.relative === "a") {
          fs.rmSync(`${dir}/a`, { recursive: true, force: true });
          fs.writeFileSync(`${dir}/a`, "oops", "ascii");
        }
        files.push(match.relative);
      });

      g.on("end", () => {
        assert.deepStrictEqual(files.sort(), ["a", "b"]);
        resolve();
      });
    });
  });
});
