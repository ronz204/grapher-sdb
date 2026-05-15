import { describe, it, expect } from "vitest";
import { isOk, isErr } from "@graphql/results";
import type { Result } from "@graphql/results";
import type { GqlNetworkError } from "@graphql/errors";

const okResult: Result<string> = { ok: true, data: "hello" };
const errResult: Result<string, GqlNetworkError> = {
  ok: false, error: { type: "network", message: "connection refused" },
};

describe("isOk", () => {
  it("returns true for an ok result", () => {
    expect(isOk(okResult)).toBe(true);
  });

  it("returns false for an error result", () => {
    expect(isOk(errResult)).toBe(false);
  });

  it("narrows the type to { ok: true; data: T } when true", () => {
    if (isOk(okResult)) {
      // TypeScript should allow accessing .data here without a type error
      const data: string = okResult.data;
      expect(data).toBe("hello");
    }
  });

  it("works with different data types", () => {
    expect(isOk({ ok: true, data: 42 })).toBe(true);
    expect(isOk({ ok: true, data: null })).toBe(true);
    expect(isOk({ ok: true, data: { user: { id: "1" } } })).toBe(true);
  });
});

describe("isErr", () => {
  it("returns true for an error result", () => {
    expect(isErr(errResult)).toBe(true);
  });

  it("returns false for an ok result", () => {
    expect(isErr(okResult)).toBe(false);
  });

  it("narrows the type to { ok: false; error: E } when true", () => {
    if (isErr(errResult)) {
      // TypeScript should allow accessing .error here without a type error
      const error: GqlNetworkError = errResult.error;
      expect(error.type).toBe("network");
    }
  });

  it("works with different error types", () => {
    expect(isErr({ ok: false, error: { type: "timeout", ms: 5000 } })).toBe(true);
    expect(isErr({ ok: false, error: { type: "network", message: "fail" } })).toBe(true);
  });
});

describe("isOk and isErr are complementary", () => {
  it("isOk and isErr are mutually exclusive for an ok result", () => {
    expect(isOk(okResult)).toBe(true);
    expect(isErr(okResult)).toBe(false);
  });

  it("isOk and isErr are mutually exclusive for an error result", () => {
    expect(isOk(errResult)).toBe(false);
    expect(isErr(errResult)).toBe(true);
  });
});
