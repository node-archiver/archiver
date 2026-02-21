import * as fs from "node:fs";
import * as path from "node:path";
import {
  Transform,
  type TransformCallback,
  isReadable,
  isWritable,
  type Stream,
} from "node:stream";

import { dateify, sanitizePath } from "@archiver/zip-stream/utils";
import readdirGlob from "readdir-glob";

import { queue } from "./async";
import { ArchiverError } from "./error";
import { Readable } from "./lazystream";
import { normalizeInputSource, trailingSlashIt } from "./utils";

const { ReaddirGlob } = readdirGlob;

const win32 = process.platform === "win32";

interface EntryData {
  /** Sets the entry name including internal path. */
  name: string;
  /** Sets the entry date. */
  date?: Date | string;
  /** Sets the entry permissions. */
  mode?: number;
  /**
   * Sets a path prefix for the entry name.
   * Useful when working with methods like `directory` or `glob`.
   **/
  prefix?: string;
  /** Sets the fs stat data for this entry allowing for reduction of fs stat calls when stat data is already known. */
  stats?: fs.Stats;
}

function normalizeEntryData(data: EntryData, stats?: fs.Stats) {
  const normalizedData = {
    type: "file",
    name: null,
    date: null,
    mode: null,
    prefix: null,
    sourcePath: null,
    stats: null,
    ...data,
  };
  if (stats && normalizedData.stats === null) {
    normalizedData.stats = stats;
  }
  let isDir = normalizedData.type === "directory";
  if (normalizedData.name) {
    if (
      typeof normalizedData.prefix === "string" &&
      "" !== normalizedData.prefix
    ) {
      normalizedData.name = normalizedData.prefix + "/" + normalizedData.name;
      normalizedData.prefix = null;
    }
    normalizedData.name = sanitizePath(normalizedData.name);
    if (
      normalizedData.type !== "symlink" &&
      normalizedData.name.slice(-1) === "/"
    ) {
      isDir = true;
      normalizedData.type = "directory";
    } else if (isDir) {
      normalizedData.name += "/";
    }
  }
  // 511 === 0777; 493 === 0755; 438 === 0666; 420 === 0644
  if (typeof normalizedData.mode === "number") {
    if (win32) {
      normalizedData.mode &= 511;
    } else {
      normalizedData.mode &= 4095;
    }
  } else if (normalizedData.stats && normalizedData.mode === null) {
    if (win32) {
      normalizedData.mode = normalizedData.stats.mode & 511;
    } else {
      normalizedData.mode = normalizedData.stats.mode & 4095;
    }
    // stat isn't reliable on windows; force 0755 for dir
    if (win32 && isDir) {
      normalizedData.mode = 493;
    }
  } else if (normalizedData.mode === null) {
    normalizedData.mode = isDir ? 493 : 420;
  }
  if (normalizedData.stats && normalizedData.date === null) {
    normalizedData.date = normalizedData.stats.mtime;
  } else {
    normalizedData.date = dateify(normalizedData.date);
  }
  return normalizedData;
}

interface CoreOptions {
  /** Sets the number of workers used to process the internal fs stat queue. */
  statConcurrency: number;
}

interface TransformOptions {
  /** If set to false, then the stream will automatically end the readable side when the writable side ends and vice versa. */
  allowHalfOpen?: boolean;
  /** Sets objectMode for readable side of the stream. Has no effect if objectMode is true */
  readableObjectMode?: boolean;
  /** Sets objectMode for writable side of the stream. Has no effect if objectMode is true */
  writableObjectMode?: boolean;
  /** Sets objectMode for writable side of the stream. Has no effect if objectMode is true */
  decodeStrings?: boolean;
  /** If specified, then buffers will be decoded to strings using the specified encoding */
  encoding?: BufferEncoding;
  /** The maximum number of bytes to store in the internal buffer before ceasing to read from the underlying resource. */
  highWaterMark?: number;
  /**
   * Whether this stream should behave as a stream of objects.
   * Meaning that stream.read(n) returns a single value instead of a Buffer of size n.
   */
  objectMode?: boolean;
}

interface QueueTask {}

