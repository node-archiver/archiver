import { Minimatch } from "minimatch";
import picomatch from "picomatch";

const patterns = [
  "**/*.js",
  "a/!(symlink)/**",
  "a/*b*/**",
  "{*.md,tests}",
  "a/symlink/{*,**/*/*/*,*/*/**,*/*/*/*/*/*}",
  "a/**/b",
  "**",
  "*.js",
];

const paths = [
  "a/abcdef/g/h",
  "a/.abcdef/x",
  "a/b/c/d",
  "a/symlink/a/b/c",
  "tests",
  "README.md",
  "src/index.js",
  "deep/nested/path/to/file.js",
  "a/z/.y/b",
  "a/bc/e/f",
];

const ITERATIONS = 100_000;

// Benchmark minimatch
console.log("--- minimatch ---");
const mmMatchers = patterns.map((p) => new Minimatch(p));
const mmStart = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const m of mmMatchers) {
    for (const p of paths) {
      m.match(p);
    }
  }
}
const mmTime = performance.now() - mmStart;
console.log(`${ITERATIONS} iterations x ${patterns.length} patterns x ${paths.length} paths`);
console.log(`Total: ${mmTime.toFixed(1)}ms`);
console.log(`Per match: ${((mmTime / (ITERATIONS * patterns.length * paths.length)) * 1000).toFixed(2)}µs`);

// Benchmark picomatch
console.log("\n--- picomatch ---");
const pmMatchers = patterns.map((p) => picomatch(p));
const pmStart = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const m of pmMatchers) {
    for (const p of paths) {
      m(p);
    }
  }
}
const pmTime = performance.now() - pmStart;
console.log(`${ITERATIONS} iterations x ${patterns.length} patterns x ${paths.length} paths`);
console.log(`Total: ${pmTime.toFixed(1)}ms`);
console.log(`Per match: ${((pmTime / (ITERATIONS * patterns.length * paths.length)) * 1000).toFixed(2)}µs`);

console.log(`\n--- Result ---`);
console.log(`picomatch is ${(mmTime / pmTime).toFixed(2)}x faster than minimatch`);
