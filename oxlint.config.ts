import { defineConfig } from "@gameroman/config/oxlint";

export default defineConfig({
  rules: {
    "no-this-alias": "warn",
    "prefer-template": "warn",
  },
});
