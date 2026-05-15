import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@core": "./source/core",
      "@errors": "./source/errors",
      "@transports": "./source/transports",
    },
  },
  test: {
    include: ["testing/**/*.test.ts"],
  },
});
