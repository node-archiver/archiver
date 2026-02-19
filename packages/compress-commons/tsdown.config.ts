import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/constants.ts", "src/util.ts"],
  dts: false,
  exports: true,
});
