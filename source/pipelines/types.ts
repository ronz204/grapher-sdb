import type { GqlResponse } from "@graphql/errors";
export type Headers = Record<string, string>;

export type Operation = {
  name: string;
  query: string;
  vars?: unknown;
};

export type Context = {
  headers: Headers;
  transport: Transport;
  operation: Operation;
};

export type NextFn = (ctx: Context) => Promise<Context>;
export type Transport = (op: Operation) => Promise<GqlResponse>;
export type Middleware = (ctx: Context, next: NextFn) => Promise<Context>;
