import { expect, it, beforeEach, describe } from "bun:test";

import { GeneralPurposeBit } from "../src/archivers/general-purpose-bit";
import * as UnixStat from "../src/archivers/unix-stat";
import { ZipArchiveEntry } from "../src/index";

let entry;
// Jan 03 2013 14:26:38 GMT
const testDate = new Date(Date.UTC(2013, 0, 3, 14, 26, 38, 0));

beforeEach(() => {
  entry = new ZipArchiveEntry("file.txt");
});

describe("ZipArchiveEntry", () => {
  describe("#getComment", () => {
    it("should return the comment", () => {
      entry.setComment("file comment");
      expect(entry.getComment()).toBe("file comment");
    });
  });

  describe("#getCompressedSize", () => {
    it("should return the compressed size", () => {
      entry.csize = 10;
      expect(entry.getCompressedSize()).toBe(10);
    });
  });

  describe("#getCrc", () => {
    it("should return the CRC32", () => {
      entry.crc = 585446183;
      expect(entry.getCrc()).toBe(585446183);
    });
  });

  describe("#getExternalAttributes", () => {
    it("should return the external attributes", () => {
      entry.exattr = 2180972576;
      expect(entry.getExternalAttributes()).toBe(2180972576);
    });
  });

  describe("#getGeneralPurposeBit", () => {
    it("should return the general purpose bit flag", () => {
      const gpb = new GeneralPurposeBit();
      gpb.useDataDescriptor(true);
      entry.gpb = gpb;
      expect(entry.getGeneralPurposeBit()).toBe(gpb);
    });
  });

  describe("#getInternalAttributes", () => {
    it("should return the internal attributes", () => {
      entry.inattr = 2180972576;
      expect(entry.getInternalAttributes()).toBe(2180972576);
    });
  });

  describe("#getMethod", () => {
    it("should return the compression method", () => {
      entry.method = 0;
      expect(entry.getMethod()).toBe(0);
    });
  });

  describe("#getName", () => {
    it("should return the name", () => {
      entry.name = "file.txt";
      expect(entry.getName()).toBe("file.txt");
    });
  });

  describe("#getPlatform", () => {
    it("should return the platform", () => {
      entry.platform = 3;
      expect(entry.getPlatform()).toBe(3);
    });
  });

  describe("#getSize", () => {
    it("should return the size", () => {
      entry.size = 25;
      expect(entry.getSize()).toBe(25);
    });
  });

  describe("#getTime", () => {
    it("should return a Date object", () => {
      entry.time = 1109607251;
      expect(entry.getTime()).toBeInstanceOf(Date);
    });
  });

  describe("#getTimeDos", () => {
    it("should return a number", () => {
      entry.time = 1109607251;
      expect(typeof entry.getTimeDos()).toBe("number");
    });
  });

  describe("#getUnixMode", () => {
    it("should return the unix filemode", () => {
      entry.mode = 511; // 0777
      entry.exattr = 2180972576;
      entry.platform = 3;
      expect(entry.getUnixMode()).toBe(33279); // 0100777
    });

    it("should set proper external attributes for an unix directory", () => {
      entry = new ZipArchiveEntry("directory/");
      entry.setUnixMode(511); // 0777
      expect(entry.getPlatform()).toBe(3);
      expect(entry.isDirectory()).toBe(true);
      const exattr = entry.getExternalAttributes() >> 16;
      expect(exattr & 16384).toBe(16384); // 040000
    });
  });

  describe("#setComment", () => {
    it("should set internal variable", () => {
      entry.setComment("file comment");
      expect(entry).toHaveProperty("comment", "file comment");
    });

    it("should set utf8 bit when receiving strings byte count != string length", () => {
      entry.setComment("ÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäçèéêëìíîïñòóôõöùúûüýÿ");
      expect(entry.getGeneralPurposeBit().usesUTF8ForNames()).toBe(true);
    });
  });

  describe("#setCompressedSize", () => {
    it("should set internal variable", () => {
      entry.setCompressedSize(10);
      expect(entry).toHaveProperty("csize", 10);
    });
  });

  describe("#setCrc", () => {
    it("should set internal variable", () => {
      entry.setCrc(585446183);
      expect(entry).toHaveProperty("crc", 585446183);
    });
  });

  describe("#setExternalAttributes", () => {
    it("should set internal variable", () => {
      entry.setExternalAttributes(2180972576);
      expect(entry).toHaveProperty("exattr", 2180972576);
    });
  });

  describe("#setGeneralPurposeBit", () => {
    it("should set internal variable", () => {
      const gpb = new GeneralPurposeBit();
      gpb.useDataDescriptor(true);
      entry.setGeneralPurposeBit(gpb);
      expect(entry).toHaveProperty("gpb", gpb);
    });
  });

  describe("#setInternalAttributes", () => {
    it("should set internal variable", () => {
      entry.setInternalAttributes(2180972576);
      expect(entry).toHaveProperty("inattr", 2180972576);
    });
  });

  describe("#setMethod", () => {
    it("should set internal variable", () => {
      entry.setMethod(8);
      expect(entry).toHaveProperty("method", 8);
    });
  });

  describe("#setName", () => {
    it("should set internal variable", () => {
      entry.setName("file.txt");
      expect(entry).toHaveProperty("name", "file.txt");
    });

    it("should allow setting prefix of / at the beginning of path", () => {
      entry.setName("file.txt", true);
      expect(entry).toHaveProperty("name", "/file.txt");
    });

    it("should allow ./ at the beginning of path", () => {
      entry.setName("./file.txt");
      expect(entry).toHaveProperty("name", "./file.txt");
    });

    it("should clean windows style paths", () => {
      entry.setName("\\windows\\file.txt");
      expect(entry).toHaveProperty("name", "windows/file.txt");

      entry.setName("c:\\this\\path\\file.txt");
      expect(entry).toHaveProperty("name", "this/path/file.txt");

      entry.setName("\\\\server\\share\\");
      expect(entry).toHaveProperty("name", "server/share/");
    });

    it("should clean multiple forward slashes at beginning of path", () => {
      entry.setName("//forward/file.txt");
      expect(entry).toHaveProperty("name", "forward/file.txt");
    });

    it("should set utf8 bit when receiving strings byte count != string length", () => {
      entry.setName("ÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäçèéêëìíîïñòóôõöùúûüýÿ.txt");
      expect(entry.getGeneralPurposeBit().usesUTF8ForNames()).toBe(true);
    });
  });

  describe("#setPlatform", () => {
    it("should set internal variable", () => {
      entry.setPlatform(3);
      expect(entry).toHaveProperty("platform", 3);
    });
  });

  describe("#setSize", () => {
    it("should set internal variable", () => {
      entry.setSize(15);
      expect(entry).toHaveProperty("size", 15);
    });
  });

  describe("#setTime", () => {
    it("should set internal variable", () => {
      entry.setTime(testDate);
      expect(entry).toHaveProperty("time", 1109619539);
    });
  });

  describe("#setUnixMode", () => {
    it("should set internal variables", () => {
      entry.setUnixMode(511);
      expect(entry).toHaveProperty("exattr", 2180972576);
      expect(entry).toHaveProperty("mode", 511); // 0777
      expect(entry.getUnixMode()).toBe(33279); // 0100777
    });

    it("should also preserve filetype information", () => {
      entry.setUnixMode(41453);
      expect(entry).toHaveProperty("exattr", 2716663840);
      expect(entry).toHaveProperty("mode", 493); // 0755
      expect(entry.getUnixMode()).toBe(41453); // 0120755
    });
  });

  describe("#isDirectory", () => {
    it("should return a boolean based on name of entry", () => {
      expect(entry.isDirectory()).toBe(false);
      entry.setName("some/directory/");
      expect(entry.isDirectory()).toBe(true);
    });
  });

  describe("#isUnixSymlink", () => {
    it("should return a boolean if the entry is a symlink", () => {
      entry.setUnixMode(UnixStat.LINK_FLAG);
      expect(entry.isUnixSymlink()).toBe(true);

      entry.setUnixMode(UnixStat.LINK_FLAG | UnixStat.DIR_FLAG);
      expect(entry.isUnixSymlink()).toBe(false);
    });
  });
});
