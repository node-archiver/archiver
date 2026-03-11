import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import {
  createWriteStream,
  chmodSync,
  createReadStream,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { Readable } from "node:stream";

import { JsonArchive } from "../src/index.js";
import { normalizeEntryData } from "../src/lib/core.js";
import { binaryBuffer, readJSON } from "./helpers/index.js";

const testBuffer = binaryBuffer(1024 * 16);
const testDate = new Date("Jan 03 2013 14:26:38 GMT");
const win32 = process.platform === "win32";

describe("archiver", () => {
  before(() => {
    mkdirSync("tmp", { recursive: true });
    if (!win32) {
      chmodSync("tests/fixtures/executable.sh", 511); // 0777
      chmodSync("tests/fixtures/directory/subdir/", 493); // 0755
      try {
        symlinkSync(
          "tests/fixtures/directory/level0.txt",
          "tests/fixtures/directory/subdir/level0link.txt",
        );
        symlinkSync(
          "tests/fixtures/directory/subdir/subsub/",
          "tests/fixtures/directory/subdir/subsublink",
        );
      } catch {}
    } else {
      writeFileSync(
        "tests/fixtures/directory/subdir/level0link.txt",
        "../level0.txt",
      );
      writeFileSync("tests/fixtures/directory/subdir/subsublink", "subsub");
    }
  });

  after(() => {
    try {
      unlinkSync("tests/fixtures/directory/subdir/level0link.txt");
    } catch {}
    try {
      unlinkSync("tests/fixtures/directory/subdir/subsublink");
    } catch {}
  });

  describe("core", () => {
    describe("normalizeEntryData", () => {
      it("should support prefix of the entry name", () => {
        const prefix1 = normalizeEntryData({
          name: "entry.txt",
          prefix: "prefix/",
        });
        assert.strictEqual(prefix1.name, "prefix/entry.txt");

        const prefix2 = normalizeEntryData({
          name: "entry.txt",
          prefix: "",
        });
        assert.strictEqual(prefix2.name, "entry.txt");
      });

      it("should support special bits on unix", () => {
        if (!win32) {
          const mode = normalizeEntryData({
            name: "executable.sh",
            mode: statSync("tests/fixtures/executable.sh").mode,
          });
          assert.strictEqual(mode.mode, 511);
        }
      });
    });
  });

  describe("api", () => {
    describe("#abort", () => {
      let archive: JsonArchive;

      before((done) => {
        archive = new JsonArchive();
        const testStream = createWriteStream("tmp/abort.json");
        testStream.on("close", () => {
          done();
        });
        archive.pipe(testStream);
        archive
          .append(testBuffer, { name: "buffer.txt", date: testDate })
          .append(createReadStream("tests/fixtures/test.txt"), {
            name: "stream.txt",
            date: testDate,
          })
          .file("tests/fixtures/test.txt")
          .abort();
      });

      it("should have a state of aborted", () => {
        assert.ok(archive._state);
        assert.strictEqual(archive._state.aborted, true);
      });
    });

    describe("#append", () => {
      let actual;
      let archive: JsonArchive;
      const entries = {};

      before((done) => {
        archive = new JsonArchive();
        const testStream = createWriteStream("tmp/append.json");
        testStream.on("close", () => {
          actual = readJSON("tmp/append.json");
          actual.forEach((entry) => {
            entries[entry.name] = entry;
          });
          done();
        });
        archive.pipe(testStream);
        archive
          .append(testBuffer, { name: "buffer.txt", date: testDate })
          .append(createReadStream("tests/fixtures/test.txt"), {
            name: "stream.txt",
            date: testDate,
          })
          .append(Readable.from(["test"]), {
            name: "stream-like.txt",
            date: testDate,
          })
          .append(null, { name: "directory/", date: testDate })
          .finalize();
      });

      it("should append multiple entries", () => {
        assert.ok(Array.isArray(actual));
        assert.strictEqual(actual.length, 4);
      });

      it("should append buffer", () => {
        assert.ok(entries["buffer.txt"]);
        assert.strictEqual(entries["buffer.txt"].name, "buffer.txt");
        assert.strictEqual(entries["buffer.txt"].type, "file");
        assert.strictEqual(
          entries["buffer.txt"].date,
          "2013-01-03T14:26:38.000Z",
        );
        assert.strictEqual(entries["buffer.txt"].mode, 420);
        assert.strictEqual(entries["buffer.txt"].crc32, 3893830384);
        assert.strictEqual(entries["buffer.txt"].size, 16384);
      });

      it("should append stream", () => {
        assert.ok(entries["stream.txt"]);
        assert.strictEqual(entries["stream.txt"].name, "stream.txt");
        assert.strictEqual(entries["stream.txt"].type, "file");
        assert.strictEqual(
          entries["stream.txt"].date,
          "2013-01-03T14:26:38.000Z",
        );
        assert.strictEqual(entries["stream.txt"].mode, 420);
        assert.strictEqual(entries["stream.txt"].crc32, 585446183);
        assert.strictEqual(entries["stream.txt"].size, 19);
      });

      it("should append stream-like source", () => {
        assert.ok(entries["stream-like.txt"]);
        assert.strictEqual(entries["stream-like.txt"].name, "stream-like.txt");
        assert.strictEqual(entries["stream-like.txt"].type, "file");
        assert.strictEqual(
          entries["stream-like.txt"].date,
          "2013-01-03T14:26:38.000Z",
        );
        assert.strictEqual(entries["stream-like.txt"].mode, 420);
        assert.strictEqual(entries["stream-like.txt"].crc32, 3632233996);
        assert.strictEqual(entries["stream-like.txt"].size, 4);
      });

      it("should append directory", () => {
        assert.ok(entries["directory/"]);
        assert.strictEqual(entries["directory/"].name, "directory/");
        assert.strictEqual(entries["directory/"].type, "directory");
        assert.strictEqual(
          entries["directory/"].date,
          "2013-01-03T14:26:38.000Z",
        );
        assert.strictEqual(entries["directory/"].mode, 493);
        assert.strictEqual(entries["directory/"].crc32, 0);
        assert.strictEqual(entries["directory/"].size, 0);
      });
    });

    describe("#directory", () => {
      let actual;
      let archive;
      const entries = {};

      before((done) => {
        archive = new JsonArchive();
        const testStream = createWriteStream("tmp/directory.json");
        testStream.on("close", () => {
          actual = readJSON("tmp/directory.json");
          actual.forEach((entry) => {
            entries[entry.name] = entry;
          });
          done();
        });
        archive.pipe(testStream);
        archive
          .directory("tests/fixtures/directory", null, { date: testDate })
          .directory("tests/fixtures/directory", "Win\\DS\\", {
            date: testDate,
          })
          .directory("tests/fixtures/directory", "directory", function (data) {
            if (data.name === "ignore.txt") {
              return false;
            }
            data.funcProp = true;
            return data;
          })
          .finalize();
      });

      it("should append multiple entries", () => {
        assert.ok(Array.isArray(actual));
        assert.ok(entries["tests/fixtures/directory/level0.txt"]);
        assert.ok(entries["tests/fixtures/directory/subdir/"]);
        assert.ok(entries["tests/fixtures/directory/subdir/level1.txt"]);
        assert.ok(entries["tests/fixtures/directory/subdir/subsub/"]);
        assert.ok(entries["tests/fixtures/directory/subdir/subsub/level2.txt"]);
        assert.strictEqual(
          entries["tests/fixtures/directory/level0.txt"].date,
          "2013-01-03T14:26:38.000Z",
        );
        assert.ok(entries["directory/level0.txt"]);
        assert.ok(entries["directory/subdir/"]);
      });

      it("should support setting data properties via function", () => {
        assert.strictEqual(entries["directory/level0.txt"].funcProp, true);
      });

      it("should support ignoring matches via function", () => {
        assert.strictEqual(entries["directory/ignore.txt"], undefined);
      });

      it("should find dot files", () => {
        assert.ok(entries["directory/.dotfile"]);
      });

      it("should retain symlinks", () => {
        assert.ok(entries["tests/fixtures/directory/subdir/level0link.txt"]);
        assert.ok(entries["directory/subdir/level0link.txt"]);
      });

      it("should handle windows path separators in prefix", () => {
        assert.ok(entries["Win/DS/level0.txt"]);
      });
    });

    describe("#file", () => {
      let actual;
      let archive;
      const entries = {};

      before((done) => {
        archive = new JsonArchive();
        const testStream = createWriteStream("tmp/file.json");
        testStream.on("close", () => {
          actual = readJSON("tmp/file.json");
          actual.forEach((entry) => {
            entries[entry.name] = entry;
          });
          done();
        });
        archive.pipe(testStream);
        archive
          .file("tests/fixtures/test.txt", { name: "test.txt", date: testDate })
          .file("tests/fixtures/test.txt")
          .file("tests/fixtures/executable.sh", { mode: win32 ? 511 : null })
          .finalize();
      });

      it("should append multiple entries", () => {
        assert.ok(Array.isArray(actual));
        assert.strictEqual(actual.length, 3);
      });

      it("should append filepath", () => {
        assert.ok(entries["test.txt"]);
        assert.strictEqual(entries["test.txt"].name, "test.txt");
        assert.strictEqual(
          entries["test.txt"].date,
          "2013-01-03T14:26:38.000Z",
        );
        assert.strictEqual(entries["test.txt"].crc32, 585446183);
        assert.strictEqual(entries["test.txt"].size, 19);
      });
    });

    describe("#glob", () => {
      let actual;
      let archive;
      const entries = {};

      before((done) => {
        archive = new JsonArchive();
        const testStream = createWriteStream("tmp/glob.json");
        testStream.on("close", () => {
          actual = readJSON("tmp/glob.json");
          actual.forEach((entry) => {
            entries[entry.name] = entry;
          });
          done();
        });
        archive.pipe(testStream);
        archive
          .glob("tests/fixtures/test.txt", null)
          .glob("tests/fixtures/empty.txt", null)
          .glob("tests/fixtures/executable.sh", null)
          .glob("tests/fixtures/directory/**/*", {
            ignore: "tests/fixtures/directory/subdir/**/*",
            nodir: true,
          })
          .glob("**/*", { cwd: "tests/fixtures/directory/subdir/" })
          .finalize();
      });

      it("should append multiple entries", () => {
        assert.ok(Array.isArray(actual));
        assert.ok(entries["tests/fixtures/test.txt"]);
        assert.ok(entries["level1.txt"]);
      });
    });

    describe("#promise", () => {
      it("should use a promise", (done) => {
        const archive = new JsonArchive();
        const testStream = createWriteStream("tmp/promise.json");
        archive.pipe(testStream);
        archive
          .append(testBuffer, { name: "buffer.txt", date: testDate })
          .finalize()
          .then(() => {
            done();
          });
      });
    });

    describe("#errors", () => {
      it("should allow continue on stat failing", (done) => {
        const archive = new JsonArchive();
        const testStream = createWriteStream("tmp/errors-stat.json");
        testStream.on("close", () => {
          done();
        });
        archive.pipe(testStream);
        archive
          .file("tests/fixtures/test.txt")
          .file("tests/fixtures/test-missing.txt")
          .finalize();
      });
    });
  });

  describe("#symlink", () => {
    let actual;
    const entries = {};

    before((done) => {
      const archive = new JsonArchive();
      const testStream = createWriteStream("tmp/symlink.json");
      testStream.on("close", () => {
        actual = readJSON("tmp/symlink.json");
        actual.forEach((entry) => {
          entries[entry.name] = entry;
        });
        done();
      });
      archive.pipe(testStream);
      archive
        .append("file-a", { name: "file-a" })
        .symlink("directory-a/symlink-to-file-a", "../file-a")
        .symlink(
          "directory-b/directory-c/symlink-to-directory-a",
          "../../directory-a",
          493,
        )
        .finalize();
    });

    it("should append multiple entries", () => {
      assert.ok(Array.isArray(actual));
      assert.ok(entries["file-a"]);
      assert.ok(entries["directory-a/symlink-to-file-a"]);
      assert.strictEqual(
        entries["directory-b/directory-c/symlink-to-directory-a"].mode,
        493,
      );
    });
  });
});
