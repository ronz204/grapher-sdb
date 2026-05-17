import type { GqlResponse } from "./errors";
import type { TypedQueryDocumentNode } from "graphql";

export type GqlNode<D, V> = TypedQueryDocumentNode<D, V>;
export type Headers = Record<string, string>;

export type Operation = {
  query: string;
  variables?: unknown;
  operationName?: string;
};

export type Context = {
  headers: Headers;
  operation: Operation;
};

export type Handler = (ctx: Context) => Promise<GqlResponse>;
export type Plugin  = (next: Handler) => Handler;
