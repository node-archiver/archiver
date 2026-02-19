abstract class ArchiveEntry {
  abstract getName(): string;
  abstract getSize(): number;
  abstract getLastModifiedDate(): number;
  abstract isDirectory(): boolean;
}

export { ArchiveEntry };
