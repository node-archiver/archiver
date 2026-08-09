import assert from "node:assert/strict";
import {
  chmodSync,
  createReadStream,
  symlinkSync,
  unlinkSync,
  writeFileSync,
  createWriteStream,
  mkdirSync,
} from "node:fs";
import { describe, it, before, after } from "node:test";

import * as tar from "tar";
import yauzl from "yauzl";

import { TarArchive, ZipArchive } from "../src/index.ts";
import { binaryBuffer } from "./helpers/index.ts";

const testBuffer = binaryBuffer(1024 * 16);
const testDate = new Date("Jan 03 2013 14:26:38 GMT");
const win32 = process.platform === "win32";

describe("plugins", () => {
  before(() => {
    mkdirSync("tmp", { recursive: true });
    if (!win32) {
      chmodSync("tests/fixtures/executable.sh", 511); // 0777
      chmodSync("tests/fixtures/directory/subdir/", 493); // 0755
      symlinkSync(
        "../level0.txt",
        "tests/fixtures/directory/subdir/level0link.txt",
      );
      symlinkSync("subsub/", "tests/fixtures/directory/subdir/subsublink");
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

  describe("tar", () => {
    const actual = [];
    let archive: TarArchive;
    const entries = {};

    before(async () => {
      archive = new TarArchive();
      await new Promise<void>((resolve) => {
        const testStream = new tar.Parser();

        testStream.on("entry", (entry) => {
          actual.push(entry.path);
          entries[entry.path] = {
            type: entry.type,
            path: entry.path,
            mode: entry.mode,
            uid: entry.uid,
            gid: entry.gid,
            uname: entry.uname,
            gname: entry.gname,
            size: entry.size,
            mtime: entry.mtime,
            atime: entry.atime,
            ctime: entry.ctime,
            linkpath: entry.linkpath,
          };
          entry.resume();
        });

        testStream.on("end", () => {
          resolve();
        });

        archive.pipe(testStream);
        archive
          .append(testBuffer, { name: "buffer.txt", date: testDate })
          .append(createReadStream("tests/fixtures/test.txt"), {
            name: "stream.txt",
            date: testDate,
          })
          .append(null, { name: "folder/", date: testDate })
          .directory("tests/fixtures/directory", "directory")
          .symlink("manual-link.txt", "manual-link-target.txt")
          .finalize();
      });
    });

    it("should append multiple entries", () => {
      assert.ok(Array.isArray(actual));
      assert.ok(actual.length > 10);
    });

    it("should append buffer", () => {
      assert.ok("buffer.txt" in entries);
      assert.strictEqual(entries["buffer.txt"].path, "buffer.txt");
      assert.strictEqual(entries["buffer.txt"].type, "File");
      assert.strictEqual(entries["buffer.txt"].mode, 420);
      assert.strictEqual(entries["buffer.txt"].size, 16384);
    });

    it("should append stream", () => {
      assert.ok("stream.txt" in entries);
      assert.strictEqual(entries["stream.txt"].path, "stream.txt");
      assert.strictEqual(entries["stream.txt"].type, "File");
      assert.strictEqual(entries["stream.txt"].mode, 420);
      assert.strictEqual(entries["stream.txt"].size, 19);
    });

    it("should append folder", () => {
      assert.ok("folder/" in entries);
      assert.strictEqual(entries["folder/"].path, "folder/");
      assert.strictEqual(entries["folder/"].type, "Directory");
      assert.strictEqual(entries["folder/"].mode, 493);
      assert.strictEqual(entries["folder/"].size, 0);
    });

    it("should append manual symlink", () => {
      assert.ok("manual-link.txt" in entries);
      assert.strictEqual(entries["manual-link.txt"].type, "SymbolicLink");
      assert.strictEqual(
        entries["manual-link.txt"].linkpath,
        "manual-link-target.txt",
      );
    });

    it("should append via directory", () => {
      assert.ok("directory/subdir/level1.txt" in entries);
      assert.ok("directory/subdir/level0link.txt" in entries);
    });

    it("should retain symlinks via directory", () => {
      if (win32) {
        return;
      }
      assert.ok("directory/subdir/level0link.txt" in entries);
      assert.strictEqual(
        entries["directory/subdir/level0link.txt"].type,
        "SymbolicLink",
      );
      assert.strictEqual(
        entries["directory/subdir/level0link.txt"].linkpath,
        "../level0.txt",
      );
      assert.ok("directory/subdir/subsublink" in entries);
      assert.strictEqual(
        entries["directory/subdir/subsublink"].type,
        "SymbolicLink",
      );
      assert.strictEqual(
        entries["directory/subdir/subsublink"].linkpath,
        "subsub",
      );
    });
  });

  describe("zip", () => {
    const actual = [];
    let archive: ZipArchive;
    const entries = {};
    let zipComment = "";

    before(async () => {
      archive = new ZipArchive({ comment: "archive comment" });
      await new Promise<void>((resolve) => {
        const testStream = createWriteStream("tmp/plugin.zip");

        testStream.on("close", () => {
          yauzl.open("tmp/plugin.zip", (err, zip) => {
            if (err) throw err;
            zip.on("entry", (entry) => {
              actual.push(entry.fileName);
              entries[entry.fileName] = entry;
            });
            zip.on("close", () => {
              zipComment = zip.comment || "";
              resolve();
            });
          });
        });

        archive.pipe(testStream);
        archive
          .append(testBuffer, {
            name: "buffer.txt",
            date: testDate,
            comment: "entry comment",
          })
          .append(createReadStream("tests/fixtures/test.txt"), {
            name: "stream.txt",
            date: testDate,
          })
          .file("tests/fixtures/executable.sh", {
            name: "executable.sh",
            mode: win32 ? 511 : null, // 0777
          })
          .directory("tests/fixtures/directory", "directory")
          .symlink("manual-link.txt", "manual-link-target.txt")
          .finalize();
      });
    });

    it("should append multiple entries", () => {
      assert.ok(Array.isArray(actual));
      assert.ok(actual.length > 10);
    });

    it("should append buffer", () => {
      assert.ok("buffer.txt" in entries);
      assert.strictEqual(entries["buffer.txt"].uncompressedSize, 16384);
      assert.strictEqual(entries["buffer.txt"].crc32, 3893830384);
    });

    it("should append stream", () => {
      assert.ok("stream.txt" in entries);
      assert.strictEqual(entries["stream.txt"].uncompressedSize, 19);
      assert.strictEqual(entries["stream.txt"].crc32, 585446183);
    });

    it("should append via file", () => {
      assert.ok("executable.sh" in entries);
      assert.strictEqual(entries["executable.sh"].uncompressedSize, 11);
      assert.strictEqual(entries["executable.sh"].crc32, 3957348457);
    });

    it("should append via directory", () => {
      assert.ok("directory/subdir/level1.txt" in entries);
      assert.strictEqual(
        entries["directory/subdir/level1.txt"].uncompressedSize,
        6,
      );
      assert.strictEqual(
        entries["directory/subdir/level1.txt"].crc32,
        133711013,
      );
    });

    it("should append manual symlink", () => {
      assert.ok("manual-link.txt" in entries);
      assert.strictEqual(entries["manual-link.txt"].crc32, 1121667014);
      assert.strictEqual(
        entries["manual-link.txt"].externalFileAttributes,
        2684354592,
      );
    });

    it("should allow for custom unix mode", () => {
      assert.ok("executable.sh" in entries);
      assert.strictEqual(
        entries["executable.sh"].externalFileAttributes,
        2180972576,
      );
      assert.strictEqual(
        (entries["executable.sh"].externalFileAttributes >>> 16) & 0xfff,
        511,
      );

      assert.ok("directory/subdir/" in entries);
      assert.strictEqual(
        entries["directory/subdir/"].externalFileAttributes,
        1106051088,
      );
      assert.strictEqual(
        (entries["directory/subdir/"].externalFileAttributes >>> 16) & 0xfff,
        493,
      );
    });

    it("should allow for entry comments", () => {
      assert.ok("buffer.txt" in entries);
      assert.strictEqual(entries["buffer.txt"].fileComment, "entry comment");
    });

    it("should allow for archive comment", () => {
      assert.strictEqual(zipComment, "archive comment");
    });
  });
});
