import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as zlib from "node:zlib";

import { Writable } from "streamx";

import * as tar from "../src/index";
import * as fixtures from "./fixtures";

const win32 = process.platform === "win32";

test.skipIf(win32)(
  "huge",
  (done) => {
    const extract = tar.extract();
    let noEntries = false;
    const hugeFileSize = 8804630528; // ~8.2GB
    let dataLength = 0;

    const countStream = new Writable({
      write(data, cb) {
        dataLength += data.length;
        cb();
      },
    });

    // Make sure we read the correct pax size entry for a file larger than 8GB.
    extract.on("entry", function (header, stream, callback) {
      expect(header).toEqual({
        devmajor: 0,
        devminor: 0,
        gid: 20,
        gname: "staff",
        linkname: null,
        mode: 420,
        mtime: new Date(1521214967000),
        name: "huge.txt",
        pax: {
          "LIBARCHIVE.creationtime": "1521214954",
          "SCHILY.dev": "16777218",
          "SCHILY.ino": "91584182",
          "SCHILY.nlink": "1",
          atime: "1521214969",
          ctime: "1521214967",
          size: hugeFileSize.toString(),
        },
        size: hugeFileSize,
        type: "file",
        uid: 502,
        uname: "apd4n",
      });

      noEntries = true;
      stream.pipe(countStream);
      callback();
    });

    extract.on("finish", function () {
      expect(noEntries).toBeTrue();
      expect(dataLength).toBe(hugeFileSize);
      done();
    });

    const gunzip = zlib.createGunzip();
    const reader = fs.createReadStream(fixtures.HUGE);
    reader.pipe(gunzip).pipe(extract);
  },
  { timeout: 120e3 }, // 2 minutes
);
