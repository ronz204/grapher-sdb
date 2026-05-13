import { describe, it, expect, expectTypeOf } from "vitest";
import { isOk, isErr, type Result } from "@types";

describe("isOk / isErr", () => {
  it("isOk narrows to the success branch", () => {
    const result: Result<string> = { ok: true, data: "hello" };
    expect(isOk(result)).toBe(true);    
    if (isOk(result)) {
      expectTypeOf(result.data).toBeString();
    };
  });

  it("isErr narrows to the error branch", () => {
    const result: Result<string> = {
      ok: false,
      error: { type: "network", message: "connection refused" },
    };
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expectTypeOf(result.error).not.toBeUndefined();
    };
  });

  it("isOk returns false for error results", () => {
    const result: Result<string> = {
      ok: false,
      error: { type: "timeout", ms: 5000 },
    };
    expect(isOk(result)).toBe(false);
  });

  it("isErr returns false for success results", () => {
    const result: Result<string> = { ok: true, data: "ok" };
    expect(isErr(result)).toBe(false);
  });
});
