import config from "@gameroman/config/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...config,
  rules: {
    ...config.rules,
    "no-this-alias": "warn",
  },
});
