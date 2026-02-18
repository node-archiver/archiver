import { queue as _queue } from "./internal/queue.js";
import { wrapAsync } from "./internal/wrapAsync.js";

function queue(worker, concurrency) {
  const _worker = (0, wrapAsync)(worker);

  return (0, _queue)(
    (items, cb) => {
      _worker(items[0], cb);
    },
    concurrency,
    1,
  );
}

export { queue };
