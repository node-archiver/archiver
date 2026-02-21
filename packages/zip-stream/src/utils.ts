import { normalizePath } from "@archiver/compress-commons/util";

function dateify(dateish?: Date | string): Date {
  dateish ??= new Date();

  if (dateish instanceof Date) {
    return dateish;
  }

  if (typeof dateish === "string" || typeof dateish === "number") {
    return new Date(dateish);
  }

  return dateish;
}

function sanitizePath(filepath: string): string {
  return normalizePath(filepath, false)
    .replace(/^\w+:/, "")
    .replace(/^(\.\.\/|\/)+/, "");
}

export { dateify, sanitizePath };
