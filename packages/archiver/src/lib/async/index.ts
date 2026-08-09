import { wrapAsync } from "./asyncify.ts";
import { queue as _queue } from "./queue.ts";

function queue<T>(
  worker: (task: T, callback: () => void) => void,
  concurrency: number,
) {
  const _worker = wrapAsync(worker);

  return _queue((items, cb) => {
    _worker(items[0], cb);
  }, concurrency);
}

export { queue };
