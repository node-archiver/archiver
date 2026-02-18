const hasQueueMicrotask =
  typeof queueMicrotask === "function" && queueMicrotask;
const hasSetImmediate = typeof setImmediate === "function" && setImmediate;
const hasNextTick =
  typeof process === "object" && typeof process.nextTick === "function";

function fallback(fn) {
  setTimeout(fn, 0);
}

function wrap(defer) {
  return (fn, ...args) => defer(() => fn(...args));
}

let _defer;

if (hasQueueMicrotask) {
  _defer = queueMicrotask;
} else if (hasSetImmediate) {
  _defer = setImmediate;
} else if (hasNextTick) {
  _defer = process.nextTick;
} else {
  _defer = fallback;
}

export const _setImmediate = wrap(_defer);
