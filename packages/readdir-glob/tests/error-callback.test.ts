import { it, beforeEach, describe, expect, spyOn } from "bun:test";
import * as fs from "node:fs";

import glob from "@archiver/readdir-glob";

describe.todo("error-callack", () => {
  let logCalled = undefined;
  beforeEach(() => {
    logCalled = [];
    spyOn(fs, "readdir").mockImplementation((path, opts, cb) => {
      process.nextTick(() => cb(new Error("mock fs.readdir error")));
    });
    spyOn(console, "error").mockImplementation(function (...args) {
      args.forEach((arg) => logCalled.push(arg));
    });
  });

  it("error callback", (done) => {
    glob(".", { pattern: "*" }, (err) => {
      expect(err).toBeTruthy();

      setTimeout(() => {
        expect(logCalled.length).toBe(1);
        expect(logCalled[0].message).toEqual("mock fs.readdir error");
        done();
      });
    });
  });
});
