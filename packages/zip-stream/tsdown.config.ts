import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/utils.ts", "src/constants.ts"],
  dts: true,
  exports: true,
});
