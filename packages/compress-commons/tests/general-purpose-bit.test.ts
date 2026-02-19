import { expect, it, beforeEach, describe } from "bun:test";

import { GeneralPurposeBit } from "../src/archivers/general-purpose-bit";

let gpb;

beforeEach(() => {
  gpb = new GeneralPurposeBit();
});

describe("GeneralPurposeBit", () => {
  describe("#encode", () => {
    it("should return a Buffer", () => {
      gpb.useDataDescriptor(true);
      const encoded = gpb.encode();
      expect(Buffer.isBuffer(encoded)).toBe(true);
    });
  });
});