interface ProgressData {
  entries: {
    total: number;
    processed: number;
  };
  fs: {
    totalBytes: number;
    processedBytes: number;
  };
}

interface ArchiverOptions extends CoreOptions, TransformOptions {}

class Archiver extends Transform {
  _supportsDirectory = false;
  _supportsSymlink = false;

  options: ArchiverOptions;

  _module: Archiver;

  private _pointer: number;
  private _pending: number;

  private _state: {
    aborted: boolean;
    finalize: boolean;
    finalizing: boolean;
    finalized: boolean;
    modulePiped: boolean;
  };

  constructor(options?: Partial<ArchiverOptions>) {
    const normalizedOptions = {
      highWaterMark: 1024 * 1024,
      statConcurrency: 4,
      ...options,
    };

    super(normalizedOptions);

    this.options = normalizedOptions;

    this._module = null;

    this._pending = 0;
    this._pointer = 0;
    this._entriesCount = 0;
    this._entriesProcessedCount = 0;
    this._fsEntriesTotalBytes = 0;
    this._fsEntriesProcessedBytes = 0;
    this._queue = queue(this._onQueueTask.bind(this), 1);
    this._queue.drain(this._onQueueDrain.bind(this));
    this._statQueue = queue(
      this._onStatQueueTask.bind(this),
      normalizedOptions.statConcurrency,
    );
    this._statQueue.drain(this._onQueueDrain.bind(this));
    this._state = {
      aborted: false,
      finalize: false,
      finalizing: false,
      finalized: false,
      modulePiped: false,
    };
    this._streams = [];
  }

  /**
   * Internal logic for `abort`.
   */
  private _abort(): void {
    this._state.aborted = true;
    this._queue.kill();
    this._statQueue.kill();
    if (this._queue.idle()) {
      this._shutdown();
    }
  }

  /**
   * Internal helper for appending files.
   */
  private _append(filepath: string, data?: EntryData): void {
    data = data || {};
    let task = {
      source: null,
      filepath: filepath,
    };
    if (!data.name) {
      data.name = filepath;
    }
    data.sourcePath = filepath;
    task.data = data;
    this._entriesCount++;
    if (data.stats && data.stats instanceof fs.Stats) {
      task = this._updateQueueTaskWithStats(task, data.stats);
      if (task) {
        if (data.stats.size) {
          this._fsEntriesTotalBytes += data.stats.size;
        }
        this._queue.push(task);
      }
    } else {
      this._statQueue.push(task);
    }
  }

  /**
   * Internal logic for `finalize`.
   */
  private _finalize(): void {
    if (
      this._state.finalizing ||
      this._state.finalized ||
      this._state.aborted
    ) {
      return;
    }
    this._state.finalizing = true;
    this._moduleFinalize();
    this._state.finalizing = false;
    this._state.finalized = true;
  }

  /**
   * Checks the various state variables to determine if we can `finalize`.
   */
  protected _maybeFinalize(): boolean {
    if (
      this._state.finalizing ||
      this._state.finalized ||
      this._state.aborted
    ) {
      return false;
    }
    if (
      this._state.finalize &&
      this._pending === 0 &&
      this._queue.idle() &&
      this._statQueue.idle()
    ) {
      this._finalize();
      return true;
    }
    return false;
  }

  /**
   * Appends an entry to the module.
   */
  private _moduleAppend(
    source: Buffer | Stream,
    data: EntryData,
    callback,
  ): void {
    if (this._state.aborted) {
      callback();
      return;
    }

    this._module.append(source, data, (err) => {
      this._task = null;
      if (this._state.aborted) {
        this._shutdown();
        return;
      }
      if (err) {
        this.emit("error", err);
        setImmediate(callback);
        return;
      }

      this.emit("entry", data);
      this._entriesProcessedCount++;
      if (data.stats && data.stats.size) {
        this._fsEntriesProcessedBytes += data.stats.size;
      }

      this.emit("progress", {
        entries: {
          total: this._entriesCount,
          processed: this._entriesProcessedCount,
        },
        fs: {
          totalBytes: this._fsEntriesTotalBytes,
          processedBytes: this._fsEntriesProcessedBytes,
        },
      } satisfies ProgressData);
      setImmediate(callback);
    });
  }

