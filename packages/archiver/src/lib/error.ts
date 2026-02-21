const ERROR_CODES = {
  ABORTED: "archive was aborted",
  DIRECTORYDIRPATHREQUIRED:
    "diretory dirpath argument must be a non-empty string value",
  DIRECTORYFUNCTIONINVALIDDATA:
    "invalid data returned by directory custom data function",
  ENTRYNAMEREQUIRED: "entry name must be a non-empty string value",
  FILEFILEPATHREQUIRED:
    "file filepath argument must be a non-empty string value",
  FINALIZING: "archive already finalizing",
  QUEUECLOSED: "queue closed",
  NOENDMETHOD: "no suitable finalize/end method defined by module",
  DIRECTORYNOTSUPPORTED: "support for directory entries not defined by module",
  FORMATSET: "archive format already set",
  INPUTSTEAMBUFFERREQUIRED:
    "input source must be valid Stream or Buffer instance",
  MODULESET: "module already set",
  SYMLINKNOTSUPPORTED: "support for symlink entries not defined by module",
  SYMLINKFILEPATHREQUIRED:
    "symlink filepath argument must be a non-empty string value",
  SYMLINKTARGETREQUIRED:
    "symlink target argument must be a non-empty string value",
  ENTRYNOTSUPPORTED: "entry not supported",
} as const;

type ERROR_CODE = keyof typeof ERROR_CODES;

class ArchiverError extends Error {
  readonly code: ERROR_CODE;
  readonly data?: unknown;
  constructor(code: ERROR_CODE, data?: unknown) {
    super(ERROR_CODES[code] || code);
    Error.captureStackTrace(this, this.constructor);
    this.code = code;
    this.data = data;
  }
}

export { ArchiverError };
