import { getShortBytes, getShortBytesValue } from "../util";

const ENCRYPTION_FLAG = 1 << 0;
const SLIDING_DICTIONARY_SIZE_FLAG = 1 << 1;
const NUMBER_OF_SHANNON_FANO_TREES_FLAG = 1 << 2;
const DATA_DESCRIPTOR_FLAG = 1 << 3;
const STRONG_ENCRYPTION_FLAG = 1 << 6;
const UFT8_NAMES_FLAG = 1 << 11;

class GeneralPurposeBit {
  descriptor: boolean;
  encryption: boolean;
  utf8: boolean;
  numberOfShannonFanoTrees: number;
  strongEncryption: boolean;
  slidingDictionarySize: number;

  constructor() {
    this.descriptor = false;
    this.encryption = false;
    this.utf8 = false;
    this.numberOfShannonFanoTrees = 0;
    this.strongEncryption = false;
    this.slidingDictionarySize = 0;
  }

  encode(): Buffer<ArrayBuffer> {
    return getShortBytes(
      (this.descriptor ? DATA_DESCRIPTOR_FLAG : 0) |
        (this.utf8 ? UFT8_NAMES_FLAG : 0) |
        (this.encryption ? ENCRYPTION_FLAG : 0) |
        (this.strongEncryption ? STRONG_ENCRYPTION_FLAG : 0),
    );
  }

  static parse(
    buf: Buffer<ArrayBufferLike>,
    offset: number,
  ): GeneralPurposeBit {
    const flag = getShortBytesValue(buf, offset);
    const gbp = new GeneralPurposeBit();
    gbp.useDataDescriptor((flag & DATA_DESCRIPTOR_FLAG) !== 0);
    gbp.useUTF8ForNames((flag & UFT8_NAMES_FLAG) !== 0);
    gbp.useStrongEncryption((flag & STRONG_ENCRYPTION_FLAG) !== 0);
    gbp.useEncryption((flag & ENCRYPTION_FLAG) !== 0);
    gbp.setSlidingDictionarySize(
      (flag & SLIDING_DICTIONARY_SIZE_FLAG) !== 0 ? 8192 : 4096,
    );
    gbp.setNumberOfShannonFanoTrees(
      (flag & NUMBER_OF_SHANNON_FANO_TREES_FLAG) !== 0 ? 3 : 2,
    );
    return gbp;
  }

  setNumberOfShannonFanoTrees(n: number): void {
    this.numberOfShannonFanoTrees = n;
  }

  getNumberOfShannonFanoTrees(): number {
    return this.numberOfShannonFanoTrees;
  }

  setSlidingDictionarySize(n: number): void {
    this.slidingDictionarySize = n;
  }

  getSlidingDictionarySize(): number {
    return this.slidingDictionarySize;
  }

  useDataDescriptor(b: boolean): void {
    this.descriptor = b;
  }

  usesDataDescriptor(): boolean {
    return this.descriptor;
  }

  useEncryption(b: boolean): void {
    this.encryption = b;
  }

  usesEncryption(): boolean {
    return this.encryption;
  }

  useStrongEncryption(b: boolean): void {
    this.strongEncryption = b;
  }

  usesStrongEncryption(): boolean {
    return this.strongEncryption;
  }

  useUTF8ForNames(b: boolean): void {
    this.utf8 = b;
  }

  usesUTF8ForNames(): boolean {
    return this.utf8;
  }
}

export { GeneralPurposeBit };
