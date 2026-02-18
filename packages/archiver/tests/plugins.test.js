import {
  chmodSync,
  createReadStream,
  symlinkSync,
  unlinkSync,
  writeFileSync,
  WriteStream,
} from "fs";
import { mkdirp } from "mkdirp";
import tar from "tar";
import yauzl from "yauzl";
import { TarArchive, ZipArchive } from "../src/index.js";
import { binaryBuffer } from "./helpers/index.js";
import { describe, expect, it, beforeAll, afterAll } from "bun:test";

const testBuffer = binaryBuffer(1024 * 16);
const testDate = new Date("Jan 03 2013 14:26:38 GMT");
const win32 = process.platform === "win32";

describe("plugins", () => {
  beforeAll(() => {
    mkdirp.sync("tmp");
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

  afterAll(() => {
    unlinkSync("tests/fixtures/directory/subdir/level0link.txt");
    unlinkSync("tests/fixtures/directory/subdir/subsublink");
  });

  describe("tar", () => {
    let actual = [];
    let archive;
    const entries = {};

    beforeAll((done) => {
      archive = new TarArchive();
      const testStream = new tar.Parse();

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
        done();
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

    it("should append multiple entries", () => {
      expect(Array.isArray(actual)).toBe(true);
      expect(actual.length).toBeGreaterThan(10);
    });

    it("should append buffer", () => {
      expect(entries).toHaveProperty(["buffer.txt"]);
      expect(entries["buffer.txt"]).toHaveProperty("path", "buffer.txt");
      expect(entries["buffer.txt"]).toHaveProperty("type", "File");
      expect(entries["buffer.txt"]).toHaveProperty("mode", 420);
      expect(entries["buffer.txt"]).toHaveProperty("size", 16384);
    });

    it("should append stream", () => {
      expect(entries).toHaveProperty(["stream.txt"]);
      expect(entries["stream.txt"]).toHaveProperty("path", "stream.txt");
      expect(entries["stream.txt"]).toHaveProperty("type", "File");
      expect(entries["stream.txt"]).toHaveProperty("mode", 420);
      expect(entries["stream.txt"]).toHaveProperty("size", 19);
    });

    it("should append folder", () => {
      expect(entries).toHaveProperty("folder/");
      expect(entries["folder/"]).toHaveProperty("path", "folder/");
      expect(entries["folder/"]).toHaveProperty("type", "Directory");
      expect(entries["folder/"]).toHaveProperty("mode", 493);
      expect(entries["folder/"]).toHaveProperty("size", 0);
    });

    it("should append manual symlink", () => {
      expect(entries).toHaveProperty(["manual-link.txt"]);
      expect(entries["manual-link.txt"]).toHaveProperty("type", "SymbolicLink");
      expect(entries["manual-link.txt"]).toHaveProperty(
        "linkpath",
        "manual-link-target.txt",
      );
    });

    it("should append via directory", () => {
      expect(entries).toHaveProperty(["directory/subdir/level1.txt"]);
      expect(entries).toHaveProperty(["directory/subdir/level0link.txt"]);
    });

    it("should retain symlinks via directory", () => {
      if (win32) {
        return;
      }
      expect(entries).toHaveProperty("directory/subdir/level0link.txt");
      expect(entries["directory/subdir/level0link.txt"]).toHaveProperty(
        "type",
        "SymbolicLink",
      );
      expect(entries["directory/subdir/level0link.txt"]).toHaveProperty(
        "linkpath",
        "../level0.txt",
      );
      expect(entries).toHaveProperty("directory/subdir/subsublink");
      expect(entries["directory/subdir/subsublink"]).toHaveProperty(
        "type",
        "SymbolicLink",
      );
      expect(entries["directory/subdir/subsublink"]).toHaveProperty(
        "linkpath",
        "subsub",
      );
    });
  });

  describe("zip", () => {
    let actual = [];
    let archive;
    const entries = {};
    let zipComment = "";

    beforeAll((done) => {
      archive = new ZipArchive({ comment: "archive comment" });
      const testStream = new WriteStream("tmp/plugin.zip");

      testStream.on("close", () => {
        yauzl.open("tmp/plugin.zip", (err, zip) => {
          if (err) throw err;
          zip.on("entry", (entry) => {
            actual.push(entry.fileName);
            entries[entry.fileName] = entry;
          });
          zip.on("close", () => {
            zipComment = zip.comment || "";
            done();
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

    it("should append multiple entries", () => {
      expect(Array.isArray(actual)).toBe(true);
      expect(actual.length).toBeGreaterThan(10);
    });

    it("should append buffer", () => {
      expect(entries).toHaveProperty(["buffer.txt"]);
      expect(entries["buffer.txt"]).toHaveProperty("uncompressedSize", 16384);
      expect(entries["buffer.txt"]).toHaveProperty("crc32", 3893830384);
    });

    it("should append stream", () => {
      expect(entries).toHaveProperty(["stream.txt"]);
      expect(entries["stream.txt"]).toHaveProperty("uncompressedSize", 19);
      expect(entries["stream.txt"]).toHaveProperty("crc32", 585446183);
    });

    it("should append via file", () => {
      expect(entries).toHaveProperty(["executable.sh"]);
      expect(entries["executable.sh"]).toHaveProperty("uncompressedSize", 11);
      expect(entries["executable.sh"]).toHaveProperty("crc32", 3957348457);
    });

    it("should append via directory", () => {
      expect(entries).toHaveProperty(["directory/subdir/level1.txt"]);
      expect(entries["directory/subdir/level1.txt"]).toHaveProperty(
        "uncompressedSize",
        6,
      );
      expect(entries["directory/subdir/level1.txt"]).toHaveProperty(
        "crc32",
        133711013,
      );
    });

    it("should append manual symlink", () => {
      expect(entries).toHaveProperty(["manual-link.txt"]);
      expect(entries["manual-link.txt"]).toHaveProperty("crc32", 1121667014);
      expect(entries["manual-link.txt"]).toHaveProperty(
        "externalFileAttributes",
        2684354592,
      );
    });

    it("should allow for custom unix mode", () => {
      expect(entries).toHaveProperty(["executable.sh"]);
      expect(entries["executable.sh"]).toHaveProperty(
        "externalFileAttributes",
        2180972576,
      );
      expect(
        (entries["executable.sh"].externalFileAttributes >>> 16) & 0xfff,
      ).toBe(511);

      expect(entries).toHaveProperty("directory/subdir/");
      expect(entries["directory/subdir/"]).toHaveProperty(
        "externalFileAttributes",
        1106051088,
      );
      expect(
        (entries["directory/subdir/"].externalFileAttributes >>> 16) & 0xfff,
      ).toBe(493);
    });

    it("should allow for entry comments", () => {
      expect(entries).toHaveProperty(["buffer.txt"]);
      expect(entries["buffer.txt"]).toHaveProperty(
        "fileComment",
        "entry comment",
      );
    });

    it("should allow for archive comment", () => {
      expect(zipComment).toBe("archive comment");
    });
  });
});
