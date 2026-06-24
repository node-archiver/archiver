import { Archiver } from "../../src/index.js";
import type { ArchiverOptions } from "../../src/lib/core.js";
import { Json } from "../../src/lib/plugins/json.js";

interface JsonArchiveOptions extends ArchiverOptions {}

export class JsonArchive extends Archiver {
  constructor(options?: Partial<JsonArchiveOptions>) {
    super(options);
    this._module = new Json(options);
    this._supportsDirectory = true;
    this._supportsSymlink = true;
    this._modulePipe();
  }
}
