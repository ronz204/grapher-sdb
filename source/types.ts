import { GraphQLError } from "graphql";

export type GqlNetworkError = {
  type: "network";
  message: string;
  cause?: unknown;
};

export type GqlTimeoutError = {
  type: "timeout";
  ms: number;
};

export type GqlResponseError = {
  type: "response";
  errors: GraphQLError[];
};

export type GqlError = GqlNetworkError | GqlTimeoutError | GqlResponseError;

export type Result<TData, TError = GqlError> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

export function isOk<TData, TError>(
  result: Result<TData, TError>,
): result is { ok: true; data: TData } {
  return result.ok === true;
};

export function isErr<TData, TError>(
  result: Result<TData, TError>,
): result is { ok: false; error: TError } {
  return result.ok === false;
};
