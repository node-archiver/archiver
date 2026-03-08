# Migration Guide: `archiver` to `@archiver/archiver`


---

## Quick Migration

There are three breaking changes:

1. **Node.js >= 24 required.** The new package uses modern Node.js APIs directly instead of polyfilling them with `readable-stream` and other shims.

2. **ESM only.** No CommonJS build. Node.js >= 22 can `require()` ESM natively, or use `import()` / a bundler.

3. **Class constructors instead of factory function.** The format string is gone — import and instantiate the class you need.

For most codebases, migration is a two-line change:

**Before:**

```js
const archiver = require('archiver')
const archive = archiver('zip', { zlib: { level: 9 } })
```

**After:**

```ts
import { ZipArchive } from '@archiver/archiver'
const archive = new ZipArchive({ zlib: { level: 9 } })
```

Every method call after the constructor stays the same. Options are passed directly — no wrapping needed.

If you were using `archiver.create('zip', options)`, replace it the same way.

If you dynamically choose the format at runtime, use a simple conditional:

```ts
import { ZipArchive, TarArchive } from '@archiver/archiver'

function createArchive(format: 'zip' | 'tar', options?: any) {
  if (format === 'zip') return new ZipArchive(options)
  if (format === 'tar') return new TarArchive(options)
  throw new Error(`Unknown format: ${format}`)
}
```

---

## Step-by-Step

### Installation

Install `@archiver/archiver`

```bash
npm install @archiver/archiver
```

Remove `archiver` and `@types/archiver`

```bash
npm remove archiver @types/archiver
```

---

### Creating a ZIP Archive

**Before:**

```js
const archiver = require('archiver')
const fs = require('fs')

const output = fs.createWriteStream('archive.zip')
const archive = archiver('zip', {
  zlib: { level: 9 },
  comment: 'my archive',
})

archive.pipe(output)
archive.append('hello world', { name: 'hello.txt' })
await archive.finalize()
```

**After:**

```ts
import { ZipArchive } from '@archiver/archiver'
import { createWriteStream } from 'node:fs'

const output = createWriteStream('archive.zip')
const archive = new ZipArchive({
  zlib: { level: 9 },
  comment: 'my archive',
})

archive.pipe(output)
archive.append('hello world', { name: 'hello.txt' })
await archive.finalize()
```


### Creating a TAR Archive

**Before:**

```js
const archiver = require('archiver')
const archive = archiver('tar')
```

**After:**

```ts
import { TarArchive } from '@archiver/archiver'
const archive = new TarArchive()
```

---

### Creating a TAR.GZ Archive

**Before:**

```js
const archive = archiver('tar', {
  gzip: true,
  gzipOptions: { level: 1 },
})
```

**After:**

```ts
const archive = new TarArchive({
  gzip: true,
  gzipOptions: { level: 1 },
})
```

---

## What's Been Removed

These APIs existed on the old `archiver` factory function and are no longer needed with the class-based approach:

| Old API | Status | Why |
|---|---|---|
| `archiver.registerFormat(format, module)` | Removed | Not needed — use `ZipArchive` or `TarArchive` directly |
| `archiver.isRegisteredFormat(format)` | Removed | Not needed — formats are classes, not a registry |
| `archive.setFormat(format)` | Removed | Format is determined by which class you instantiate |
| `archive.setModule(module)` | Removed | Module is set internally by the class constructor |
| `JsonArchive` | Deprecated | Exported for compatibility but will be removed. There is no practical use for it. |

If you were using `registerFormat` to add custom archive formats, you can extend the `Archiver` base class directly instead.

---

## What's New

**Native TypeScript types.** Types ship with the package. No more `@types/archiver` or guessing at option shapes — your editor knows exactly what `ZipArchive` accepts.

**ESM by default.** The package ships as ES modules. Works with `import` out of the box.

**Class-based API with full type inference.** `ZipArchive` and `TarArchive` are real classes with distinct option types. The old string-based `archiver('zip')` pattern lost type information — the new approach gives you autocomplete on format-specific options.

**Dramatically smaller install.**

| | `archiver` (old) | `@archiver/archiver` (new) |
|---|---|---|
| Package Size | 43.1 kB | 38.7 kB |
| Install Size | 9.9 MB  | 227 kB  |
| Dependencies | 66 transitive | 8 total |
| Native types | No | Yes |
| ESM | No | Yes |

---

## Package Mapping

If you depend on any of the underlying packages directly, here is how they map:

| Old package | New package |
|---|---|
| `archiver` | `@archiver/archiver` |
| `zip-stream` | `@archiver/zip-stream` |
| `compress-commons` | `@archiver/compress-commons` |
| `tar-stream` (by @mafintosh) | `@archiver/tar-stream` |
| `is-stream` | Use `isStream` from `@archiver/compress-commons/util` |
| `normalize-path` | Use `normalizePath` from `@archiver/compress-commons/util` |

All new packages live under the `@archiver` npm scope and are published from a single monorepo at [github.com/node-archiver/archiver](https://github.com/node-archiver/archiver).
