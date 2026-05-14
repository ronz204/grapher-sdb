import type { GraphQLResponse } from "@errors/types";
export type Headers = Record<string, string>;

export type Operation = {
  name: string;
  query: string;
  variables?: unknown;
};

export type Context = {
  headers: Headers;
  transport: Transport;
  operation: Operation;
};

export type NextFn = (ctx: Context) => Promise<Context>;
export type Transport = (op: Operation) => Promise<GraphQLResponse>;
export type Middleware = (ctx: Context, next: NextFn) => Promise<Context>;
