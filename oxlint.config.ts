import { defineConfig } from "@gameroman/config/oxlint";

export default defineConfig({
  rules: { "no-this-alias": "warn" },
  overrides: [{ files: ["**/tests/**"], rules: { "prefer-template": "off" } }],
});
