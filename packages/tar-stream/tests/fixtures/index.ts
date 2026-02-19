import * as path from "node:path";

export const ONE_FILE_TAR = path.join(__dirname, "one-file.tar");
export const MULTI_FILE_TAR = path.join(__dirname, "multi-file.tar");
export const PAX_TAR = path.join(__dirname, "pax.tar");
export const TYPES_TAR = path.join(__dirname, "types.tar");
export const LONG_NAME_TAR = path.join(__dirname, "long-name.tar");
export const UNICODE_BSD_TAR = path.join(__dirname, "unicode-bsd.tar");
export const UNICODE_TAR = path.join(__dirname, "unicode.tar");
export const NAME_IS_100_TAR = path.join(__dirname, "name-is-100.tar");
export const INVALID_TGZ = path.join(__dirname, "invalid.tgz");
export const SPACE_TAR_GZ = path.join(__dirname, "space.tar");
export const GNU_LONG_PATH = path.join(__dirname, "gnu-long-path.tar");
export const BASE_256_UID_GID = path.join(__dirname, "base-256-uid-gid.tar");
export const LARGE_UID_GID = path.join(__dirname, "large-uid-gid.tar");
export const BASE_256_SIZE = path.join(__dirname, "base-256-size.tar");
export const HUGE = path.join(__dirname, "huge.tar.gz");
export const LATIN1_TAR = path.join(__dirname, "latin1.tar");
export const INCOMPLETE_TAR = path.join(__dirname, "incomplete.tar");
// Created using gnu tar: tar cf gnu-incremental.tar --format gnu --owner=myuser:12345 --group=mygroup:67890 test.txt
export const GNU_TAR = path.join(__dirname, "gnu.tar");
// Created using gnu tar: tar cf gnu-incremental.tar -G --format gnu --owner=myuser:12345 --group=mygroup:67890 test.txt
export const GNU_INCREMENTAL_TAR = path.join(__dirname, "gnu-incremental.tar");
// Created from multi-file.tar, removing the magic and recomputing the checksum
export const UNKNOWN_FORMAT = path.join(__dirname, "unknown-format.tar");
// Created using gnu tar: tar cf v7.tar --format v7 test.txt
export const V7_TAR = path.join(__dirname, "v7.tar");
