import { test, describe, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

import * as tar from "@archiver/tar-fs";
import * as tarStream from "@archiver/tar-stream";

const win32 = process.platform === "win32";

function mtime(st: fs.Stats) {
  return Math.floor(st.mtime.getTime() / 1000);
}

describe("tar-fs", () => {
  test("copy a -> copy/a", function () {
    const a = path.join(__dirname, "fixtures", "a");
    const b = path.join(__dirname, "fixtures", "copy", "a");

    fs.rmSync(b, { recursive: true, force: true });
    tar
      .pack(a)
      .pipe(tar.extract(b))
      .on("finish", function () {
        const files = fs.readdirSync(b);
        expect(files.length).toBe(1);
        expect(files[0]).toBe("hello.txt");
        const fileB = path.join(b, files[0]);
        const fileA = path.join(a, files[0]);
        expect(fs.readFileSync(fileB, "utf-8")).toEqual(
          fs.readFileSync(fileA, "utf-8"),
        );
        expect(fs.statSync(fileB).mode).toEqual(fs.statSync(fileA).mode);
        expect(mtime(fs.statSync(fileB))).toEqual(mtime(fs.statSync(fileA)));
      });
  });

  test("copy b -> copy/b", function () {
    const a = path.join(__dirname, "fixtures", "b");
    const b = path.join(__dirname, "fixtures", "copy", "b");

    fs.rmSync(b, { recursive: true, force: true });
    tar
      .pack(a)
      .pipe(tar.extract(b))
      .on("finish", function () {
        const files = fs.readdirSync(b);
        expect(files.length).toBe(1);
        expect(files[0]).toBe("a");
        const dirB = path.join(b, files[0]);
        const dirA = path.join(a, files[0]);
        expect(fs.statSync(dirB).mode).toEqual(fs.statSync(dirA).mode);
        expect(mtime(fs.statSync(dirB))).toEqual(mtime(fs.statSync(dirA)));
        expect(fs.statSync(dirB).isDirectory()).toBeTrue();
        const fileB = path.join(dirB, "test.txt");
        const fileA = path.join(dirA, "test.txt");
        expect(fs.readFileSync(fileB, "utf-8")).toEqual(
          fs.readFileSync(fileA, "utf-8"),
        );
        expect(fs.statSync(fileB).mode).toEqual(fs.statSync(fileA).mode);
        expect(mtime(fs.statSync(fileB))).toEqual(mtime(fs.statSync(fileA)));
      });
  });

  test.skipIf(win32)("symlink", function () {
    const a = path.join(__dirname, "fixtures", "c");

    fs.rmSync(path.join(a, "link"), { recursive: true, force: true });
    fs.symlinkSync(".gitignore", path.join(a, "link"));

    const b = path.join(__dirname, "fixtures", "copy", "c");

    fs.rmSync(b, { recursive: true, force: true });
    tar
      .pack(a)
      .pipe(tar.extract(b))
      .on("finish", function () {
        const files = fs.readdirSync(b).sort();
        expect(files.length).toBe(2);
        expect(files[0]).toBe(".gitignore");
        expect(files[1]).toBe("link");

        const linkA = path.join(a, "link");
        const linkB = path.join(b, "link");

        expect(mtime(fs.lstatSync(linkB))).toEqual(mtime(fs.lstatSync(linkA)));
        expect(fs.readlinkSync(linkB)).toEqual(fs.readlinkSync(linkA));
      });
  });

  test.skipIf(win32)("follow symlinks", function () {
    const a = path.join(__dirname, "fixtures", "c");

    fs.rmSync(path.join(a, "link"), { recursive: true, force: true });
    fs.symlinkSync(".gitignore", path.join(a, "link"));

    const b = path.join(__dirname, "fixtures", "copy", "c-dereference");

    fs.rmSync(b, { recursive: true, force: true });
    tar
      .pack(a, { dereference: true })
      .pipe(tar.extract(b))
      .on("finish", function () {
        const files = fs.readdirSync(b).sort();
        expect(files.length).toBe(2);
        expect(files[0]).toBe(".gitignore");
        expect(files[1]).toBe("link");

        const file1 = path.join(b, ".gitignore");
        const file2 = path.join(b, "link");

        expect(mtime(fs.lstatSync(file1))).toEqual(mtime(fs.lstatSync(file2)));
        expect(fs.readFileSync(file1)).toEqual(fs.readFileSync(file2));
      });
  });

  test("strip", function () {
    const a = path.join(__dirname, "fixtures", "b");
    const b = path.join(__dirname, "fixtures", "copy", "b-strip");

    fs.rmSync(b, { recursive: true, force: true });

    tar
      .pack(a)
      .pipe(tar.extract(b, { strip: 1 }))
      .on("finish", function () {
        const files = fs.readdirSync(b).sort();
        expect(files.length).toBe(1);
        expect(files[0]).toBe("test.txt");
      });
  });

  test("strip + map", function () {
    const a = path.join(__dirname, "fixtures", "b");
    const b = path.join(__dirname, "fixtures", "copy", "b-strip");

    fs.rmSync(b, { recursive: true, force: true });

    const uppercase = function (header) {
      header.name = header.name.toUpperCase();
      return header;
    };

    tar
      .pack(a)
      .pipe(tar.extract(b, { strip: 1, map: uppercase }))
      .on("finish", function () {
        const files = fs.readdirSync(b).sort();
        expect(files.length).toBe(1);
        expect(files[0]).toBe("TEST.TXT");
      });
  });

  test("map + dir + permissions", function () {
    const a = path.join(__dirname, "fixtures", "b");
    const b = path.join(__dirname, "fixtures", "copy", "a-perms");

    fs.rmSync(b, { recursive: true, force: true });

    const aWithMode = function (header) {
      if (header.name === "a") {
        header.mode = 0o700;
      }
      return header;
    };

    tar
      .pack(a)
      .pipe(tar.extract(b, { map: aWithMode }))
      .on("finish", function () {
        const files = fs.readdirSync(b).sort();
        const stat = fs.statSync(path.join(b, "a"));
        expect(files.length).toBe(1);
        if (!win32) {
          expect(stat.mode & 0o777).toBe(0o700);
        }
      });
  });

  test("specific entries", function () {
    const a = path.join(__dirname, "fixtures", "d");
    const b = path.join(__dirname, "fixtures", "copy", "d-entries");

    const entries = ["file1", "sub-files/file3", "sub-dir"];

    fs.rmSync(b, { recursive: true, force: true });
    tar
      .pack(a, { entries })
      .pipe(tar.extract(b))
      .on("finish", function () {
        const files = fs.readdirSync(b);
        expect(files.length).toBe(3);
        expect(files.indexOf("file1")).not.toBe(-1);
        expect(files.indexOf("sub-files")).not.toBe(-1);
        expect(files.indexOf("sub-dir")).not.toBe(-1);
        const subFiles = fs.readdirSync(path.join(b, "sub-files"));
        expect(subFiles).toEqual(["file3"]);
        const subDir = fs.readdirSync(path.join(b, "sub-dir"));
        expect(subDir).toEqual(["file5"]);
      });
  });

  test("check type while mapping header on packing", function () {
    const e = path.join(__dirname, "fixtures", "e");

    const checkHeaderType = function (header) {
      if (header.name.indexOf(".") === -1)
        expect(header.type).toBe(header.name);
    };

    tar.pack(e, { map: checkHeaderType });
  });

  test("finish callbacks", function (done) {
    const a = path.join(__dirname, "fixtures", "a");
    const b = path.join(__dirname, "fixtures", "copy", "a");

    fs.rmSync(b, { recursive: true, force: true });

    let packEntries = 0;
    let extractEntries = 0;

    const countPackEntry = function () {
      packEntries++;
    };
    const countExtractEntry = function () {
      extractEntries++;
    };

    const onPackFinish = function (passedPack) {
      expect(packEntries).toBe(2); // 2 entries - the file and base directory
      expect(passedPack).toBe(pack);
    };

    const onExtractFinish = function () {
      expect(extractEntries).toBe(2);
    };

    const pack = tar.pack(a, { map: countPackEntry, finish: onPackFinish });

    pack
      .pipe(tar.extract(b, { map: countExtractEntry, finish: onExtractFinish }))
      .on("finish", function () {
        done();
      });
  });

  test("not finalizing the pack", function () {
    const a = path.join(__dirname, "fixtures", "a");
    const b = path.join(__dirname, "fixtures", "b");

    const out = path.join(__dirname, "fixtures", "copy", "merged-packs");

    fs.rmSync(out, { recursive: true, force: true });

    const prefixer = function (prefix) {
      return function (header) {
        header.name = path.join(prefix, header.name);
        return header;
      };
    };

    tar.pack(a, {
      map: prefixer("a-files"),
      finalize: false,
      finish: packB,
    });

    function packB(pack) {
      tar
        .pack(b, { pack, map: prefixer("b-files") })
        .pipe(tar.extract(out))
        .on("finish", assertResults);
    }

    function assertResults() {
      const containers = fs.readdirSync(out);
      expect(containers).toEqual(["a-files", "b-files"]);
      const aFiles = fs.readdirSync(path.join(out, "a-files"));
      expect(aFiles).toEqual(["hello.txt"]);
    }
  });

  test.skipIf(win32)("do not extract invalid tar", function () {
    const a = path.join(__dirname, "fixtures", "invalid.tar");

    const out = path.join(__dirname, "fixtures", "invalid");

    fs.rmSync(out, { recursive: true, force: true });

    fs.createReadStream(a)
      // @ts-expect-error
      .pipe(tar.extract(out))
      .on("error", function (err) {
        expect(err.message).toMatch(/is not a valid symlink/i);
        fs.stat(path.join(out, "../bar"), function (err) {
          expect(err).toBeTruthy();
        });
      })
      .on("finish", function () {
        expect().fail("should not finish");
      });
  });

  test.skipIf(win32)("extract tar intended for use by chroot", function () {
    const a = path.join(__dirname, "fixtures", "valid.tar");

    const out = path.join(__dirname, "fixtures", "valid");

    fs.rmSync(out, { recursive: true, force: true });

    fs.createReadStream(a)
      // @ts-expect-error
      .pipe(tar.extract(out, { validateSymlinks: false }))
      .on("error", function (err) {
        expect(err.message).toMatch(/is not a valid symlink/i);
        fs.stat(path.join(out, "../bar"), function (err) {
          expect(err).toBeTruthy();
        });
      })
      .on("finish", function () {
        expect().pass();
      });
  });

  test.skipIf(win32)("no abs hardlink targets", function () {
    const out = path.join(__dirname, "fixtures", "invalid");
    const outside = path.join(__dirname, "fixtures", "outside");

    fs.rmSync(out, { recursive: true, force: true });

    const s = tarStream.pack();

    fs.writeFileSync(outside, "something");

    s.entry({
      type: "link",
      name: "link",
      linkname: outside,
    });

    s.entry({ name: "link" }, "overwrite");

    s.finalize();

    s.pipe(tar.extract(out)).on("error", function (err) {
      expect(err).toBeTruthy();
      fs.readFile(outside, "utf-8", function (err, str) {
        expect(String(err)).not.toContain("no error");
        expect(str).toBe("something");
      });
    });
  });
});
