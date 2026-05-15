import type { Middleware, Transport } from "@pipelines/types";

export type ClientConfig = {
  transport: Transport;
  headers?: Record<string, string>;
  middleware?: Middleware[];
};

export type VarsArgs<TVariables> = [TVariables] extends [never] ? [] : [vars: TVariables];
