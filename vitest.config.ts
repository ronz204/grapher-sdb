import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@core": "./source/core",

      "@gql": "./source/gql",
      "@types": "./source/types",
    },
  },
  test: {
    include: ["testing/**/*.test.ts"],
  },
});
