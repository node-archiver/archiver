import { asyncify } from "../asyncify.js";

function isAsync(fn) {
  return fn[Symbol.toStringTag] === "AsyncFunction";
}

function wrapAsync(asyncFn) {
  if (typeof asyncFn !== "function") throw new Error("expected a function");
  return isAsync(asyncFn) ? (0, asyncify)(asyncFn) : asyncFn;
}

export { wrapAsync, isAsync };
