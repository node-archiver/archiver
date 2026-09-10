import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import { resolve } from "node:path";

type MatchFn = (path: string, isDirectory?: boolean) => boolean;

function readdir(dir: fs.PathLike, strict: boolean): Promise<fs.Dirent[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, { withFileTypes: true }, (err, files) => {
      if (err) {
        switch (err.code) {
          case "ENOTDIR": // Not a directory
            if (strict) {
              reject(err);
            } else {
              resolve([]);
            }
            break;
          case "ENOTSUP": // Operation not supported
          case "ENOENT": // No such file or directory
          case "ENAMETOOLONG": // Filename too long
          case "UNKNOWN":
            resolve([]);
            break;
          case "ELOOP": // Too many levels of symbolic links
          default:
            reject(err);
            break;
        }
      } else {
        resolve(files);
      }
    });
  });
}

function getStat(
  file: fs.PathLike,
  followSymlinks: boolean,
): Promise<fs.Stats | null> {
  return new Promise((resolve) => {
    const statFunc = followSymlinks ? fs.stat : fs.lstat;
    statFunc(file, (err, stats) => {
      if (err) {
        switch (err.code) {
          case "ENOENT":
            if (followSymlinks) {
              // Fallback to lstat to handle broken links as files
              resolve(getStat(file, false));
            } else {
              resolve(null);
            }
            break;
          default:
            resolve(null);
            break;
        }
      } else {
        resolve(stats);
      }
    });
  });
}

export type Stat = fs.Dirent | fs.Stats;
export type Match = {
  relative: string;
  absolute: string;
  stat?: Stat;
};

async function* exploreWalkAsync(
  dir: string,
  path: string,
  followSymlinks: boolean,
  useStat: boolean,
  shouldSkip: (path: string) => boolean,
  strict: boolean,
): AsyncGenerator<Required<Match>> {
  const files = await readdir(path + dir, strict);
  for (const file of files) {
    const name: string = file.name;
    const filename = `${dir}/${name}`;
    const relative = filename.slice(1); // Remove the leading /
    const absolute = `${path}/${relative}`;
    let stat: Stat = file;
    if (useStat || followSymlinks) {
      stat = (await getStat(absolute, followSymlinks)) ?? stat;
    }
    if (stat.isDirectory()) {
      if (!shouldSkip(relative)) {
        yield { relative, absolute, stat };
        yield* exploreWalkAsync(
          filename,
          path,
          followSymlinks,
          useStat,
          shouldSkip,
          false,
        );
      }
    } else {
      yield { relative, absolute, stat };
    }
  }
}

async function* explore(
  path: string,
  followSymlinks: boolean,
  useStat: boolean,
  shouldSkip: (path: string) => boolean,
): AsyncGenerator<Required<Match>> {
  yield* exploreWalkAsync("", path, followSymlinks, useStat, shouldSkip, true);
}

export class ReaddirNoGlob extends EventEmitter<{
  match: [Match];
  end: [];
  error: [NodeJS.ErrnoException];
}> {
  private matchers: MatchFn[];
  private ignoreMatchers: MatchFn[];
  private skipMatchers: MatchFn[];

  public paused: boolean;
  public aborted: boolean;
  private inactive: boolean;

  private iterator: ReturnType<typeof explore>;

  constructor(cwd: string) {
    super();

    this.matchers = [];

    this.ignoreMatchers = [];

    this.skipMatchers = [];

    this.iterator = explore(
      resolve(cwd || "."),
      false,
      true,
      this._shouldSkipDirectory.bind(this),
    );
    this.paused = false;
    this.inactive = false;
    this.aborted = false;

    setTimeout(() => this._next());
  }

  private _shouldSkipDirectory(relative: string) {
    return this.skipMatchers.some((m) => m(relative));
  }

  private _fileMatches(relative: string, isDirectory: boolean) {
    return (
      (this.matchers.length === 0 ||
        this.matchers.some((m) => m(relative, isDirectory))) &&
      !this.ignoreMatchers.some((m) => m(relative, isDirectory))
    );
  }

  private _next() {
    if (!this.paused && !this.aborted) {
      this.iterator
        .next()
        .then((obj) => {
          if (!obj.done) {
            const isDirectory = obj.value.stat.isDirectory();
            if (this._fileMatches(obj.value.relative, isDirectory)) {
              const relative = obj.value.relative;
              const absolute = obj.value.absolute;
              this.emit("match", {
                relative,
                absolute,
                stat: obj.value.stat,
              });
            }
            this._next();
          } else {
            this.emit("end");
          }
        })
        .catch((err: NodeJS.ErrnoException) => {
          this.abort();
          this.emit("error", err);
          if (!err.code) {
            console.error(err);
          }
        });
    } else {
      this.inactive = true;
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

export const readdirNoGlob = (cwd: string): ReaddirNoGlob =>
  new ReaddirNoGlob(cwd);
