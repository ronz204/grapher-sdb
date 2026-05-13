import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@gql": "./source/gql",
      "@errors": "./source/errors",
      "@pipelines": "./source/pipelines",
      "@transports": "./source/transports",

      "@core": "./source/core",
    },
  },
  test: {
    include: ["testing/**/*.test.ts"],
  },
});
