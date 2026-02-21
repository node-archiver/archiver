import { _setImmediate as setImmediate } from "./setImmediate";
import { isAsync } from "./wrapAsync";

function initialParams(fn) {
  return function (...args) {
    const callback = args.pop();
    return fn.call(this, args, callback);
  };
}

function asyncify(func) {
  if (isAsync(func)) {
    return function (...args) {
      const callback = args.pop();
      const promise = func.apply(this, args);
      return handlePromise(promise, callback);
    };
  }

  return initialParams(function (args, callback) {
    let result;
    try {
      result = func.apply(this, args);
    } catch (e) {
      return callback(e);
    }
    // if result is Promise object
    if (result && typeof result.then === "function") {
      return handlePromise(result, callback);
    } else {
      callback(null, result);
    }
  });
}

function handlePromise(promise, callback) {
  return promise.then(
    (value) => {
      invokeCallback(callback, null, value);
    },
    (err) => {
      invokeCallback(
        callback,
        err && (err instanceof Error || err.message) ? err : new Error(err),
      );
    },
  );
}

function invokeCallback(callback, error, value?) {
  try {
    callback(error, value);
  } catch (err) {
    setImmediate((e) => {
      throw e;
    }, err);
  }
}

export { asyncify };
