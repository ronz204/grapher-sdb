import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@graphql": "./source/graphql",
      "@pipelines": "./source/pipelines",
    },
  },
  test: {
    include: ["testing/**/*.test.ts"],
  },
});
