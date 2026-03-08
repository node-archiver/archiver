# Migration Guide: `archiver` to `@archiver/archiver`

`@archiver/archiver` is a modern rewrite of the original [`archiver`](https://github.com/archiverjs/node-archiver) package. The API surface is nearly identical — same methods, same events, same options. The main difference is how you import and instantiate an archive. Everything else should feel familiar.

The rewrite drops the vast majority of the dependency tree (66 transitive down to 8 total), ships native TypeScript types, and weighs in at 38.7 kB installed instead of ~10 MB.

---

## Quick Migration

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

That's it. Every method call after the constructor stays the same.

---

## Step-by-Step

### Installation

**Before:**

```bash
npm install archiver
npm install @types/archiver --save-dev  # if using TypeScript
```

**After:**

```bash
npm install @archiver/archiver
# types are included — no separate @types package needed
```

You can also remove `@types/archiver` from your devDependencies if you had it.

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

Same options. Same methods. Just a different import and constructor.

---

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

### Adding Files

The `append` and `file` methods are unchanged.

**Before:**

```js
// from a string
archive.append('file contents', { name: 'string.txt' })

// from a Buffer
archive.append(Buffer.from('buff'), { name: 'buffer.txt' })

// from a stream
archive.append(fs.createReadStream('photo.jpg'), { name: 'photo.jpg' })

// from a file path
archive.file('src/index.js', { name: 'index.js' })
```

**After:**

```ts
// identical — no changes needed
archive.append('file contents', { name: 'string.txt' })
archive.append(Buffer.from('buff'), { name: 'buffer.txt' })
archive.append(fs.createReadStream('photo.jpg'), { name: 'photo.jpg' })
archive.file('src/index.js', { name: 'index.js' })
```

---

### Adding Directories

**Before:**

```js
// add a directory and its contents, placing files under "new-subdir" in the archive
archive.directory('subdir/', 'new-subdir')

// add directory contents to the archive root
archive.directory('subdir/', false)

// with a data filter function
archive.directory('subdir/', 'new-subdir', (entryData) => {
  if (entryData.name.endsWith('.log')) return false
  return entryData
})
```

**After:**

```ts
// identical — no changes needed
archive.directory('subdir/', 'new-subdir')
archive.directory('subdir/', '')
archive.directory('subdir/', 'new-subdir', (entryData) => {
  if (entryData.name.endsWith('.log')) return false
  return entryData
})
```

---

### Using Glob Patterns

**Before:**

```js
archive.glob('**/*.js', { cwd: 'src' }, { prefix: 'source' })
```

**After:**

```ts
archive.glob('**/*.js', { cwd: 'src' }, { name: '', prefix: 'source' })
```

Note: `glob` now requires all three parameters. The `name` field in `data` is overridden by each matched file's relative path, but must be present to satisfy the type.

---

### Creating Symlinks

**Before:**

```js
archive.symlink('link.txt', 'target.txt')
archive.symlink('link.txt', 'target.txt', 0o755)
```

**After:**

```ts
// identical — no changes needed
archive.symlink('link.txt', 'target.txt')
archive.symlink('link.txt', 'target.txt', 0o755)
```

---

### Handling Events

**Before:**

```js
archive.on('entry', (entryData) => {
  console.log('added:', entryData.name)
})

archive.on('progress', (progressData) => {
  console.log(`${progressData.entries.processed}/${progressData.entries.total}`)
  console.log(`${progressData.fs.processedBytes} bytes`)
})

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn(err)
  } else {
    throw err
  }
})

archive.on('error', (err) => {
  throw err
})
```

**After:**

```ts
// identical — no changes needed
archive.on('entry', (entryData) => {
  console.log('added:', entryData.name)
})

archive.on('progress', (progressData) => {
  console.log(`${progressData.entries.processed}/${progressData.entries.total}`)
  console.log(`${progressData.fs.processedBytes} bytes`)
})

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn(err)
  } else {
    throw err
  }
})

archive.on('error', (err) => {
  throw err
})
```

---

### Using Abort

**Before:**

```js
archive.abort()
```

**After:**

```ts
// identical — no changes needed
archive.abort()
```

---

### Getting Bytes Written

**Before:**

```js
const totalBytes = archive.pointer()
```

**After:**

```ts
// identical — no changes needed
const totalBytes = archive.pointer()
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

The old package pulled in `lodash`, `async`, `readable-stream`, `graceful-fs`, `is-stream`, `lazystream`, `normalize-path`, and many others transitively. The new package has zero unnecessary dependencies.

---

## Breaking Changes

There are three breaking changes. All of them are straightforward to address.

### 1. Node.js >= 24 Required

The new package requires Node.js 24 or later. It uses modern Node.js APIs directly instead of polyfilling them with `readable-stream` and other shims.

### 2. ESM Only

There is no CommonJS build. If your project uses `require()`, you will need to either:

- Convert your project to ESM (`"type": "module"` in package.json)
- Use dynamic `import()` in CommonJS files
- Use a bundler that handles ESM

### 3. Class Constructors Instead of Factory Function

The format string is gone. Instead of passing `'zip'` or `'tar'` as a string argument to a factory function, you import and instantiate the class you need.

```js
// before
const archive = archiver('zip', options)

// after
const archive = new ZipArchive(options)
```

Options are passed directly to the constructor — no wrapping needed. The same option keys work in both versions.

---

## FAQ

### Can I use `require()` to import `@archiver/archiver`?

No. The package is ESM only. Use `import { ZipArchive } from '@archiver/archiver'` instead. If you are in a CommonJS file, you can use `const { ZipArchive } = await import('@archiver/archiver')` inside an async function.

### Is the API compatible?

Nearly all methods have the same signature. `append`, `file`, `finalize`, `abort`, `pointer`, and `symlink` are unchanged. Every event (`entry`, `progress`, `warning`, `error`) fires with the same data. Every option (`zlib`, `comment`, `gzip`, `gzipOptions`, `forceZip64`, etc.) works the same way.

Minor differences: `directory` now takes `string | false` for `destpath` (use `''` instead of `false` for cleaner types). `glob` now requires all three parameters (`pattern`, `options`, `data`).

The main changes are the import path and the constructor.

### Do I still need `@types/archiver`?

No. Remove it from your devDependencies. Types are included in `@archiver/archiver`.

### What about `pipe()`?

It works exactly the same way. `ZipArchive` and `TarArchive` extend Node.js `Transform`, so they are fully compatible with `pipe()`, `pipeline()`, and any stream-based workflow.

### What if I was using `archiver.create()`?

The old package had `archiver.create(format, options)` as an alternative to the factory function. Replace it the same way:

```js
// before
const archive = archiver.create('zip', options)

// after
const archive = new ZipArchive(options)
```

### I dynamically choose the format at runtime. How do I handle that?

Use a simple conditional:

```ts
import { ZipArchive, TarArchive } from '@archiver/archiver'

function createArchive(format: 'zip' | 'tar', options?: any) {
  if (format === 'zip') return new ZipArchive(options)
  if (format === 'tar') return new TarArchive(options)
  throw new Error(`Unknown format: ${format}`)
}
```

---

## Package Mapping

If you depend on any of the underlying packages directly, here is how they map:

| Old package | New package |
|---|---|
| `archiver` | `@archiver/archiver` |
| `zip-stream` | `@archiver/zip-stream` |
| `compress-commons` | `@archiver/compress-commons` |
| `tar-stream` (mafintosh) | `@archiver/tar-stream` |
| `archiver-utils` | Removed (inlined) |
| `crc32-stream` | Removed (inlined into `@archiver/compress-commons`) |
| `buffer-crc32` / `crc-32` | Removed (uses Node.js built-in CRC) |
| `readable-stream` | Removed (uses `node:stream` directly) |
| `async` | Removed (lightweight internal queue) |
| `lodash` | Removed |
| `graceful-fs` | Removed (uses `node:fs` directly) |
| `lazystream` | Removed (lightweight internal implementation) |
| `is-stream` | Removed (inlined) |
| `normalize-path` | Removed (inlined) |

All new packages live under the `@archiver` npm scope and are published from a single monorepo at [github.com/node-archiver/archiver](https://github.com/node-archiver/archiver).
