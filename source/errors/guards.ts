import type { Result } from "./results";

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
