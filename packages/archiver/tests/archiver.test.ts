import assert from "node:assert/strict";
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
import { describe, it, before, after } from "node:test";

import { normalizeEntryData } from "../src/lib/core.ts";
import { binaryBuffer, readJSON } from "./helpers/index.ts";
import { JsonArchive } from "./helpers/json-archive.ts";

const testBuffer = binaryBuffer(1024 * 16);
const testDate = new Date("Jan 03 2013 14:26:38 GMT");
const win32 = process.platform === "win32";

describe("archiver", () => {
  before(() => {
    mkdirSync("tmp", { recursive: true });
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

  after(() => {
    unlinkSync("tests/fixtures/directory/subdir/level0link.txt");
    unlinkSync("tests/fixtures/directory/subdir/subsublink");
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

      before(async () => {
        archive = new JsonArchive();
        await new Promise<void>((resolve) => {
          const testStream = createWriteStream("tmp/abort.json");
          testStream.on("close", () => {
            resolve();
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
      });

      it("should have a state of aborted", () => {
        assert.ok("_state" in archive);
        assert.strictEqual(archive._state.aborted, true);
      });
    });

    describe("#append", () => {
      let actual;
      let archive: JsonArchive;
      const entries = {};

      before(async () => {
        archive = new JsonArchive();
        await new Promise<void>((resolve) => {
          const testStream = createWriteStream("tmp/append.json");
          testStream.on("close", () => {
            actual = readJSON("tmp/append.json");
            actual.forEach((entry) => {
              entries[entry.name] = entry;
            });
            resolve();
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
      });

      it("should append multiple entries", () => {
        assert.ok(Array.isArray(actual));
        assert.strictEqual(actual.length, 4);
      });

      it("should append buffer", () => {
        assert.ok("buffer.txt" in entries);
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
        assert.ok("stream.txt" in entries);
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
        assert.ok("stream-like.txt" in entries);
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
        assert.ok("directory/" in entries);
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
      let archive: JsonArchive;
      const entries = {};

      before(async () => {
        archive = new JsonArchive();
        await new Promise<void>((resolve) => {
          const testStream = createWriteStream("tmp/directory.json");
          testStream.on("close", () => {
            actual = readJSON("tmp/directory.json");
            actual.forEach((entry) => {
              entries[entry.name] = entry;
            });
            resolve();
          });
          archive.pipe(testStream);
          archive
            .directory("tests/fixtures/directory", null, { date: testDate })
            .directory("tests/fixtures/directory", "Win\\DS\\", {
              date: testDate,
            })
            .directory(
              "tests/fixtures/directory",
              "directory",
              function (data) {
                if (data.name === "ignore.txt") {
                  return false;
                }
                data.funcProp = true;
                return data;
              },
            )
            .finalize();
        });
      });

      it(
        "should finalize when a directory contains an unsupported symlink",
        { timeout: 1_000 },
        async (t) => {
          if (win32) {
            t.skip("the directory fixture contains no symlinks on Windows");
            return;
          }

          const archive = new JsonArchive();
          const warnings: Error[] = [];

          archive._supportsSymlink = false;
          archive.on("warning", (warning: Error) => {
            warnings.push(warning);
          });

          archive.pipe(
            createWriteStream("tmp/directory-unsupported-symlink.json"),
          );
          archive.directory("tests/fixtures/directory", false);

          await archive.finalize();

          assert.ok(
            warnings.some(
              (warning) =>
                warning.message ===
                "support for symlink entries not defined by module",
            ),
          );
        },
      );

      it("should append multiple entries", () => {
        assert.ok(Array.isArray(actual));
        assert.ok("tests/fixtures/directory/level0.txt" in entries);
        assert.ok("tests/fixtures/directory/subdir/" in entries);
        assert.ok("tests/fixtures/directory/subdir/level1.txt" in entries);
        assert.ok("tests/fixtures/directory/subdir/subsub/" in entries);
        assert.ok(
          "tests/fixtures/directory/subdir/subsub/level2.txt" in entries,
        );
        assert.strictEqual(
          entries["tests/fixtures/directory/level0.txt"].date,
          "2013-01-03T14:26:38.000Z",
        );
        assert.strictEqual(
          entries["tests/fixtures/directory/subdir/"].date,
          "2013-01-03T14:26:38.000Z",
        );
        assert.ok("directory/level0.txt" in entries);
        assert.ok("directory/subdir/" in entries);
        assert.ok("directory/subdir/level1.txt" in entries);
        assert.ok("directory/subdir/subsub/" in entries);
        assert.ok("directory/subdir/subsub/level2.txt" in entries);
      });

      it("should support setting data properties via function", () => {
        assert.ok("directory/level0.txt" in entries);
        assert.strictEqual(entries["directory/level0.txt"].funcProp, true);
      });

      it("should support ignoring matches via function", () => {
        assert.ok(!("directory/ignore.txt" in entries));
      });

      it("should find dot files", () => {
        assert.ok("directory/.dotfile" in entries);
      });

      it("should retain symlinks", () => {
        assert.ok("tests/fixtures/directory/subdir/level0link.txt" in entries);
        assert.ok("directory/subdir/level0link.txt" in entries);
      });

      it("should retain directory symlink", () => {
        assert.ok("tests/fixtures/directory/subdir/subsublink" in entries);
        assert.ok("directory/subdir/subsublink" in entries);
      });

      it("should handle windows path separators in prefix", () => {
        assert.ok("Win/DS/level0.txt" in entries);
      });
    });

    describe("#file", () => {
      let actual;
      let archive;
      const entries = {};

      before(async () => {
        archive = new JsonArchive();
        await new Promise<void>((resolve) => {
          const testStream = createWriteStream("tmp/file.json");
          testStream.on("close", () => {
            actual = readJSON("tmp/file.json");
            actual.forEach((entry) => {
              entries[entry.name] = entry;
            });
            resolve();
          });
          archive.pipe(testStream);
          archive
            .file("tests/fixtures/test.txt", {
              name: "test.txt",
              date: testDate,
            })
            .file("tests/fixtures/test.txt")
            .file("tests/fixtures/executable.sh", { mode: win32 ? 511 : null }) // 0777
            .finalize();
        });
      });

      it("should append multiple entries", () => {
        assert.ok(Array.isArray(actual));
        assert.strictEqual(actual.length, 3);
      });

      it("should append filepath", () => {
        assert.ok("test.txt" in entries);
        assert.strictEqual(entries["test.txt"].name, "test.txt");
        assert.strictEqual(
          entries["test.txt"].date,
          "2013-01-03T14:26:38.000Z",
        );
        assert.strictEqual(entries["test.txt"].crc32, 585446183);
        assert.strictEqual(entries["test.txt"].size, 19);
      });

      it("should fallback to filepath when no name is set", () => {
        assert.ok("tests/fixtures/test.txt" in entries);
      });

      it("should fallback to file stats when applicable", () => {
        assert.ok("tests/fixtures/executable.sh" in entries);
        assert.strictEqual(
          entries["tests/fixtures/executable.sh"].name,
          "tests/fixtures/executable.sh",
        );
        assert.strictEqual(entries["tests/fixtures/executable.sh"].mode, 511);
        assert.strictEqual(
          entries["tests/fixtures/executable.sh"].crc32,
          3957348457,
        );
        assert.strictEqual(entries["tests/fixtures/executable.sh"].size, 11);
      });
    });

    describe("#promise", () => {
      it("should use a promise", async () => {
        const archive = new JsonArchive();
        const testStream = createWriteStream("tmp/promise.json");
        archive.pipe(testStream);
        archive
          .append(testBuffer, { name: "buffer.txt", date: testDate })
          .append(createReadStream("tests/fixtures/test.txt"), {
            name: "stream.txt",
            date: testDate,
          })
          .append(null, { name: "directory/", date: testDate });
        await archive.finalize();
      });
    });

    describe("#errors", () => {
      it("should allow continue on stat failing", async () => {
        const archive = new JsonArchive();
        await new Promise<void>((resolve) => {
          const testStream = createWriteStream("tmp/errors-stat.json");
          testStream.on("close", () => {
            resolve();
          });
          archive.pipe(testStream);
          archive
            .file("tests/fixtures/test.txt")
            .file("tests/fixtures/test-missing.txt")
            .file("tests/fixtures/empty.txt")
            .finalize();
        });
      });

      it("should allow continue on with several stat failings", async () => {
        const archive = new JsonArchive();
        await new Promise<void>((resolve) => {
          const testStream = createWriteStream("tmp/errors-stat.json");
          testStream.on("close", () => {
            resolve();
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
  });

  describe("#symlink", () => {
    let actual;
    let archive: JsonArchive;
    const entries = {};

    before(async () => {
      archive = new JsonArchive();
      await new Promise<void>((resolve) => {
        const testStream = createWriteStream("tmp/symlink.json");
        testStream.on("close", () => {
          actual = readJSON("tmp/symlink.json");
          actual.forEach((entry) => {
            entries[entry.name] = entry;
          });
          resolve();
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
    });

    it("should append multiple entries", () => {
      assert.ok(Array.isArray(actual));
      assert.ok("file-a" in entries);
      assert.ok("directory-a/symlink-to-file-a" in entries);
      assert.ok("directory-b/directory-c/symlink-to-directory-a" in entries);
      assert.strictEqual(
        entries["directory-b/directory-c/symlink-to-directory-a"].mode,
        493,
      );
    });
  });
});
