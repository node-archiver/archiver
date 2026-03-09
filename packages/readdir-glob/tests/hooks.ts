import { afterAll, afterEach, beforeAll } from "bun:test";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
// just a little pre-run script to set up the fixtures.
// zz-finish cleans it up
import * as path from "node:path";

function cleanResults(m: string[]) {
  // normalize discrepancies in ordering, duplication,
  // and ending slashes.
  return m.sort(alphasort);
}

function flatten(chunks) {
  let s = 0;
  chunks.forEach(function (c) {
    s += c.length;
  });
  const out = Buffer.alloc(s);
  s = 0;
  chunks.forEach(function (c) {
    c.copy(out, s);
    s += c.length;
  });
  return out.toString().trim();
}

function alphasort(a: string, b: string) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  return a > b ? 1 : a < b ? -1 : 0;
}

beforeAll(async () => {
  const fixtureDir = path.resolve(__dirname, "fixtures");

  let files = [
    "a/.abcdef/x/y/z/a",
    "a/abcdef/g/h",
    "a/abcfed/g/h",
    "a/b/c/d",
    "a/bc/e/f",
    "a/c/d/c/b",
    "a/cb/e/f",
    "a/x/.y/b",
    "a/z/.y/b",
  ];

  const symlinkTo = path.resolve(fixtureDir, "a/symlink/a/b/c");
  const symlinkFrom = "../../../b";

  files = files.map((f) => path.resolve(fixtureDir, f));

  await new Promise((resolve) =>
    fs.rm(fixtureDir, { recursive: true, force: true }, resolve),
  );

  for (let f of files) {
    f = path.resolve(fixtureDir, f);
    const d = path.dirname(f);
    await fsPromises.mkdir(d, { recursive: true, mode: "0755" });
    await fsPromises.writeFile(f, "i like tests");
  }

  if (process.platform !== "win32") {
    const d = path.dirname(symlinkTo);
    await fsPromises.mkdir(d, "0755");
    await fsPromises.symlink(symlinkFrom, symlinkTo, "dir");
  }

  // generate the bash pattern test-fixtures if possible
  if (process.platform === "win32" || !process.env.TEST_REGEN) {
    //console.info('Windows, or TEST_REGEN unset.  Using cached fixtures.');
    return;
  }

  const globs = [
    // put more patterns here.
    // anything that would be directly in / should be in /tmp/glob-test
    "a/{b,c,d,e,f}/**/g",
    "a/b/**",
    "**/g",
    "a/abc{fed,def}/g/h",
    "a/abc{fed/g,def}/**/",
    "a/abc{fed/g,def}/**///**/",
    "**/a/**/",
    "+(a|b|c)/a{/,bc*}/**",
    "*/*/*/f",
    "**/f",
    "a/!(symlink)/**",
    "a/symlink/a/**/*",
  ];
  const bashOutput = {};

  try {
    for (const pattern of globs) {
      const opts = [
        "-O",
        "globstar",
        "-O",
        "extglob",
        "-O",
        "nullglob",
        "-c",
        "for i in " + pattern + "; do echo $i; done",
      ];
      const cp = spawn("bash", opts, { cwd: fixtureDir });
      let out: string[] = [];
      cp.stdout.on("data", function (c) {
        out.push(c);
      });
      cp.stderr.pipe(process.stderr);
      await new Promise<void>((resolve, reject) => {
        cp.on("close", (code) => {
          if (code !== 0) {
            reject();
          }
          const flattenOut = flatten(out);
          if (!flattenOut) {
            out = [];
          } else {
            out = cleanResults(flattenOut.split(/\r*\n/));
          }

          bashOutput[pattern] = out;
          resolve();
        });
      });
    }
  } catch {
    // Something went wrong when using bash, bash-results.json should not be overriden.
    console.error("Unable to regenerate bash-results.json");
    return;
  }

  const fname = path.resolve(__dirname, "bash-results.json");
  const data = JSON.stringify(bashOutput, null, 2) + "\n";
  await fsPromises.writeFile(fname, data);
});

afterAll(async () => {
  await new Promise((resolve) =>
    fs.rm(
      path.resolve(__dirname, "fixtures"),
      { recursive: true, force: true },
      resolve,
    ),
  );
});

const origCwd = process.cwd();
afterEach(async () => {
  process.chdir(origCwd);
});
