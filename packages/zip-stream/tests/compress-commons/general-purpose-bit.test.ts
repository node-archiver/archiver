import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { GeneralPurposeBit } from "../../src/archivers/general-purpose-bit";

let gpb;

beforeEach(() => {
  gpb = new GeneralPurposeBit();
});

describe("GeneralPurposeBit", () => {
  describe("#encode", () => {
    it("should return a Buffer", () => {
      gpb.useDataDescriptor(true);
      const encoded = gpb.encode();
      assert.ok(Buffer.isBuffer(encoded));
    });
  });
});
