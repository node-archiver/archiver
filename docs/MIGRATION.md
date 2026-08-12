# Migration Guide: `archiver` to `@archiver/archiver`

> [!NOTE]
> If you are using `archiver` v8, the only breaking change is Node.js version requirement
>
> If you are using `archiver` v7, this guide is also helpful to migrate to `archiver` v8

## Quick Migration

There are three major changes from `archiver` v7:

1. Requires Node.js version is `^22.12.0 || >=24.0.0`
2. ESM only
3. Class constructors instead of factory function.

For most codebases, migration is a two-line change:

**Before:**

```js
const archiver = require("archiver");
const archive = archiver("zip", { zlib: { level: 9 } });
```

**After:**

```ts
import { ZipArchive } from "@archiver/archiver";
const archive = new ZipArchive({ zlib: { level: 9 } });
```

If you were using `archiver.create('zip', options)`, replace it the same way.

If you dynamically choose the format at runtime, use a simple conditional:

```ts
import { ZipArchive, TarArchive } from "@archiver/archiver";
import type { ArchiverOptions } from "@archiver/archiver";

function createArchive(format: "zip" | "tar", options?: ArchiverOptions) {
  if (format === "zip") return new ZipArchive(options);
  if (format === "tar") return new TarArchive(options);
  throw new Error(`Unknown format: ${format}`);
}
```

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

### Creating a ZIP Archive

**Before:**

```js
const archiver = require("archiver");
const fs = require("fs");

const output = fs.createWriteStream("archive.zip");
const archive = archiver("zip", {
  zlib: { level: 9 },
  comment: "my archive",
});

archive.pipe(output);
archive.append("hello world", { name: "hello.txt" });
await archive.finalize();
```

**After:**

```ts
import { ZipArchive } from "@archiver/archiver";
import { createWriteStream } from "node:fs";

const output = createWriteStream("archive.zip");
const archive = new ZipArchive({
  zlib: { level: 9 },
  comment: "my archive",
});

archive.pipe(output);
archive.append("hello world", { name: "hello.txt" });
await archive.finalize();
```

### Creating a TAR Archive

**Before:**

```js
const archiver = require("archiver");
const archive = archiver("tar");
```

**After:**

```ts
import { TarArchive } from "@archiver/archiver";
const archive = new TarArchive();
```

### Creating a TAR.GZ Archive

**Before:**

```js
const archive = archiver("tar", {
  gzip: true,
  gzipOptions: { level: 1 },
});
```

**After:**

```ts
const archive = new TarArchive({
  gzip: true,
  gzipOptions: { level: 1 },
});
```

## What was removed

These APIs existed on the old `archiver` factory function and are no longer needed with the class-based approach:

| Removed API                               | Why                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `archiver.registerFormat(format, module)` | Not needed — use `ZipArchive` or `TarArchive` directly                                                               |
| `archiver.isRegisteredFormat(format)`     | Not needed — formats are classes, not a registry                                                                     |
| `archive.setFormat(format)`               | Format is determined by which class you instantiate                                                                  |
| `archive.setModule(module)`               | Module is set internally by the class constructor                                                                    |
| `JsonArchive`                             | There is no reason to use it. If you still need it, you can manually implement it by extending main `Archiver` class |

If you were using `registerFormat` to add custom archive formats, you can extend the `Archiver` base class directly instead.

## Package Mapping

If you depend on any of the underlying packages directly, here is how they map:

| Old package                  | New package                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `archiver`                   | `@archiver/archiver`                                             |
| `zip-stream`                 | `@archiver/zip-stream`                                           |
| `tar-stream` (by @mafintosh) | `@archiver/tar-stream`                                           |
| `is-stream`                  | Use `isStream` from `@archiver/archiver/utils`                   |
| `normalize-path`             | Use `normalizePath` from `@archiver/archiver/utils`              |
| `compress-commons`           | Not needed anymore. If you have a use case, please open an issue |
