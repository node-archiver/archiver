function onlyOnce(fn) {
  return function (...args) {
    if (fn === null) throw new Error("Callback was already called.");
    const callFn = fn;
    fn = null;
    callFn.apply(this, args);
  };
}

export { onlyOnce };
