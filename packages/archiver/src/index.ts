import { Archiver, type ArchiverOptions } from "./lib/core";
import { Json } from "./lib/plugins/json";
import { Tar, type TarOptions } from "./lib/plugins/tar";
import { Zip, type ZipOptions } from "./lib/plugins/zip";

interface ZipArchiveOptions
  extends Partial<ArchiverOptions>, Partial<ZipOptions> {}

class ZipArchive extends Archiver {
  constructor(options?: ZipArchiveOptions) {
    super(options);
    this._module = new Zip(options);
    this._supportsDirectory = true;
    this._supportsSymlink = true;
    this._modulePipe();
  }
}

interface TarArchiveOptions extends ArchiverOptions, TarOptions {}

class TarArchive extends Archiver {
  constructor(options?: TarArchiveOptions) {
    super(options);
    this._module = new Tar(options);
    this._supportsDirectory = true;
    this._supportsSymlink = true;
    this._modulePipe();
  }
}

interface JsonArchiveOptions extends ArchiverOptions {}

/**
 * @deprecated
 * There is no reason to use this. This will be removed
 */
class JsonArchive extends Archiver {
  constructor(options?: JsonArchiveOptions) {
    super(options);
    this._module = new Json(options);
    this._supportsDirectory = true;
    this._supportsSymlink = true;
    this._modulePipe();
  }
}

export { ZipArchive, TarArchive, JsonArchive, Archiver };
