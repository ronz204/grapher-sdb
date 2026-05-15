import type { Middleware, Transport } from "@pipelines/types";

export type ClientConfig = {
  transport: Transport;
  headers?: Record<string, string>;
  middleware?: Middleware[];
};
