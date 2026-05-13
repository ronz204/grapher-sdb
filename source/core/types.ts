import type { GraphQLError } from "graphql";

export type Operation = {
  query: string;
  variables?: unknown;
  operationName?: string;
};

export type GraphQLResponse = {
  data?: unknown;
  errors?: GraphQLError[];
};

export type TransportFn = (
  op: Operation,
  signal: AbortSignal,
) => Promise<GraphQLResponse>;

export type NextFn = (ctx: RequestContext) => Promise<RequestContext>;

export type Middleware = (
  ctx: RequestContext,
  next: NextFn,
) => Promise<RequestContext>;

export type RequestContext = {
  operation: Operation;
  headers: Record<string, string>;
  transport: TransportFn;
  signal: AbortSignal;
  timeout: number;
};
