import { Archiver } from "../../src/index.ts";
import type { ArchiverOptions } from "../../src/lib/core.ts";
import { Json } from "../../src/lib/plugins/json.ts";

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
