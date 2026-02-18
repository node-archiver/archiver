import { PassThrough } from "node:stream";

// Patch the given method of instance so that the callback
// is executed once, before the actual method is called the
// first time.
function beforeFirstCall(instance, method, callback) {
  const originalMethod = instance[method];
  instance[method] = function (...args) {
    // Restore the original method immediately
    instance[method] = originalMethod;
    // Execute the setup callback
    callback.apply(this, args);
    // Execute the original method with the arguments
    return originalMethod.apply(this, args);
  };
}

class Readable extends PassThrough {
  constructor(fn, options) {
    // This replaces 'call(this, options)'
    super(options);

    beforeFirstCall(this, "_read", function () {
      const source = fn.call(this, options);
      const emit = this.emit.bind(this, "error");

      source.on("error", emit);
      source.pipe(this);
    });

    this.emit("readable");
  }
}

export { Readable };
