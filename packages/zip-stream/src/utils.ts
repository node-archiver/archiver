import { normalizePath, sanitizePath } from "@archiver/compress-commons/utils";

function dateify(dateish?: Date | string | null): Date {
  dateish ??= new Date();

  if (dateish instanceof Date) {
    return dateish;
  }

  if (typeof dateish === "string" || typeof dateish === "number") {
    return new Date(dateish);
  }

  return dateish;
}

export { dateify, sanitizePath, normalizePath };
