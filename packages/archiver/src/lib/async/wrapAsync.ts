import { asyncify } from "./asyncify";

function isAsync(fn) {
  return fn[Symbol.toStringTag] === "AsyncFunction";
}

function wrapAsync(asyncFn) {
  if (typeof asyncFn !== "function") throw new Error("expected a function");
  return isAsync(asyncFn) ? asyncify(asyncFn) : asyncFn;
}

export { wrapAsync, isAsync };
