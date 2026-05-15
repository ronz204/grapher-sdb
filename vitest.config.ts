import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@client": "./source/client",
      "@graphql": "./source/graphql",
      "@pipelines": "./source/pipelines",
      "@transports": "./source/transports",
    },
  },
  test: {
    include: ["testing/**/*.test.ts"],
  },
});
