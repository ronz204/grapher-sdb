import { describe, it, expect } from "vitest";
import type { GqlNetworkError, GqlTimeoutError, GqlResponseError } from "@types";

describe("error type discriminants", () => {
  it("GqlNetworkError has type 'network'", () => {
    const err: GqlNetworkError = { type: "network", message: "failed" };
    expect(err.type).toBe("network");
  });

  it("GqlNetworkError accepts an optional cause", () => {
    const err: GqlNetworkError = {
      type: "network",
      message: "failed",
      cause: new Error("root cause"),
    };
    expect(err.cause).toBeInstanceOf(Error);
  });

  it("GqlTimeoutError has type 'timeout'", () => {
    const err: GqlTimeoutError = { type: "timeout", ms: 3000 };
    expect(err.type).toBe("timeout");
    expect(err.ms).toBe(3000);
  });

  it("GqlResponseError has type 'response'", () => {
    const err: GqlResponseError = { type: "response", errors: [] };
    expect(err.type).toBe("response");
  });
});
