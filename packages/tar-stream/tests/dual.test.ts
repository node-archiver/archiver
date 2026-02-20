import { test, expect } from "bun:test";

import * as tar from "../src/index";
import { Readable } from "../src/lib/streamx";

test("write and read huge archive", () => {
  const pack = tar.pack();
  const extract = tar.extract();

  extract.on("entry", function (header, stream, next) {
    let size = 0;

    stream.on("data", function (data) {
      size += data.byteLength;
    });

    stream.on("end", function () {
      expect(size).toBe(header.size);
      next();
    });
  });

  pack.pipe(extract, function (err) {
    expect(!err).toBeTrue();
  });

  const entry = pack.entry({
    name: "huge.txt",
    size: 10 * 1024 * 1024 * 1024,
  });

  const buf = Buffer.alloc(1024 * 1024);

  let pushed = 0;

  const rs = new Readable({
    read(cb) {
      this.push(buf);
      pushed += buf.byteLength;
      if (pushed === entry.header.size) this.push(null);
      cb(null);
    },
  });

  rs.pipe(entry);
  pack.finalize();
});
