import { wrapAsync } from "./asyncify";
import { queue as _queue, type Queue } from "./queue";

function queue<T>(
  worker: (task: T, callback: () => void) => void,
  concurrency: number,
): Queue {
  const _worker = wrapAsync(worker);

  return _queue((items: unknown[], cb: () => void) => {
    _worker(items[0] as T, cb);
  }, concurrency);
}

export { queue };
