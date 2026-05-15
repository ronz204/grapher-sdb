import type { GqlResponse } from "@errors/types";
export type Headers = Record<string, string>;

export type Operation = {
  name: string;
  query: string;
  vars?: unknown;
};

export type Context = {
  headers: Headers;
  operation: Operation;
};

export type Next = (ctx: Context) => Promise<Context>;
export type Transport = (op: Operation) => Promise<GqlResponse>;
export type Middleware = (ctx: Context, next: Next) => Promise<Context>;