  /**
   * Finalizes the module.
   */
  private _moduleFinalize(): void {
    if (typeof this._module.finalize === "function") {
      this._module.finalize();
    } else if (typeof this._module.end === "function") {
      this._module.end();
    } else {
      this.emit("error", new ArchiverError("NOENDMETHOD"));
    }
  }

  /**
   * Pipes the module to our internal stream with error bubbling.
   */
  protected _modulePipe(): void {
    this._module.on("error", this._onModuleError);
    this._module.pipe(this);
    this._state.modulePiped = true;
  }

  /**
   * Unpipes the module from our internal stream.
   */
  protected _moduleUnpipe(): void {
    this._module.unpipe(this);
    this._state.modulePiped = false;
  }

  /**
   * Error listener that re-emits error on to our internal stream.
   */
  private _onModuleError(err: Error): void {
    this.emit("error", err);
  }

  /**
   * Checks the various state variables after queue has drained to determine if we need to `finalize`.
   */
  private _onQueueDrain(): void {
    if (
      this._state.finalizing ||
      this._state.finalized ||
      this._state.aborted
    ) {
      return;
    }
    if (
      this._state.finalize &&
      this._pending === 0 &&
      this._queue.idle() &&
      this._statQueue.idle()
    ) {
      this._finalize();
    }
  }

  /**
   * Appends each queue task to the module.
   */
  private _onQueueTask(task, callback): void {
    const fullCallback = () => {
      if (task.data.callback) {
        task.data.callback();
      }
      callback();
    };
    if (
      this._state.finalizing ||
      this._state.finalized ||
      this._state.aborted
    ) {
      fullCallback();
      return;
    }
    this._task = task;
    this._moduleAppend(task.source, task.data, fullCallback);
  }

  /**
   * Performs a file stat and reinjects the task back into the queue.
   */
  private _onStatQueueTask(task: QueueTask, callback): void {
    if (
      this._state.finalizing ||
      this._state.finalized ||
      this._state.aborted
    ) {
      callback();
      return;
    }
    fs.lstat(task.filepath, (err, stats) => {
      if (this._state.aborted) {
        setImmediate(callback);
        return;
      }
      if (err) {
        this._entriesCount--;
        this.emit("warning", err);
        setImmediate(callback);
        return;
      }
      task = this._updateQueueTaskWithStats(task, stats);
      if (task) {
        if (stats.size) {
          this._fsEntriesTotalBytes += stats.size;
        }
        this._queue.push(task);
      }
      setImmediate(callback);
    });
  }

  /**
   * Unpipes the module and ends our internal stream.
   */
  private _shutdown(): void {
    this._moduleUnpipe();
    this.end();
  }

