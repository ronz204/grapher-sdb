import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@gql": "./source/gql",
      "@types": "./source/types",
    },
  },
  test: {
    include: ["testing/**/*.test.ts"],
  },
});
