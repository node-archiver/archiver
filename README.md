# Archiver

A modern Node.js library for creating and managing archive files such as ZIP and TAR.

This project provides a simple and flexible API for generating archives using streams, making it suitable for file compression, backups, packaging, and build systems.

---

## 🚀 Installation

Using npm:

```bash
npm install archiver
```

Using yarn:

```bash
yarn add archiver
```

Using bun:

```bash
bun add archiver
```

---

## 📦 Quick Start Example (ZIP Archive)

```javascript
import fs from "fs";
import archiver from "archiver";

const output = fs.createWriteStream("example.zip");
const archive = archiver("zip", {
  zlib: { level: 9 }, // Maximum compression
});

output.on("close", () => {
  console.log(`Archive created (${archive.pointer()} total bytes)`);
});

archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);

// Append files
archive.file("file1.txt", { name: "file1.txt" });

// Append a directory
archive.directory("subdir/", false);

// Finalize archive
archive.finalize();
```

---

## 📦 Creating a TAR Archive

```javascript
import fs from "fs";
import archiver from "archiver";

const output = fs.createWriteStream("example.tar");
const archive = archiver("tar");

archive.pipe(output);

archive.directory("project/", false);

archive.finalize();
```

---

## ⚙️ Supported Formats

- `zip`
- `tar`
- `tar.gz`
- `tar.bz2`

Additional formats may be supported depending on installed dependencies.

---

## 🧠 How It Works

Archiver uses Node.js streams internally.  

You create an archive instance, append files or directories, then finalize the archive.  

Because it is stream-based, it is memory efficient and suitable for large files.

---

## 📚 API Overview

### `archiver(format, options)`

Creates a new archive instance.

**Parameters:**

- `format` – Archive format (`zip`, `tar`, etc.)
- `options` – Format-specific configuration options

---

### `archive.file(filepath, options)`

Appends a file to the archive.

---

### `archive.directory(dirpath, destination)`

Appends a directory recursively.

---

### `archive.finalize()`

Finalizes the archive and signals that no more files will be added.

---

## ❗ Error Handling

Always listen to the `error` event:

```javascript
archive.on("error", (err) => {
  console.error(err);
});
```

---

## 🧪 Development

Clone the repository:

```bash
git clone https://github.com/node-archiver/archiver.git
cd archiver
```

Install dependencies:

```bash
npm install
```

---

## 🤝 Contributing

Contributions are welcome.

If you would like to improve documentation, fix bugs, or add features:

1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Open a Pull Request

Please ensure your changes follow the existing code style and include relevant documentation updates.

---

## 📄 License

This project is licensed under the MIT License.
See the LICENSE file for details.