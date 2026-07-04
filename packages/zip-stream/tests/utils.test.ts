import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dateify, sanitizePath } from "../src/utils";

const testDateString = "Jan 03 2013 14:26:38 GMT";
const testDate = new Date(testDateString);

describe("utils", () => {
  describe("dateify(dateish)", () => {
    it("should return an instance of Date", () => {
      assert.ok(dateify(testDate) instanceof Date);
      assert.ok(dateify(testDateString) instanceof Date);
      assert.ok(dateify(null) instanceof Date);
    });

    it("should passthrough an instance of Date", () => {
      assert.deepStrictEqual(dateify(testDate), testDate);
    });

    it("should convert dateish string to an instance of Date", () => {
      assert.deepStrictEqual(dateify(testDateString), testDate);
    });
  });

  describe("sanitizePath(filepath)", () => {
    it("should sanitize filepath", () => {
      assert.strictEqual(
        sanitizePath("\\this/path//file.txt"),
        "this/path/file.txt",
      );
      assert.strictEqual(
        sanitizePath("/this/path/file.txt"),
        "this/path/file.txt",
      );
      assert.strictEqual(
        sanitizePath("./this\\path\\file.txt"),
        "./this/path/file.txt",
      );
      assert.strictEqual(
        sanitizePath("../this\\path\\file.txt"),
        "this/path/file.txt",
      );

      assert.strictEqual(
        sanitizePath("c:\\this\\path\\file.txt"),
        "this/path/file.txt",
      );
      assert.strictEqual(sanitizePath("\\\\server\\share\\"), "server/share/");
    });
  });
});
