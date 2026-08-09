import * as path from "node:path";

export const ONE_FILE_TAR: string = path.join(
  import.meta.dirname,
  "one-file.tar",
);
export const MULTI_FILE_TAR: string = path.join(
  import.meta.dirname,
  "multi-file.tar",
);
export const PAX_TAR: string = path.join(import.meta.dirname, "pax.tar");
export const TYPES_TAR: string = path.join(import.meta.dirname, "types.tar");
export const LONG_NAME_TAR: string = path.join(
  import.meta.dirname,
  "long-name.tar",
);
export const UNICODE_BSD_TAR: string = path.join(
  import.meta.dirname,
  "unicode-bsd.tar",
);
export const UNICODE_TAR: string = path.join(
  import.meta.dirname,
  "unicode.tar",
);
export const NAME_IS_100_TAR: string = path.join(
  import.meta.dirname,
  "name-is-100.tar",
);
export const INVALID_TGZ: string = path.join(
  import.meta.dirname,
  "invalid.tgz",
);
export const SPACE_TAR_GZ: string = path.join(import.meta.dirname, "space.tar");
export const GNU_LONG_PATH: string = path.join(
  import.meta.dirname,
  "gnu-long-path.tar",
);
export const BASE_256_UID_GID: string = path.join(
  import.meta.dirname,
  "base-256-uid-gid.tar",
);
export const LARGE_UID_GID: string = path.join(
  import.meta.dirname,
  "large-uid-gid.tar",
);
export const BASE_256_SIZE: string = path.join(
  import.meta.dirname,
  "base-256-size.tar",
);
export const HUGE: string = path.join(import.meta.dirname, "huge.tar.gz");
export const LATIN1_TAR: string = path.join(import.meta.dirname, "latin1.tar");
export const INCOMPLETE_TAR: string = path.join(
  import.meta.dirname,
  "incomplete.tar",
);
// Created using gnu tar: tar cf gnu-incremental.tar --format gnu --owner=myuser:12345 --group=mygroup:67890 test.txt
export const GNU_TAR: string = path.join(import.meta.dirname, "gnu.tar");
// Created using gnu tar: tar cf gnu-incremental.tar -G --format gnu --owner=myuser:12345 --group=mygroup:67890 test.txt
export const GNU_INCREMENTAL_TAR: string = path.join(
  import.meta.dirname,
  "gnu-incremental.tar",
);
// Created from multi-file.tar, removing the magic and recomputing the checksum
export const UNKNOWN_FORMAT: string = path.join(
  import.meta.dirname,
  "unknown-format.tar",
);
// Created using gnu tar: tar cf v7.tar --format v7 test.txt
export const V7_TAR: string = path.join(import.meta.dirname, "v7.tar");
