import {
  WriteStream,
  chmodSync,
  createReadStream,
  createWriteStream,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { PassThrough } from "readable-stream";
import { Readable } from "readable-stream";
import { mkdirp } from "mkdirp";
import {
  binaryBuffer,
  readJSON,
  UnBufferedStream,
  WriteHashStream,
} from "./helpers/index.js";
import { JsonArchive } from "../src/index.js";

const testBuffer = binaryBuffer(1024 * 16);
const testDate = new Date("Jan 03 2013 14:26:38 GMT");
const testDate2 = new Date("Feb 10 2013 10:24:42 GMT");
const win32 = process.platform === "win32";

describe("archiver", () => {
  beforeAll(() => {
    mkdirp.sync("tmp");
    if (!win32) {
      chmodSync("tests/fixtures/executable.sh", 511); // 0777
      chmodSync("tests/fixtures/directory/subdir/", 493); // 0755
      symlinkSync(
        "tests/fixtures/directory/level0.txt",
        "tests/fixtures/directory/subdir/level0link.txt",
      );
      symlinkSync(
        "tests/fixtures/directory/subdir/subsub/",
        "tests/fixtures/directory/subdir/subsublink",
      );
    } else {
      writeFileSync(
        "tests/fixtures/directory/subdir/level0link.txt",
        "../level0.txt",
      );
      writeFileSync("tests/fixtures/directory/subdir/subsublink", "subsub");
    }
  });

  afterAll(() => {
    unlinkSync("tests/fixtures/directory/subdir/level0link.txt");
    unlinkSync("tests/fixtures/directory/subdir/subsublink");
  });

  describe("core", () => {
    const archive = new JsonArchive();

    describe("#_normalizeEntryData", () => {
      it("should support prefix of the entry name", () => {
        const prefix1 = archive._normalizeEntryData({
          name: "entry.txt",
          prefix: "prefix/",
        });
        expect(prefix1).toHaveProperty("name", "prefix/entry.txt");

        const prefix2 = archive._normalizeEntryData({
          name: "entry.txt",
          prefix: "",
        });
        expect(prefix2).toHaveProperty("name", "entry.txt");
      });

      it("should support special bits on unix", () => {
        if (!win32) {
          const mode = archive._normalizeEntryData({
            name: "executable.sh",
            mode: statSync("tests/fixtures/executable.sh").mode,
          });
          expect(mode).toHaveProperty("mode", 511);
        }
      });
    });
  });

  describe("api", () => {
    describe("#abort", () => {
      let archive;

      beforeAll((done) => {
        archive = new JsonArchive();
        const testStream = new WriteStream("tmp/abort.json");
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
        expect(archive).toHaveProperty("_state");
        expect(archive._state).toHaveProperty("aborted", true);
      });
    });

    describe("#append", () => {
      let actual;
      let archive;
      const entries = {};

      beforeAll((done) => {
        archive = new JsonArchive();
        const testStream = new WriteStream("tmp/append.json");
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
        expect(Array.isArray(actual)).toBe(true);
        expect(actual).toHaveLength(4);
      });

      it("should append buffer", () => {
        expect(entries).toHaveProperty(["buffer.txt"]);
        expect(entries["buffer.txt"]).toHaveProperty("name", "buffer.txt");
        expect(entries["buffer.txt"]).toHaveProperty("type", "file");
        expect(entries["buffer.txt"]).toHaveProperty("date", "2013-01-03T14:26:38.000Z");
        expect(entries["buffer.txt"]).toHaveProperty("mode", 420);
        expect(entries["buffer.txt"]).toHaveProperty("crc32", 3893830384);
        expect(entries["buffer.txt"]).toHaveProperty("size", 16384);
      });

      it("should append stream", () => {
        expect(entries).toHaveProperty(["stream.txt"]);
        expect(entries["stream.txt"]).toHaveProperty("name", "stream.txt");
        expect(entries["stream.txt"]).toHaveProperty("type", "file");
        expect(entries["stream.txt"]).toHaveProperty("date", "2013-01-03T14:26:38.000Z");
        expect(entries["stream.txt"]).toHaveProperty("mode", 420);
        expect(entries["stream.txt"]).toHaveProperty("crc32", 585446183);
        expect(entries["stream.txt"]).toHaveProperty("size", 19);
      });

      it("should append stream-like source", () => {
        expect(entries).toHaveProperty(["stream-like.txt"]);
        expect(entries["stream-like.txt"]).toHaveProperty("name", "stream-like.txt");
        expect(entries["stream-like.txt"]).toHaveProperty("type", "file");
        expect(entries["stream-like.txt"]).toHaveProperty("date", "2013-01-03T14:26:38.000Z");
        expect(entries["stream-like.txt"]).toHaveProperty("mode", 420);
        expect(entries["stream-like.txt"]).toHaveProperty("crc32", 3632233996);
        expect(entries["stream-like.txt"]).toHaveProperty("size", 4);
      });

      it("should append directory", () => {
        expect(entries).toHaveProperty("directory/");
        expect(entries["directory/"]).toHaveProperty("name", "directory/");
        expect(entries["directory/"]).toHaveProperty("type", "directory");
        expect(entries["directory/"]).toHaveProperty("date", "2013-01-03T14:26:38.000Z");
        expect(entries["directory/"]).toHaveProperty("mode", 493);
        expect(entries["directory/"]).toHaveProperty("crc32", 0);
        expect(entries["directory/"]).toHaveProperty("size", 0);
      });
    });

    describe("#directory", () => {
      let actual;
      let archive;
      const entries = {};

      beforeAll((done) => {
        archive = new JsonArchive();
        const testStream = new WriteStream("tmp/directory.json");
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
          .directory("tests/fixtures/directory", "Win\\DS\\", { date: testDate })
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
        expect(Array.isArray(actual)).toBe(true);
        expect(entries).toHaveProperty(["tests/fixtures/directory/level0.txt"]);
        expect(entries).toHaveProperty("tests/fixtures/directory/subdir/");
        expect(entries).toHaveProperty(["tests/fixtures/directory/subdir/level1.txt"]);
        expect(entries).toHaveProperty("tests/fixtures/directory/subdir/subsub/");
        expect(entries).toHaveProperty(["tests/fixtures/directory/subdir/subsub/level2.txt"]);
        expect(entries["tests/fixtures/directory/level0.txt"]).toHaveProperty("date", "2013-01-03T14:26:38.000Z");
        expect(entries["tests/fixtures/directory/subdir/"]).toHaveProperty("date", "2013-01-03T14:26:38.000Z");
        expect(entries).toHaveProperty(["directory/level0.txt"]);
        expect(entries).toHaveProperty("directory/subdir/");
        expect(entries).toHaveProperty(["directory/subdir/level1.txt"]);
        expect(entries).toHaveProperty("directory/subdir/subsub/");
        expect(entries).toHaveProperty(["directory/subdir/subsub/level2.txt"]);
      });

      it("should support setting data properties via function", () => {
        expect(entries).toHaveProperty(["directory/level0.txt"]);
        expect(entries["directory/level0.txt"]).toHaveProperty("funcProp", true);
      });

      it("should support ignoring matches via function", () => {
        expect(entries).not.toHaveProperty(["directory/ignore.txt"]);
      });

      it("should find dot files", () => {
        expect(entries).toHaveProperty(["directory/.dotfile"]);
      });

      it("should retain symlinks", () => {
        expect(entries).toHaveProperty(["tests/fixtures/directory/subdir/level0link.txt"]);
        expect(entries).toHaveProperty(["directory/subdir/level0link.txt"]);
      });

      it("should retain directory symlink", () => {
        expect(entries).toHaveProperty("tests/fixtures/directory/subdir/subsublink");
        expect(entries).toHaveProperty("directory/subdir/subsublink");
      });

      it("should handle windows path separators in prefix", () => {
        expect(entries).toHaveProperty(["Win/DS/level0.txt"]);
      });
    });

    describe("#file", () => {
      let actual;
      let archive;
      const entries = {};

      beforeAll((done) => {
        archive = new JsonArchive();
        const testStream = new WriteStream("tmp/file.json");
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
          .file("tests/fixtures/executable.sh", { mode: win32 ? 511 : null }) // 0777
          .finalize();
      });

      it("should append multiple entries", () => {
        expect(Array.isArray(actual)).toBe(true);
        expect(actual).toHaveLength(3);
      });

      it("should append filepath", () => {
        expect(entries).toHaveProperty(["test.txt"]);
        expect(entries["test.txt"]).toHaveProperty("name", "test.txt");
        expect(entries["test.txt"]).toHaveProperty("date", "2013-01-03T14:26:38.000Z");
        expect(entries["test.txt"]).toHaveProperty("crc32", 585446183);
        expect(entries["test.txt"]).toHaveProperty("size", 19);
      });

      it("should fallback to filepath when no name is set", () => {
        expect(entries).toHaveProperty(["tests/fixtures/test.txt"]);
      });

      it("should fallback to file stats when applicable", () => {
        expect(entries).toHaveProperty(["tests/fixtures/executable.sh"]);
        expect(entries["tests/fixtures/executable.sh"]).toHaveProperty("name", "tests/fixtures/executable.sh");
        expect(entries["tests/fixtures/executable.sh"]).toHaveProperty("mode", 511);
        expect(entries["tests/fixtures/executable.sh"]).toHaveProperty("crc32", 3957348457);
        expect(entries["tests/fixtures/executable.sh"]).toHaveProperty("size", 11);
      });
    });

    describe("#glob", () => {
      let actual;
      let archive;
      const entries = {};

      beforeAll((done) => {
        archive = new JsonArchive();
        const testStream = new WriteStream("tmp/glob.json");
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
        expect(Array.isArray(actual)).toBe(true);
        expect(entries).toHaveProperty(["tests/fixtures/test.txt"]);
        expect(entries).toHaveProperty(["tests/fixtures/executable.sh"]);
        expect(entries).toHaveProperty(["tests/fixtures/empty.txt"]);
        expect(entries).toHaveProperty(["tests/fixtures/directory/level0.txt"]);
        expect(entries).toHaveProperty(["level1.txt"]);
        expect(entries).toHaveProperty(["subsub/level2.txt"]);
      });
    });

    describe("#promise", () => {
      it("should use a promise", (done) => {
        const archive = new JsonArchive();
        const testStream = new WriteStream("tmp/promise.json");
        archive.pipe(testStream);
        archive
          .append(testBuffer, { name: "buffer.txt", date: testDate })
          .append(createReadStream("tests/fixtures/test.txt"), {
            name: "stream.txt",
            date: testDate,
          })
          .append(null, { name: "directory/", date: testDate })
          .finalize()
          .then(() => {
            done();
          });
      });
    });

    describe("#errors", () => {
      it("should allow continue on stat failing", (done) => {
        const archive = new JsonArchive();
        const testStream = new WriteStream("tmp/errors-stat.json");
        testStream.on("close", () => {
          done();
        });
        archive.pipe(testStream);
        archive
          .file("tests/fixtures/test.txt")
          .file("tests/fixtures/test-missing.txt")
          .file("tests/fixtures/empty.txt")
          .finalize();
      });

      it("should allow continue on with several stat failings", (done) => {
        const archive = new JsonArchive();
        const testStream = new WriteStream("tmp/errors-stat.json");
        testStream.on("close", () => {
          done();
        });
        archive.pipe(testStream);
        archive.file("tests/fixtures/test.txt");
        for (let i = 1; i <= 20; i++) {
          archive.file("tests/fixtures/test-missing.txt");
        }
        archive.finalize();
      });
    });
  });

  describe("#symlink", () => {
    let actual;
    let archive;
    const entries = {};

    beforeAll((done) => {
      archive = new JsonArchive();
      const testStream = new WriteStream("tmp/symlink.json");
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
      expect(Array.isArray(actual)).toBe(true);
      expect(entries).toHaveProperty("file-a");
      expect(entries).toHaveProperty("directory-a/symlink-to-file-a");
      expect(entries).toHaveProperty("directory-b/directory-c/symlink-to-directory-a");
      expect(entries["directory-b/directory-c/symlink-to-directory-a"]).toHaveProperty("mode", 493);
    });
  });
});
