import {
  EMPTY,
  MIN_VERSION_INITIAL,
  MODE_MASK,
  PLATFORM_FAT,
  PLATFORM_UNIX,
  S_DOS_A,
  S_DOS_D,
  S_IFDIR,
  S_IFREG,
  SHORT_MASK,
  SHORT_SHIFT,
  ZIP64_MAGIC,
} from "../constants";
import { dateToDos, dosToDate, normalizePath } from "../util";
import { ArchiveEntry } from "./archive-entry";
import { GeneralPurposeBit } from "./general-purpose-bit";
import * as UnixStat from "./unix-stat";

class ZipArchiveEntry extends ArchiveEntry {
  platform: number;
  method: number;
  name: string | null;
  size: number;
  csize: number;
  gpb: GeneralPurposeBit;
  crc: number;
  time: number;
  minver: number;
  mode: number;
  extra: Buffer | null;
  exattr: number;
  inattr: number;
  comment: string | null;

  constructor(name: string) {
    super();

    this.platform = PLATFORM_FAT;
    this.method = -1;
    this.name = null;
    this.size = 0;
    this.csize = 0;
    this.gpb = new GeneralPurposeBit();
    this.crc = 0;
    this.time = -1;
    this.minver = MIN_VERSION_INITIAL;
    this.mode = -1;
    this.extra = null;
    this.exattr = 0;
    this.inattr = 0;
    this.comment = null;

    if (name) {
      this.setName(name);
    }
  }

  /**
   * Returns the extra fields related to the entry.
   */
  getCentralDirectoryExtra(): Buffer {
    return this.getExtra();
  }

  /**
   * Returns the comment set for the entry.
   */
  getComment(): string {
    return this.comment !== null ? this.comment : "";
  }

  /**
   * Returns the compressed size of the entry.
   */
  getCompressedSize(): number {
    return this.csize;
  }

  /**
   * Returns the CRC32 digest for the entry.
   */
  getCrc(): number {
    return this.crc;
  }

  /**
   * Returns the external file attributes for the entry.
   */
  getExternalAttributes(): number {
    return this.exattr;
  }

  /**
   * Returns the extra fields related to the entry.
   */
  getExtra(): Buffer {
    return this.extra !== null ? this.extra : EMPTY;
  }

  /**
   * Returns the general purpose bits related to the entry.
   */
  getGeneralPurposeBit(): GeneralPurposeBit {
    return this.gpb;
  }

  /**
   * Returns the internal file attributes for the entry.
   *
   */
  getInternalAttributes(): number {
    return this.inattr;
  }

  /**
   * Returns the last modified date of the entry.
   */
  getLastModifiedDate(): -1 | Date {
    return this.getTime();
  }

  /**
   * Returns the extra fields related to the entry.
   */
  getLocalFileDataExtra(): Buffer {
    return this.getExtra();
  }

  /**
   * Returns the compression method used on the entry.
   */
  getMethod(): number {
    return this.method;
  }

  /**
   * Returns the filename of the entry.
   */
  getName(): string {
    return this.name;
  }

  /**
   * Returns the platform on which the entry was made.
   */
  getPlatform(): number {
    return this.platform;
  }

  /**
   * Returns the size of the entry.
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Returns a date object representing the last modified date of the entry.
   */
  getTime(): -1 | Date {
    return this.time !== -1 ? dosToDate(this.time) : -1;
  }

  /**
   * Returns the DOS timestamp for the entry.
   */
  getTimeDos(): number {
    return this.time !== -1 ? this.time : 0;
  }

  /**
   * Returns the UNIX file permissions for the entry.
   */
  getUnixMode(): number {
    return this.platform !== PLATFORM_UNIX
      ? 0
      : (this.getExternalAttributes() >> SHORT_SHIFT) & SHORT_MASK;
  }

  /**
   * Returns the version of ZIP needed to extract the entry.
   */
  getVersionNeededToExtract(): number {
    return this.minver;
  }

