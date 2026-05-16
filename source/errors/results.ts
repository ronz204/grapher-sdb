import type { GqlError } from "./types";

export type Result<TData, TError = GqlError> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

export function ok<TData>(data: unknown): Result<TData> {
  return { ok: true, data: data as TData };
};
