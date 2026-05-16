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
