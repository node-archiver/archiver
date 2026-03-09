const glob = require("../");
const mkdirp = require("mkdirp");
const fs = require("node:fs");

const dir = __dirname + "/package";

describe("readme-issue", () => {
  beforeEach(() => {
    mkdirp.sync(dir);
    fs.writeFileSync(dir + "/package.json", "{}", "ascii");
    fs.writeFileSync(dir + "/README", "x", "ascii");
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("glob", (done) => {
    const opt = {
      pattern: "README?(.*)",
      nocase: true,
      mark: true,
    };

    glob(dir, opt, (er, files) => {
      expect(er).toBeFalsy();
      expect(files).toEqual(["README"]);
      done();
    });
  });
});
