import type { GraphQLError } from "graphql";
import type { Result } from "./results";

export type GqlResponse = {
  readonly data?: unknown;
  readonly errors?: GraphQLError[];
};

export type GqlNetworkError = {
  readonly type: "network";
  readonly message: string;
};

export type GqlTimeoutError = {
  readonly type: "timeout";
  readonly ms: number;
};

export type GqlResponseError = {
  readonly type: "response";
  readonly errors: GraphQLError[];
};

export type GqlError =
  | GqlNetworkError
  | GqlTimeoutError
  | GqlResponseError;


export const Err = {
  network(err: unknown): Result<never, GqlNetworkError> {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { type: "network", message } };
  },

  timeout(ms: number): Result<never, GqlTimeoutError> {
    return { ok: false, error: { type: "timeout", ms } };
  },

  response(errors: GraphQLError[]): Result<never, GqlResponseError> {
    return { ok: false, error: { type: "response", errors } };
  },
} as const;