  /**
   * Tracks the bytes emitted by our internal stream.
   */
  public _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    if (chunk) {
      this._pointer += chunk.length;
    }
    callback(null, chunk);
  }

  /**
   * Updates and normalizes a queue task using stats data.
   */
  private _updateQueueTaskWithStats(task: QueueTask, stats: fs.Stats) {
    if (stats.isFile()) {
      task.data.type = "file";
      task.data.sourceType = "stream";
      task.source = new Readable(function () {
        return fs.createReadStream(task.filepath);
      });
    } else if (stats.isDirectory() && this._supportsDirectory) {
      task.data.name = trailingSlashIt(task.data.name);
      task.data.type = "directory";
      task.data.sourcePath = trailingSlashIt(task.filepath);
      task.data.sourceType = "buffer";
      task.source = Buffer.concat([]);
    } else if (stats.isSymbolicLink() && this._supportsSymlink) {
      const linkPath = fs.readlinkSync(task.filepath);
      const dirName = path.dirname(task.filepath);
      task.data.type = "symlink";
      task.data.linkname = path.relative(
        dirName,
        path.resolve(dirName, linkPath),
      );
      task.data.sourceType = "buffer";
      task.source = Buffer.concat([]);
    } else {
      if (stats.isDirectory()) {
        this.emit(
          "warning",
          new ArchiverError("DIRECTORYNOTSUPPORTED", task.data),
        );
      } else if (stats.isSymbolicLink()) {
        this.emit(
          "warning",
          new ArchiverError("SYMLINKNOTSUPPORTED", task.data),
        );
      } else {
        this.emit("warning", new ArchiverError("ENTRYNOTSUPPORTED", task.data));
      }
      return null;
    }
    task.data = normalizeEntryData(task.data, stats);
    return task;
  }

  /**
   * Aborts the archiving process, taking a best-effort approach, by:
   *
   * - removing any pending queue tasks
   * - allowing any active queue workers to finish
   * - detaching internal module pipes
   * - ending both sides of the Transform stream
   *
   * It will NOT drain any remaining sources.
   */
  abort(): this {
    if (this._state.aborted || this._state.finalized) {
      return this;
    }
    this._abort();
    return this;
  }

  /**
   * Appends an input source (text string, buffer, or stream) to the instance.
   *
   * When the instance has received, processed, and emitted the input, the `entry`
   * event is fired.
   */
  append(
    source: Buffer | Stream | string,
    data: EntryData,
    _callback?: unknown,
  ): this {
    if (this._state.finalize || this._state.aborted) {
      this.emit("error", new ArchiverError("QUEUECLOSED"));
      return this;
    }
    data = normalizeEntryData(data);
    if (typeof data.name !== "string" || data.name.length === 0) {
      this.emit("error", new ArchiverError("ENTRYNAMEREQUIRED"));
      return this;
    }
    if (data.type === "directory" && !this._supportsDirectory) {
      this.emit(
        "error",
        new ArchiverError("DIRECTORYNOTSUPPORTED", { name: data.name }),
      );
      return this;
    }
    source = normalizeInputSource(source);
    if (Buffer.isBuffer(source)) {
      data.sourceType = "buffer";
    } else if (isReadable(source) || isWritable(source)) {
      data.sourceType = "stream";
    } else {
      this.emit(
        "error",
        new ArchiverError("INPUTSTEAMBUFFERREQUIRED", { name: data.name }),
      );
      return this;
    }
    this._entriesCount++;
    this._queue.push({
      data: data,
      source: source,
    });
    return this;
  }

  /**
   * Appends a directory and its files, recursively, given its dirpath.
   */
  directory(
    dirpath: string,
    destpath: string,
    data: EntryData | ((entryData: EntryData) => EntryData),
  ): this {
    if (this._state.finalize || this._state.aborted) {
      this.emit("error", new ArchiverError("QUEUECLOSED"));
      return this;
    }
    if (typeof dirpath !== "string" || dirpath.length === 0) {
      this.emit("error", new ArchiverError("DIRECTORYDIRPATHREQUIRED"));
      return this;
    }
    this._pending++;
    if (destpath === false) {
      destpath = "";
    } else if (typeof destpath !== "string") {
      destpath = dirpath;
    }
    let dataFunction = null;
    if (typeof data === "function") {
      dataFunction = data;
      data = {};
    } else if (typeof data !== "object") {
      data = {};
    }
    const globOptions = {
      stat: true,
      dot: true,
    };
    function onGlobEnd() {
      this._pending--;
      this._maybeFinalize();
    }
    function onGlobError(err) {
      this.emit("error", err);
    }
    function onGlobMatch(match) {
      globber.pause();
      let ignoreMatch = false;
      let entryData = Object.assign({}, data);
      entryData.name = match.relative;
      entryData.prefix = destpath;
      entryData.stats = match.stat;
      entryData.callback = globber.resume.bind(globber);
      try {
        if (dataFunction) {
          entryData = dataFunction(entryData);
          if (entryData === false) {
            ignoreMatch = true;
          } else if (typeof entryData !== "object") {
            throw new ArchiverError("DIRECTORYFUNCTIONINVALIDDATA", {
              dirpath: dirpath,
            });
          }
        }
      } catch (e) {
        this.emit("error", e);
        return;
      }
      if (ignoreMatch) {
        globber.resume();
        return;
      }
      this._append(match.absolute, entryData);
    }
    const globber = readdirGlob(dirpath, globOptions);
    globber.on("error", onGlobError.bind(this));
    globber.on("match", onGlobMatch.bind(this));
    globber.on("end", onGlobEnd.bind(this));
    return this;
  }

  /**
   * Appends a file given its filepath.
   *
   * When the instance has received, processed, and emitted the file, the `entry` event is fired.
   */
  file(filepath: string, data?: EntryData): this {
    if (this._state.finalize || this._state.aborted) {
      this.emit("error", new ArchiverError("QUEUECLOSED"));
      return this;
    }
    if (typeof filepath !== "string" || filepath.length === 0) {
      this.emit("error", new ArchiverError("FILEFILEPATHREQUIRED"));
      return this;
    }
    this._append(filepath, data);
    return this;
  }

  /**
   * Appends multiple files that match a glob pattern.
   */
  glob(pattern: string, options, data: EntryData): this {
    this._pending++;
    options = { stat: true, pattern, ...options };
    function onGlobEnd() {
      this._pending--;
      this._maybeFinalize();
    }
    function onGlobError(err) {
      this.emit("error", err);
    }
    function onGlobMatch(match) {
      globber.pause();
      const entryData = Object.assign({}, data);
      entryData.callback = globber.resume.bind(globber);
      entryData.stats = match.stat;
      entryData.name = match.relative;
      this._append(match.absolute, entryData);
    }
    const globber = new ReaddirGlob(options.cwd || ".", options);
    globber.on("error", onGlobError.bind(this));
    globber.on("match", onGlobMatch.bind(this));
    globber.on("end", onGlobEnd.bind(this));
    return this;
  }

  /**
   * Finalizes the instance and prevents further appending to the archive
   * structure (queue will continue til drained).
   *
   * The `end`, `close` or `finish` events on the destination stream may fire
   * right after calling this method so you should set listeners beforehand to
   * properly detect stream completion.
   */
  finalize(): Promise<void> {
    if (this._state.aborted) {
      const abortedError = new ArchiverError("ABORTED");
      this.emit("error", abortedError);
      return Promise.reject(abortedError);
    }
    if (this._state.finalize) {
      const finalizingError = new ArchiverError("FINALIZING");
      this.emit("error", finalizingError);
      return Promise.reject(finalizingError);
    }
    this._state.finalize = true;
    if (this._pending === 0 && this._queue.idle() && this._statQueue.idle()) {
      this._finalize();
    }

    return new Promise<void>((resolve, reject) => {
      let errored;
      this._module.on("end", function () {
        if (!errored) {
          resolve();
        }
      });
      this._module.on("error", function (err) {
        errored = true;
        reject(err);
      });
    });
  }

  /**
   * Appends a symlink to the instance.
   *
   * This does NOT interact with filesystem and is used for programmatically creating symlinks.
   */
  symlink(filepath: string, target: string, mode: number): this {
    if (this._state.finalize || this._state.aborted) {
      this.emit("error", new ArchiverError("QUEUECLOSED"));
      return this;
    }
    if (typeof filepath !== "string" || filepath.length === 0) {
      this.emit("error", new ArchiverError("SYMLINKFILEPATHREQUIRED"));
      return this;
    }
    if (typeof target !== "string" || target.length === 0) {
      this.emit(
        "error",
        new ArchiverError("SYMLINKTARGETREQUIRED", { filepath: filepath }),
      );
      return this;
    }
    if (!this._supportsSymlink) {
      this.emit(
        "error",
        new ArchiverError("SYMLINKNOTSUPPORTED", { filepath: filepath }),
      );
      return this;
    }
    const data = {};
    data.type = "symlink";
    data.name = filepath.replace(/\\/g, "/");
    data.linkname = target.replace(/\\/g, "/");
    data.sourceType = "buffer";
    if (typeof mode === "number") {
      data.mode = mode;
    }
    this._entriesCount++;
    this._queue.push({
      data: data,
      source: Buffer.concat([]),
    });
    return this;
  }

  /**
   * @returns the current length (in bytes) that has been emitted.
   */
  pointer(): number {
    return this._pointer;
  }
}

export {
  Archiver,
  type ArchiverOptions,
  type ProgressData,
  normalizeEntryData,
};
