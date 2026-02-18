import { Archiver } from "./lib/core";
import Json from "./lib/plugins/json";
import Tar from "./lib/plugins/tar";
import Zip from "./lib/plugins/zip";

class ZipArchive extends Archiver {
  constructor(options) {
    super(options);
    this._module = new Zip(options);
    this._supportsDirectory = true;
    this._supportsSymlink = true;
    this._modulePipe();
  }
}

class TarArchive extends Archiver {
  constructor(options) {
    super(options);
    this._module = new Tar(options);
    this._supportsDirectory = true;
    this._supportsSymlink = true;
    this._modulePipe();
  }
}

/**
 * @deprecated
 * There is no reason to use this. This will be removed
 */
class JsonArchive extends Archiver {
  constructor(options) {
    super(options);
    this._module = new Json(options);
    this._supportsDirectory = true;
    this._supportsSymlink = true;
    this._modulePipe();
  }
}

export { ZipArchive, TarArchive, JsonArchive, Archiver };
