# @archiver/archiver

[![version](https://npmx.dev/api/registry/badge/version/@archiver/archiver?name=true)](https://npmx.dev/package/@archiver/archiver)
[![license](https://npmx.dev/api/registry/badge/license/@archiver/archiver?name=true)](https://npmx.dev/package/@archiver/archiver)

A lightweight streaming interface for creating ZIP and TAR archives in Node.js.

A modern, TypeScript-first rewrite of the popular [`archiver`](https://npmx.dev/package/archiver) package.

## Why

The original `archiver` package is one of the most widely used archive libraries in the Node.js ecosystem, but it ships with 66 transitive dependencies and roughly 10MB of install weight. It has no native TypeScript support, no ESM exports, and relies on packages like `readable-stream` for things Node.js has supported natively for years.

|                  | `archiver`        | `@archiver/archiver` |
| ---------------- | ----------------- | -------------------- |
| **Package Size** | 43.1 kB           | 38.7 kB              |
| **Install Size** | 9.9 MB            | 227 kB               |
| **Dependencies** | 66 total          | 3 direct, 8 total    |
| **Types**        | `@types/archiver` | Built-in             |
| **ESM**          | CommonJS only     | ESM only             |

## Install

```bash
npm install @archiver/archiver
```

```bash
pnpm add @archiver/archiver
```

```bash
yarn add @archiver/archiver
```

```bash
bun add @archiver/archiver
```

> Requires Node.js 24 or later.

## Quick Start

### Create a ZIP archive

```typescript
import { createWriteStream } from "node:fs";
import { ZipArchive } from "@archiver/archiver";

const output = createWriteStream("archive.zip");
const archive = new ZipArchive({ zlib: { level: 9 } });

archive.pipe(output);

// Append a file from disk
archive.file("package.json", { name: "package.json" });

// Append a string as a file
archive.append("Hello, world!", { name: "hello.txt" });

// Append an entire directory
archive.directory("src/", "src");

// Finalize — this resolves when the archive is complete
await archive.finalize();

console.log(`Archive created: ${archive.pointer()} bytes`);
```

### Create a TAR archive

```typescript
import { createWriteStream } from "node:fs";
import { TarArchive } from "@archiver/archiver";

const output = createWriteStream("archive.tar.gz");
const archive = new TarArchive({ gzip: true, gzipOptions: { level: 6 } });

archive.pipe(output);

archive.directory("dist/", "dist");

await archive.finalize();
```

## API

### `ZipArchive`

```typescript
import { ZipArchive } from "@archiver/archiver";

const archive = new ZipArchive(options);
```

#### Options

| Option             | Type          | Default   | Description                               |
| ------------------ | ------------- | --------- | ----------------------------------------- |
| `comment`          | `string`      | `""`      | Archive comment                           |
| `forceUTC`         | `boolean`     | `false`   | Use UTC timestamps                        |
| `forceLocalTime`   | `boolean`     | `false`   | Force local timestamps                    |
| `forceZip64`       | `boolean`     | `false`   | Force ZIP64 headers                       |
| `namePrependSlash` | `boolean`     | `false`   | Prepend `/` to entry paths                |
| `store`            | `boolean`     | `false`   | Use STORE method (no compression)         |
| `zlib`             | `ZlibOptions` | —         | Compression options (e.g. `{ level: 9 }`) |
| `statConcurrency`  | `number`      | `4`       | Parallel `fs.stat` workers                |
| `highWaterMark`    | `number`      | `1048576` | Stream buffer size (1 MB)                 |

### `TarArchive`

```typescript
import { TarArchive } from "@archiver/archiver";

const archive = new TarArchive(options);
```

#### Options

| Option            | Type          | Default   | Description                         |
| ----------------- | ------------- | --------- | ----------------------------------- |
| `gzip`            | `boolean`     | `false`   | Enable gzip compression (`.tar.gz`) |
| `gzipOptions`     | `ZlibOptions` | —         | Gzip options (e.g. `{ level: 6 }`)  |
| `statConcurrency` | `number`      | `4`       | Parallel `fs.stat` workers          |
| `highWaterMark`   | `number`      | `1048576` | Stream buffer size (1 MB)           |

### Methods

All methods return `this` for chaining, except where noted.

#### `append(source, data)`

Add an entry from a Buffer, Stream, or string.

```typescript
archive.append(Buffer.from("contents"), { name: "file.txt" });
archive.append("string contents", { name: "note.txt" });
archive.append(readableStream, { name: "data.bin" });
```

**`data` properties:**

| Property | Type       | Required | Description                                       |
| -------- | ---------- | -------- | ------------------------------------------------- |
| `name`   | `string`   | Yes      | Entry name (including path)                       |
| `date`   | `Date`     | No       | Entry date                                        |
| `mode`   | `number`   | No       | File permissions                                  |
| `prefix` | `string`   | No       | Path prefix for the entry name                    |
| `stats`  | `fs.Stats` | No       | Pre-computed stats (avoids extra `fs.stat` calls) |

#### `file(filepath, data?)`

Add a file from disk. The file is stat'd and streamed automatically.

```typescript
archive.file("/path/to/file.txt", { name: "renamed.txt" });
```

#### `directory(dirpath, destpath, data?)`

Add a directory recursively. Pass a function as `data` to filter or transform entries.

```typescript
// Add everything in src/ under the "source" directory
archive.directory("src/", "source");

// Filter entries
archive.directory("project/", "project", (entry) => {
  if (entry.name.includes("node_modules")) return false;
  return entry;
});
```

#### `glob(pattern, options, data)`

Add files matching a glob pattern.

```typescript
archive.glob("**/*.js", { cwd: "src/" }, { prefix: "scripts" });
```

#### `symlink(filepath, target, mode?)`

Create a symbolic link entry. Does not touch the filesystem.

```typescript
archive.symlink("current", "releases/v1.0.0");
```

#### `finalize()`

Finalize the archive. Returns a `Promise<void>` that resolves when the archive is fully written. No more entries can be appended after calling this.

```typescript
await archive.finalize();
```

#### `abort()`

Abort the archiving process. Clears pending tasks, lets active workers finish, then ends the stream.

```typescript
archive.abort();
```

#### `pointer()`

Returns the number of bytes emitted so far.

```typescript
const bytes = archive.pointer();
```

### Events

Both `ZipArchive` and `TarArchive` extend Node.js `Transform` streams and emit the following events:

| Event      | Payload                                                                 | Description                         |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------- |
| `entry`    | `EntryData`                                                             | Fired after an entry is processed   |
| `progress` | `{ entries: { total, processed }, fs: { totalBytes, processedBytes } }` | Progress update after each entry    |
| `warning`  | `Error`                                                                 | Non-fatal issue (e.g. stat failure) |
| `error`    | `Error`                                                                 | Fatal error                         |

```typescript
archive.on("progress", (progress) => {
  console.log(
    `${progress.entries.processed}/${progress.entries.total} entries`,
  );
});

archive.on("warning", (err) => {
  console.warn(err.message);
});
```

## Migration

Coming from `archiver`? See the [Migration Guide](./docs/MIGRATION.md).

## Contributing

See [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for setup instructions and guidelines.

## License

[MIT](./LICENSE)

## Credits

This project is a modern rewrite of the original [`archiver`](https://github.com/archiverjs/node-archiver) package by [Chris Talkington](https://github.com/ctalkington). Built as part of the [e18e](https://e18e.dev) ecosystem performance initiative. See the original [ecosystem issue](https://github.com/e18e/ecosystem-issues/issues/209) for context.
