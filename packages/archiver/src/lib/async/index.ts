import { queue as _queue } from "./queue";
import { wrapAsync } from "./wrapAsync";

function queue(worker, concurrency: number) {
  const _worker = wrapAsync(worker);

  return _queue((items, cb) => {
    _worker(items[0], cb);
  }, concurrency);
}

export { queue };
