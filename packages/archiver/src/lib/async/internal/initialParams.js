function initialParams(fn) {
  return function (...args /*, callback*/) {
    const callback = args.pop();
    return fn.call(this, args, callback);
  };
}

export { initialParams };
