import { describe, expect, it } from "bun:test";

import { dateify, sanitizePath } from "../src/utils.js";

const testDateString = "Jan 03 2013 14:26:38 GMT";
const testDate = new Date(testDateString);

describe("utils", () => {
  describe("dateify(dateish)", () => {
    it("should return an instance of Date", () => {
      expect(dateify(testDate)).toBeInstanceOf(Date);
      expect(dateify(testDateString)).toBeInstanceOf(Date);
      expect(dateify(null)).toBeInstanceOf(Date);
    });

    it("should passthrough an instance of Date", () => {
      expect(dateify(testDate)).toEqual(testDate);
    });

    it("should convert dateish string to an instance of Date", () => {
      expect(dateify(testDateString)).toEqual(testDate);
    });
  });

  describe("sanitizePath(filepath)", () => {
    it("should sanitize filepath", () => {
      expect(sanitizePath("\\this/path//file.txt")).toBe("this/path/file.txt");
      expect(sanitizePath("/this/path/file.txt")).toBe("this/path/file.txt");
      expect(sanitizePath("./this\\path\\file.txt")).toBe("./this/path/file.txt");
      expect(sanitizePath("../this\\path\\file.txt")).toBe("this/path/file.txt");

      expect(sanitizePath("c:\\this\\path\\file.txt")).toBe("this/path/file.txt");
      expect(sanitizePath("\\\\server\\share\\")).toBe("server/share/");
    });
  });
});
