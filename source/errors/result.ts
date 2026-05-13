import type { GqlError } from "./types";

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
