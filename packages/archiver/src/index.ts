import { Archiver, type ArchiverOptions, type ProgressData } from "./lib/core";
import { Tar, type TarOptions } from "./lib/plugins/tar";
import { Zip, type ZipOptions } from "./lib/plugins/zip";

interface ZipArchiveOptions extends ArchiverOptions, ZipOptions {}

class ZipArchive extends Archiver {
  constructor(options?: Partial<ZipArchiveOptions>) {
    super(options);
    this._module = new Zip(options);
    this._supportsDirectory = true;
    this._supportsSymlink = true;
    this._modulePipe();
  }
}

interface TarArchiveOptions extends ArchiverOptions, TarOptions {}

class TarArchive extends Archiver {
  constructor(options?: Partial<TarArchiveOptions>) {
    super(options);
    this._module = new Tar(options);
    this._supportsDirectory = true;
    this._supportsSymlink = true;
    this._modulePipe();
  }
}

export { ZipArchive, TarArchive, Archiver, type ProgressData };
