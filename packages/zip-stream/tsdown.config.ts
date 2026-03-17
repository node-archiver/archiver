import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/utils.ts",
    "src/compress-commons/index.ts",
    "src/compress-commons/constants.ts",
    "src/compress-commons/utils.ts",
  ],
  dts: true,
  exports: true,
});
