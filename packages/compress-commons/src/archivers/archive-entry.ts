abstract class ArchiveEntry {
  abstract getName(): string;
  abstract getSize(): number;
  abstract getLastModifiedDate(): -1 | Date;
  abstract isDirectory(): boolean;
}

export { ArchiveEntry };