  /**
   * Sets the comment of the entry.
   */
  setComment(comment: string): void {
    if (Buffer.byteLength(comment) !== comment.length) {
      this.getGeneralPurposeBit().useUTF8ForNames(true);
    }
    this.comment = comment;
  }

  /**
   * Sets the compressed size of the entry.
   */
  setCompressedSize(size: number): void {
    if (size < 0) {
      throw new Error("invalid entry compressed size");
    }
    this.csize = size;
  }

  /**
   * Sets the checksum of the entry.
   */
  setCrc(crc: number): void {
    if (crc < 0) {
      throw new Error("invalid entry crc32");
    }
    this.crc = crc;
  }

  /**
   * Sets the external file attributes of the entry.
   */
  setExternalAttributes(attr: number): void {
    this.exattr = attr >>> 0;
  }

  /**
   * Sets the extra fields related to the entry.
   */
  setExtra(extra: Buffer<ArrayBufferLike>): void {
    this.extra = extra;
  }

  /**
   * Sets the general purpose bits related to the entry.
   */
  setGeneralPurposeBit(gpb: GeneralPurposeBit): void {
    if (!(gpb instanceof GeneralPurposeBit)) {
      throw new Error("invalid entry GeneralPurposeBit");
    }
    this.gpb = gpb;
  }

  /**
   * Sets the internal file attributes of the entry.
   */
  setInternalAttributes(attr: number): void {
    this.inattr = attr;
  }

  /**
   * Sets the compression method of the entry.
   */
  setMethod(method: number): void {
    if (method < 0) {
      throw new Error("invalid entry compression method");
    }
    this.method = method;
  }

  /**
   * Sets the name of the entry.
   */
  setName(name: string, prependSlash: boolean = false): void {
    name = normalizePath(name, false)
      .replace(/^\w+:/, "")
      .replace(/^(\.\.\/|\/)+/, "");

    if (prependSlash) {
      name = `/${name}`;
    }

    if (Buffer.byteLength(name) !== name.length) {
      this.getGeneralPurposeBit().useUTF8ForNames(true);
    }

    this.name = name;
  }

  /**
   * Sets the platform on which the entry was made.
   */
  setPlatform(platform: number): void {
    this.platform = platform;
  }

  /**
   * Sets the size of the entry.
   */
  setSize(size: number): void {
    if (size < 0) {
      throw new Error("invalid entry size");
    }
    this.size = size;
  }

  /**
   * Sets the time of the entry.
   */
  setTime(time: Date, forceLocalTime?: boolean): void {
    if (!(time instanceof Date)) {
      throw new Error("invalid entry time");
    }
    this.time = dateToDos(time, forceLocalTime);
  }

  /**
   * Sets the UNIX file permissions for the entry.
   */
  setUnixMode(mode: number): void {
    mode |= this.isDirectory() ? S_IFDIR : S_IFREG;
    let extattr = 0;
    extattr |= (mode << SHORT_SHIFT) | (this.isDirectory() ? S_DOS_D : S_DOS_A);
    this.setExternalAttributes(extattr);
    this.mode = mode & MODE_MASK;
    this.platform = PLATFORM_UNIX;
  }

  /**
   * Sets the version of ZIP needed to extract this entry.
   */
  setVersionNeededToExtract(minver: number): void {
    this.minver = minver;
  }

  /**
   * Returns true if this entry represents a directory.
   */
  isDirectory(): boolean {
    return this.getName().slice(-1) === "/";
  }

  /**
   * Returns true if this entry represents a unix symlink,
   * in which case the entry's content contains the target path
   * for the symlink.
   */
  isUnixSymlink(): boolean {
    return (
      (this.getUnixMode() & UnixStat.FILE_TYPE_FLAG) === UnixStat.LINK_FLAG
    );
  }

  /**
   * Returns true if this entry is using the ZIP64 extension of ZIP.
   */
  isZip64(): boolean {
    return this.csize > ZIP64_MAGIC || this.size > ZIP64_MAGIC;
  }
}

export { ZipArchiveEntry };
