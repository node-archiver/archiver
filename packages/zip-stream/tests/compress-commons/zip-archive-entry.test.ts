import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { GeneralPurposeBit } from "../../src/archivers/general-purpose-bit";
import * as UnixStat from "../../src/archivers/unix-stat";
import { ZipArchiveEntry } from "../../src/compress-commons";

let entry: ZipArchiveEntry;
// Jan 03 2013 14:26:38 GMT
const testDate = new Date(Date.UTC(2013, 0, 3, 14, 26, 38, 0));

beforeEach(() => {
  entry = new ZipArchiveEntry("file.txt");
});

describe("ZipArchiveEntry", () => {
  describe("#getComment", () => {
    it("should return the comment", () => {
      entry.setComment("file comment");
      assert.strictEqual(entry.getComment(), "file comment");
    });
  });

  describe("#getCompressedSize", () => {
    it("should return the compressed size", () => {
      entry.csize = 10;
      assert.strictEqual(entry.getCompressedSize(), 10);
    });
  });

  describe("#getCrc", () => {
    it("should return the CRC32", () => {
      entry.crc = 585446183;
      assert.strictEqual(entry.getCrc(), 585446183);
    });
  });

  describe("#getExternalAttributes", () => {
    it("should return the external attributes", () => {
      entry.exattr = 2180972576;
      assert.strictEqual(entry.getExternalAttributes(), 2180972576);
    });
  });

  describe("#getGeneralPurposeBit", () => {
    it("should return the general purpose bit flag", () => {
      const gpb = new GeneralPurposeBit();
      gpb.useDataDescriptor(true);
      entry.gpb = gpb;
      assert.strictEqual(entry.getGeneralPurposeBit(), gpb);
    });
  });

  describe("#getInternalAttributes", () => {
    it("should return the internal attributes", () => {
      entry.inattr = 2180972576;
      assert.strictEqual(entry.getInternalAttributes(), 2180972576);
    });
  });

  describe("#getMethod", () => {
    it("should return the compression method", () => {
      entry.method = 0;
      assert.strictEqual(entry.getMethod(), 0);
    });
  });

  describe("#getName", () => {
    it("should return the name", () => {
      entry.name = "file.txt";
      assert.strictEqual(entry.getName(), "file.txt");
    });
  });

  describe("#getPlatform", () => {
    it("should return the platform", () => {
      entry.platform = 3;
      assert.strictEqual(entry.getPlatform(), 3);
    });
  });

  describe("#getSize", () => {
    it("should return the size", () => {
      entry.size = 25;
      assert.strictEqual(entry.getSize(), 25);
    });
  });

  describe("#getTime", () => {
    it("should return a Date object", () => {
      entry.time = 1109607251;
      assert.ok(entry.getTime() instanceof Date);
    });
  });

  describe("#getTimeDos", () => {
    it("should return a number", () => {
      entry.time = 1109607251;
      assert.strictEqual(typeof entry.getTimeDos(), "number");
    });
  });

  describe("#getUnixMode", () => {
    it("should return the unix filemode", () => {
      entry.mode = 511; // 0777
      entry.exattr = 2180972576;
      entry.platform = 3;
      assert.strictEqual(entry.getUnixMode(), 33279); // 0100777
    });

    it("should set proper external attributes for an unix directory", () => {
      entry = new ZipArchiveEntry("directory/");
      entry.setUnixMode(511); // 0777
      assert.strictEqual(entry.getPlatform(), 3);
      assert.ok(entry.isDirectory());
      const exattr = entry.getExternalAttributes() >> 16;
      assert.strictEqual(exattr & 16384, 16384); // 040000
    });
  });

  describe("#setComment", () => {
    it("should set internal variable", () => {
      entry.setComment("file comment");
      assert.strictEqual(entry.comment, "file comment");
    });

    it("should set utf8 bit when receiving strings byte count != string length", () => {
      entry.setComment("ÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäçèéêëìíîïñòóôõöùúûüýÿ");
      assert.ok(entry.getGeneralPurposeBit().usesUTF8ForNames());
    });
  });

  describe("#setCompressedSize", () => {
    it("should set internal variable", () => {
      entry.setCompressedSize(10);
      assert.strictEqual(entry.csize, 10);
    });
  });

  describe("#setCrc", () => {
    it("should set internal variable", () => {
      entry.setCrc(585446183);
      assert.strictEqual(entry.crc, 585446183);
    });
  });

  describe("#setExternalAttributes", () => {
    it("should set internal variable", () => {
      entry.setExternalAttributes(2180972576);
      assert.strictEqual(entry.exattr, 2180972576);
    });
  });

  describe("#setGeneralPurposeBit", () => {
    it("should set internal variable", () => {
      const gpb = new GeneralPurposeBit();
      gpb.useDataDescriptor(true);
      entry.setGeneralPurposeBit(gpb);
      assert.strictEqual(entry.gpb, gpb);
    });
  });

  describe("#setInternalAttributes", () => {
    it("should set internal variable", () => {
      entry.setInternalAttributes(2180972576);
      assert.strictEqual(entry.inattr, 2180972576);
    });
  });

  describe("#setMethod", () => {
    it("should set internal variable", () => {
      entry.setMethod(8);
      assert.strictEqual(entry.method, 8);
    });
  });

  describe("#setName", () => {
    it("should set internal variable", () => {
      entry.setName("file.txt");
      assert.strictEqual(entry.name, "file.txt");
    });

    it("should allow setting prefix of / at the beginning of path", () => {
      entry.setName("file.txt", true);
      assert.strictEqual(entry.name, "/file.txt");
    });

    it("should allow ./ at the beginning of path", () => {
      entry.setName("./file.txt");
      assert.strictEqual(entry.name, "./file.txt");
    });

    it("should clean windows style paths", () => {
      entry.setName("\\windows\\file.txt");
      assert.strictEqual(entry.name, "windows/file.txt");

      entry.setName("c:\\this\\path\\file.txt");
      assert.strictEqual(entry.name, "this/path/file.txt");

      entry.setName("\\\\server\\share\\");
      assert.strictEqual(entry.name, "server/share/");
    });

    it("should clean multiple forward slashes at beginning of path", () => {
      entry.setName("//forward/file.txt");
      assert.strictEqual(entry.name, "forward/file.txt");
    });

    it("should set utf8 bit when receiving strings byte count != string length", () => {
      entry.setName("ÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäçèéêëìíîïñòóôõöùúûüýÿ.txt");
      assert.ok(entry.getGeneralPurposeBit().usesUTF8ForNames());
    });
  });

  describe("#setPlatform", () => {
    it("should set internal variable", () => {
      entry.setPlatform(3);
      assert.strictEqual(entry.platform, 3);
    });
  });

  describe("#setSize", () => {
    it("should set internal variable", () => {
      entry.setSize(15);
      assert.strictEqual(entry.size, 15);
    });
  });

  describe("#setTime", () => {
    it("should set internal variable", () => {
      entry.setTime(testDate);
      assert.strictEqual(entry.time, 1109619539);
    });
  });

  describe("#setUnixMode", () => {
    it("should set internal variables", () => {
      entry.setUnixMode(511);
      assert.strictEqual(entry.exattr, 2180972576);
      assert.strictEqual(entry.mode, 511); // 0777
      assert.strictEqual(entry.getUnixMode(), 33279); // 0100777
    });

    it("should also preserve filetype information", () => {
      entry.setUnixMode(41453);
      assert.strictEqual(entry.exattr, 2716663840);
      assert.strictEqual(entry.mode, 493); // 0755
      assert.strictEqual(entry.getUnixMode(), 41453); // 0120755
    });
  });

  describe("#isDirectory", () => {
    it("should return a boolean based on name of entry", () => {
      assert.ok(!entry.isDirectory());
      entry.setName("some/directory/");
      assert.ok(entry.isDirectory());
    });
  });

  describe("#isUnixSymlink", () => {
    it("should return a boolean if the entry is a symlink", () => {
      entry.setUnixMode(UnixStat.LINK_FLAG);
      assert.ok(entry.isUnixSymlink());

      entry.setUnixMode(UnixStat.LINK_FLAG | UnixStat.DIR_FLAG);
      assert.ok(!entry.isUnixSymlink());
    });
  });
});
