import type { Result } from "./results";
import type { GraphQLError } from "graphql";

import type {
  GqlNetworkError,
  GqlResponseError,
  GqlTimeoutError,
} from "./types";

export abstract class Mapper {
  public static toOkResponse<TData>(data: unknown): Result<TData> {
    return { ok: true, data: data as TData };
  };

  public static toNetworkErr(err: unknown): Result<never, GqlNetworkError> {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { type: "network", message } };
  };

  public static toTimeoutErr(ms: number): Result<never, GqlTimeoutError> {
    return { ok: false, error: { type: "timeout", ms } };
  };

  public static toResponseErr(errors: GraphQLError[]): Result<never, GqlResponseError> {
    return { ok: false, error: { type: "response", errors } };
  };
};
