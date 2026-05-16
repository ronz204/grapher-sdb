import type { GqlError } from "./errors";

export type Result<TData, TError = GqlError> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

export function ok<TData>(data: unknown): Result<TData> {
  return { ok: true, data: data as TData };
};


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
