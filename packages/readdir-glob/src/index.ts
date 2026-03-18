import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import type { Dirent, Stats } from "node:fs";
import * as path from "node:path";

export type Stat = Stats | Dirent;
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

/**
 * A lightweight, zero-dependency Glob to RegExp compiler.
 * Replaces the need for picomatch while handling standard glob mechanics.
 */
function globToRegExp(pattern: string, opts: StrictOptions): RegExp {
  let re = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (
      c === "/" &&
      pattern[i + 1] === "*" &&
      pattern[i + 2] === "*" &&
      i + 3 === pattern.length &&
      !opts.noglobstar
    ) {
      // /** at the end matches the directory itself and its contents
      re += "(?:\\/.*)?";
      i += 2;
    } else if (c === "/" || c === "\\") {
      re += "\\/";
    } else if (c === "*" && pattern[i + 1] === "*" && !opts.noglobstar) {
      if (pattern[i + 2] === "/") {
        re += "(?:.*\\/)?";
        i += 2;
      } else {
        re += ".*";
        i++;
      }
    } else if (c === "*") {
      re += "[^/]*";
    } else if (c === "?") {
      re += "[^/]";
    } else if (c === "{") {
      const end = pattern.indexOf("}", i);
      if (end !== -1) {
        const inner = pattern.slice(i + 1, end);
        re += `(?:${inner
          .split(",")
          .map((p) => globToRegExp(p, opts).source.slice(1, -1))
          .join("|")})`;
        i = end;
      } else {
        re += "\\{";
      }
    } else if ("+^$()|[].".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
    i++;
  }
  return new RegExp(re + "$", opts.nocase ? "i" : "");
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
  private queue: string[] = [];
  private exploring = 0;

  private patterns: { str: string; re: RegExp }[];
  private ignores: RegExp[];
  private skips: RegExp[];

  constructor(cwd?: string, options?: Options | Callback, cb?: Callback) {
    super();
    if (typeof options === "function") {
      cb = options;
      options = undefined;
    }

    this.options = readOptions(options || {});
    this.cwd = path.resolve(cwd || ".");

    const compile = (p: string) => globToRegExp(p, this.options);

    const pats = Array.isArray(this.options.pattern)
      ? this.options.pattern
      : [this.options.pattern || "**/*"];
    this.patterns = pats.map((p) => ({ str: p, re: compile(p) }));

    const igns = this.options.ignore
      ? Array.isArray(this.options.ignore)
        ? this.options.ignore
        : [this.options.ignore]
      : [];
    this.ignores = igns.map(compile);

    const skps = this.options.skip
      ? Array.isArray(this.options.skip)
        ? this.options.skip
        : [this.options.skip]
      : [];
    this.skips = skps.map(compile);

    this.queue.push(""); // Start exploring from the base directory

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

  private _next() {
    if (this.paused || this.aborted) {
      this.inactive = true;
      return;
    }

    if (this.queue.length === 0 && this.exploring === 0) {
      this.emit("end");
      return;
    }

    // Process a batch of directories concurrently up to a limit to prevent call stack sizing
    while (this.queue.length > 0 && this.exploring < 10) {
      const dirRel = this.queue.shift()!;
      this.exploring++;
      this._explore(dirRel);
    }
  }

  private async _explore(dirRel: string) {
    const absoluteDir = dirRel === "" ? this.cwd : path.join(this.cwd, dirRel);

    try {
      const entries = await fs.readdir(absoluteDir, { withFileTypes: true });

      for (const entry of entries) {
        if (this.paused || this.aborted) break;

        const name = entry.name;
        // Normalize slashes to always be posix-style for glob matching
        const relPath = dirRel === "" ? name : dirRel + "/" + name;
        const absPath = path.join(absoluteDir, name);

        // 1. Check Skips (stops exploration of directories)
        if (this.skips.some((re) => re.test(relPath))) continue;

        let isDir = entry.isDirectory();
        let isSymlink = entry.isSymbolicLink();
        let statObj: Stat = entry;

        // 2. Handle Symlinks & Stats
        if (isSymlink) {
          if (this.options.follow) {
            try {
              const stat = await fs.stat(absPath);
              isDir = stat.isDirectory();
              statObj = stat;
            } catch {
              // Gracefully handle broken symlinks. Do not treat as a directory.
              isDir = false;
            }
          } else {
            isDir = false;
          }
        } else if (this.options.stat) {
          try {
            statObj = await (this.options.follow
              ? fs.stat(absPath)
              : fs.lstat(absPath));
          } catch {
            // Ignore stat failures to continue walking safely
          }
        }

        // 3. Queue directories for recursive exploration
        if (isDir) {
          this.queue.push(relPath);
        }

        // 4. Match validations
        if (this.options.nodir && isDir) continue;

        if (!this.options.dot && /(?:^|\/)\.[^\/]/.test(relPath)) {
          // If dot:false, reject hidden paths unless explicitly matched by a pattern
          const explicitlyMatched = this.patterns.some((p) =>
            /(?:^|\/)\./.test(p.str),
          );
          if (!explicitlyMatched) continue;
        }

        const isMatched = this.patterns.some((p) => {
          if (this.options.matchBase && !p.str.includes("/")) {
            return p.re.test(name);
          }
          return p.re.test(relPath);
        });

        if (!isMatched) continue;

        if (this.ignores.some((re) => re.test(relPath))) continue;

        // 5. Construct Match result
        let matchRel = relPath;
        let matchAbs = absPath.replace(/\\/g, "/");

        if (this.options.mark && isDir) {
          matchRel += "/";
          matchAbs += "/";
        }

        this.emit("match", {
          relative: matchRel,
          absolute: matchAbs,
          ...(this.options.stat ? { stat: statObj } : {}),
        });
      }
    } catch (err) {
      if (!this.options.silent) {
        this.emit("error", err);
      }
    } finally {
      this.exploring--;
      this._next();
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
