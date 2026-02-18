import * as fs from "node:fs";
import { PassThrough } from "node:stream";

// Patch the given method of instance so that the callback
// is executed once, before the actual method is called the
// first time.
function beforeFirstCall(instance: Readable, callback: () => void) {
  const originalMethod = instance._read;

  instance._read = function (...args) {
    // Restore the original method immediately
    instance._read = originalMethod;
    // Execute the setup callback
    callback.apply(this);
    // Execute the original method with the arguments
    return originalMethod.apply(this, args);
  };
}

class Readable extends PassThrough {
  constructor(fn: () => fs.ReadStream) {
    super();

    beforeFirstCall(this, () => {
      const source = fn.call(this);
      const emit = this.emit.bind(this, "error");

      source.on("error", emit);
      source.pipe(this);
    });

    this.emit("readable");
  }
}

export { Readable };
