import { queue as _queue } from "./queue.js";
import { wrapAsync } from "./wrapAsync.js";

function queue(worker, concurrency: number) {
  const _worker = wrapAsync(worker);

  return _queue(
    (items, cb) => {
      _worker(items[0], cb);
    },
    concurrency,
    1,
  );
}

export { queue };
