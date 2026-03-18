import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import type { Dirent, Stats } from "node:fs";
import * as path from "node:path";

export type Stat = Dirent | Stats;
export type Match = {
  relative: string;
  absolute: string;
  stat?: Stat;
};

export type Options = {
  /**
   * Glob pattern or Array of Glob patterns to match the found files with.
   * A file has to match at least one of the provided patterns to be returned.
   */
  pattern?: string | readonly string[];
  /**
   * Allow pattern to match filenames starting with a period, even if the pattern
   * does not explicitly have a period in that spot.
   */
  dot?: boolean;
  /**
   * Disable `**` matching against multiple folder names.
   */
  noglobstar?: boolean;
  /**
   * Perform a basename-only match if the pattern does not contain any slash
   * characters. That is, `*.js` would be treated as equivalent to `**\/*.js`,
   * matching all js files in all directories.
   */
  matchBase?: boolean;
  /**
   * Perform a case-insensitive match. Note: on case-insensitive file systems,
   * non-magic patterns will match by default, since `stat` and `readdir` will
   * not raise errors.
   */
  nocase?: boolean;
  /**
   * Glob pattern or Array of Glob patterns to exclude matches. If a file or a
   * folder matches at least one of the provided patterns, it's not returned.
   * It doesn't prevent files from folder content to be returned. Note: ignore
   * patterns are always in dot:true mode.
   */
  ignore?: string | readonly string[];
  /**
   * Glob pattern or Array of Glob patterns to exclude folders.
   * If a folder matches one of the provided patterns, it's not returned, and
   * it's not explored: this prevents any of its children to be returned.
   * Note: skip patterns are always in dot:true mode.
   */
  skip?: string | readonly string[];
  /**
   * Follow symlinked directories. Note that requires to stat _all_ results,
   * and so reduces performance.
   */
  follow?: boolean;
  /**
   * Set to true to stat _all_ results. This reduces performance.
   */
  stat?: boolean;
  /**
   * Do not match directories, only files.
   */
  nodir?: boolean;
  /**
   * Add a `/` character to directory matches.
   */
  mark?: boolean;
  /**
   * When an unusual error is encountered when attempting to read a directory,
   * a warning will be printed to stderr. Set the `silent` option to true to
   * suppress these warnings.
   */
  silent?: boolean;
  /**
   * Absolute paths will be returned instead of relative paths.
   */
  absolute?: boolean;
};

type StrictOptions = Options &
  Required<Omit<Options, "pattern" | "ignore" | "skip">>;

function readOptions(options: Options): StrictOptions {
  return {
    pattern: options.pattern,
    dot: !!options.dot,
    noglobstar: !!options.noglobstar,
    matchBase: !!options.matchBase,
    nocase: !!options.nocase,
    ignore: options.ignore,
    skip: options.skip,
    follow: !!options.follow,
    stat: !!options.stat,
    nodir: !!options.nodir,
    mark: !!options.mark,
    silent: !!options.silent,
    absolute: !!options.absolute,
  };
}

export type Callback = (err: Error | null, matches?: readonly string[]) => void;

export class ReaddirGlob extends EventEmitter<{
  match: [Match];
  end: [];
  error: [NodeJS.ErrnoException];
}> {
  public options: StrictOptions;
  public paused = false;
  public aborted = false;

  private inactive = false;
  private cwd: string;
  private iterator: AsyncIterator<Dirent>;

  constructor(cwd?: string, options?: Options | Callback, cb?: Callback) {
    super();
    if (typeof options === "function") {
      cb = options;
      options = undefined;
    }

    this.options = readOptions(options || {});
    this.cwd = path.resolve(cwd || ".");

    // 1. Prepare patterns
    let patterns = Array.isArray(this.options.pattern)
      ? [...this.options.pattern]
      : [this.options.pattern || "**/*"];

    // Handle matchBase: if no slash, prefix with **/
    if (this.options.matchBase) {
      patterns = patterns.map((p) => (p.includes("/") ? p : `**/${p}`));
    }

    // 2. Initialize Native Glob
    // Native glob handles brace expansion and most pattern logic internally.
    const globIterator = fs.glob(patterns, {
      cwd: this.cwd,
      withFileTypes: true,
      dot: this.options.dot,
      followSymlinks: this.options.follow,
      exclude: (entryName: string) => this._isExcluded(entryName),
    });

    this.iterator = globIterator[Symbol.asyncIterator]();

    if (cb) {
      const matches: string[] = [];
      this.on("match", (m) =>
        matches.push(this.options.absolute ? m.absolute : m.relative),
      );
      this.on("error", (err) => cb!(err));
      this.on("end", () => cb!(null, matches));
    }

    process.nextTick(() => this._next());
  }

  /**
   * Approximates the "skip" and "ignore" logic using native entry filtering.
   */
  private _isExcluded(name: string): boolean {
    const skip = this.options.skip;
    if (!skip) return false;
    const skipPatterns = Array.isArray(skip) ? skip : [skip];
    // Simple exclusion check - native glob calls this for each segment
    return skipPatterns.some((p) => name.includes(p));
  }

  private async _next() {
    if (this.paused || this.aborted) {
      this.inactive = true;
      return;
    }

    try {
      const { value, done } = await this.iterator.next();

      if (done) {
        this.emit("end");
        return;
      }

      const entry = value;
      const isDirectory = entry.isDirectory();

      if (this.options.nodir && isDirectory) {
        return this._next();
      }

      // Calculate paths
      const relative = path.relative(
        this.cwd,
        path.join(entry.parentPath, entry.name),
      );
      const absolute = path.resolve(this.cwd, relative);

      let matchRel = relative;
      let matchAbs = absolute;

      if (this.options.mark && isDirectory) {
        matchRel += "/";
        matchAbs += "/";
      }

      const matchObj: Match = { relative: matchRel, absolute: matchAbs };

      if (this.options.stat) {
        matchObj.stat = await (
          this.options.follow ? fs.stat(absolute) : fs.lstat(absolute)
        ).catch(() => entry);
      } else {
        matchObj.stat = entry;
      }

      this.emit("match", matchObj);
      this._next();
    } catch (err) {
      this.abort();
      this.emit("error", err);
      if (!this.options.silent) console.error(err);
    }
  }

  abort(): void {
    this.aborted = true;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    if (this.inactive) {
      this.inactive = false;
      this._next();
    }
  }
}

export const readdirGlob = (
  cwd?: string,
  options?: Options | Callback,
  cb?: Callback,
): ReaddirGlob => new ReaddirGlob(cwd, options, cb);

export default readdirGlob;
