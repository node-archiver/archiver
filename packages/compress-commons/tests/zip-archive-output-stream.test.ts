import { expect, it, beforeAll, describe } from "bun:test";
import { createReadStream, mkdirSync } from "node:fs";
import { Transform } from "node:stream";
import { Readable } from "node:stream";

import { ZipArchiveEntry, ZipArchiveOutputStream } from "../src/index.js";
import { WriteHashStream, binaryBuffer } from "./helpers/index.js";

const testBuffer = binaryBuffer(1024 * 16);

beforeAll(() => {
  mkdirSync("tmp", { recursive: true });
});

describe("ZipArchiveOutputStream", () => {
  describe("#entry", () => {
    it("should append Buffer sources", async () => {
      const archive = new ZipArchiveOutputStream();
      const testStream = new WriteHashStream("tmp/zip-buffer.zip");

      const promise = new Promise((resolve) => {
        testStream.on("close", resolve);
      });

      archive.pipe(testStream);
      archive.entry(new ZipArchiveEntry("buffer.txt"), testBuffer).finish();

      await promise;
    });

    it("should append Stream sources", async () => {
      const archive = new ZipArchiveOutputStream();
      const testStream = new WriteHashStream("tmp/zip-stream.zip");

      const promise = new Promise((resolve) => {
        testStream.on("close", resolve);
      });

      archive.pipe(testStream);
      archive
        .entry(
          new ZipArchiveEntry("stream.txt"),
          createReadStream("tests/fixtures/test.txt"),
        )
        .finish();

      await promise;
    });

    it("should append Stream-like sources", async () => {
      const archive = new ZipArchiveOutputStream();
      const testStream = new WriteHashStream("tmp/zip-stream-like.zip");

      const promise = new Promise((resolve) => {
        testStream.on("close", resolve);
      });

      archive.pipe(testStream);
      archive
        .entry(new ZipArchiveEntry("stream-like.txt"), Readable.from(["it"]))
        .finish();

      await promise;
    });

    it("should stop streaming on Stream error", async () => {
      const archive = new ZipArchiveOutputStream();
      const testStream = new WriteHashStream("tmp/zip-stream-error.zip");

      let callbackError = null;
      let callbackCalls = 0;

      const promise = new Promise((resolve) => {
        testStream.on("close", () => {
          expect(callbackError?.message).toBe("something went wrong");
          expect(callbackCalls).toBe(1);
          resolve(undefined);
        });
      });

      archive.pipe(testStream);

      const file = new Transform();
      archive.entry(new ZipArchiveEntry("stream.txt"), file, (err) => {
        callbackCalls++;
        callbackError = err;
      });

      archive.finish();

      // Give it a tick to make sure entry is being processed
      await Bun.sleep(1);

      file.emit("error", new Error("something went wrong"));

      await promise;
    });

    it("should append multiple sources", async () => {
      const archive = new ZipArchiveOutputStream();
      const testStream = new WriteHashStream("tmp/zip-multiple.zip");

      const promise = new Promise((resolve) => {
        testStream.on("close", resolve);
      });

      archive.pipe(testStream);

      const entry1 = new ZipArchiveEntry("string.txt");
      const entry2 = new ZipArchiveEntry("buffer.txt");
      const entry3 = new ZipArchiveEntry("stream.txt");
      const entry4 = new ZipArchiveEntry("stream-store.png");
      entry4.setMethod(0); // STORE
      const entry5 = new ZipArchiveEntry("buffer-store.txt");
      entry5.setMethod(0); // STORE

      await new Promise((resolve, reject) => {
        archive.entry(entry1, "string", (err) => {
          if (err) return reject(err);
          archive.entry(entry2, testBuffer, (err) => {
            if (err) return reject(err);
            archive.entry(
              entry3,
              createReadStream("tests/fixtures/test.txt"),
              (err) => {
                if (err) return reject(err);
                archive.entry(
                  entry4,
                  createReadStream("tests/fixtures/image.png"),
                  (err) => {
                    if (err) return reject(err);
                    archive.entry(entry5, testBuffer, (err) => {
                      if (err) return reject(err);
                      archive.finish();
                      resolve(undefined);
                    });
                  },
                );
              },
            );
          });
        });
      });

      await promise;
    });

    it("should force ZIP64", async () => {
      const archive = new ZipArchiveOutputStream({ forceZip64: true });
      const testStream = new WriteHashStream("tmp/zip-stream64.zip");

      const promise = new Promise((resolve) => {
        testStream.on("close", resolve);
      });

      archive.pipe(testStream);
      archive
        .entry(
          new ZipArchiveEntry("stream.txt"),
          createReadStream("tests/fixtures/test.txt"),
        )
        .finish();

      await promise;
    });
  });
});
