import type { Plugin, Handler } from "./types";

export function compose(plugins: Plugin[], transport: Handler): Handler {
  return plugins.reduceRight((next, plugin) => plugin(next), transport);
};
