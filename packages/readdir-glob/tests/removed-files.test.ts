import glob from "@archiver/readdir-glob";
const mkdirp = require("mkdirp");
const fs = require("node:fs");

const dir = __dirname + "/removed-files";

describe("removed-files", () => {
  beforeEach(() => {
    mkdirp.sync(dir);
    mkdirp.sync(dir + "/b");
    mkdirp.sync(dir + "/a");
    fs.writeFileSync(dir + "/a/a.txt", "a", "ascii");
    fs.writeFileSync(dir + "/a/b.txt", "b", "ascii");
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("removed file during exploration", (done) => {
    const g = glob(dir, { stat: true });
    const files = [];

    g.on("match", (match) => {
      if (/a\/.+/.test(match.relative)) {
        fs.rmSync(dir + "/a", { recursive: true, force: true });
        files.push(match.relative);
      }
    });

    g.on("end", () => {
      expect(files.sort()).toEqual(["a/a.txt", "a/b.txt"]);
      done();
    });
  });

  it("folder turned into a file during exploration", (done) => {
    const g = glob(dir, { stat: true });
    const files = [];

    g.on("match", (match) => {
      if (match.relative === "a") {
        fs.rmSync(dir + "/a", { recursive: true, force: true });
        fs.writeFileSync(dir + "/a", "oops", "ascii");
      }
      files.push(match.relative);
    });

    g.on("end", () => {
      expect(files.sort()).toEqual(["a", "b"]);
      done();
    });
  });
});
