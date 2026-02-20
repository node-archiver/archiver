import { normalizePath } from "@archiver/compress-commons/util";

export function dateify(dateish?: Date | string | number): Date {
  dateish ??= new Date();

  if (dateish instanceof Date) {
    return dateish;
  }

  if (typeof dateish === "string") {
    dateish = new Date(dateish);
  } else {
    dateish = new Date();
  }

  return dateish;
}

export function sanitizePath(filepath) {
  return normalizePath(filepath, false)
    .replace(/^\w+:/, "")
    .replace(/^(\.\.\/|\/)+/, "");
}
