import type { GqlResponse } from "./errors";
import type { TypedQueryDocumentNode } from "graphql";

export type GqlNode<D, V> = TypedQueryDocumentNode<D, V>;
export type Headers = Record<string, string>;

export type Operation = {
  query: string;
  variables?: unknown;
  operationName: string;
};

export type Context = {
  headers: Headers;
  operation: Operation;
};

export type Next = (ctx: Context) => Promise<Context>;
export type Proto = (op: Operation) => Promise<GqlResponse>;
export type Plugin = (ctx: Context, next: Next) => Promise<Context>;
