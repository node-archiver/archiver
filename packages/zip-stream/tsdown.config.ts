import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/utils.ts"],
  dts: false,
  exports: true,
});
