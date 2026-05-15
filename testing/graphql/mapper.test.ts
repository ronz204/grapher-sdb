import { GraphQLError } from "graphql";
import { Mapper } from "@graphql/mapper";
import { describe, it, expect } from "vitest";

describe("Mapper.toOkResponse", () => {
  it("returns { ok: true } with the provided data", () => {
    const result = Mapper.toOkResponse({ user: { id: "1" } });
    expect(result.ok).toBe(true);
  });

  it("sets data to the provided value", () => {
    const data = { user: { id: "1", name: "Alice" } };
    const result = Mapper.toOkResponse(data);
    if (result.ok) {
      expect(result.data).toStrictEqual(data);
    }
  });

  it("works with primitive data", () => {
    const result = Mapper.toOkResponse(42);
    expect(result).toEqual({ ok: true, data: 42 });
  });

  it("works with null data", () => {
    const result = Mapper.toOkResponse(null);
    expect(result).toEqual({ ok: true, data: null });
  });
});

describe("Mapper.toNetworkErr", () => {
  it("returns { ok: false } with a network error", () => {
    const result = Mapper.toNetworkErr(new Error("fail"));
    expect(result.ok).toBe(false);
  });

  it("has the type discriminant 'network'", () => {
    const result = Mapper.toNetworkErr(new Error("fail"));
    if (!result.ok) {
      expect(result.error.type).toBe("network");
    }
  });

  it("uses the Error message when passed an Error instance", () => {
    const result = Mapper.toNetworkErr(new Error("connection refused"));
    expect(result).toEqual({
      ok: false,
      error: { type: "network", message: "connection refused" },
    });
  });

  it("stringifies non-Error values for the message", () => {
    const result = Mapper.toNetworkErr("something went wrong");
    expect(result).toEqual({
      ok: false,
      error: { type: "network", message: "something went wrong" },
    });
  });

  it("stringifies numeric values for the message", () => {
    const result = Mapper.toNetworkErr(503);
    expect(result).toEqual({
      ok: false,
      error: { type: "network", message: "503" },
    });
  });
});

describe("Mapper.toTimeoutErr", () => {
  it("returns { ok: false } with a timeout error", () => {
    const result = Mapper.toTimeoutErr(5000);
    expect(result.ok).toBe(false);
  });

  it("has the type discriminant 'timeout'", () => {
    const result = Mapper.toTimeoutErr(5000);
    if (!result.ok) {
      expect(result.error.type).toBe("timeout");
    }
  });

  it("sets ms to the provided value", () => {
    const result = Mapper.toTimeoutErr(3000);
    expect(result).toEqual({ ok: false, error: { type: "timeout", ms: 3000 } });
  });

  it("preserves the exact ms value", () => {
    const result = Mapper.toTimeoutErr(12345);
    if (!result.ok) {
      expect(result.error.ms).toBe(12345);
    }
  });
});

describe("Mapper.toResponseErr", () => {
  it("returns { ok: false } with a response error", () => {
    const result = Mapper.toResponseErr([new GraphQLError("not found")]);
    expect(result.ok).toBe(false);
  });

  it("has the type discriminant 'response'", () => {
    const result = Mapper.toResponseErr([new GraphQLError("not found")]);
    if (!result.ok) {
      expect(result.error.type).toBe("response");
    }
  });

  it("sets errors to the provided GraphQLError array", () => {
    const errors = [new GraphQLError("field error"), new GraphQLError("auth error")];
    const result = Mapper.toResponseErr(errors);
    if (!result.ok) {
      expect(result.error.errors).toBe(errors);
    }
  });

  it("preserves all errors in the array", () => {
    const errors = [
      new GraphQLError("error one"),
      new GraphQLError("error two"),
      new GraphQLError("error three"),
    ];
    const result = Mapper.toResponseErr(errors);
    if (!result.ok) {
      expect(result.error.errors).toHaveLength(3);
    }
  });

  it("works with an empty errors array", () => {
    const result = Mapper.toResponseErr([]);
    expect(result).toEqual({ ok: false, error: { type: "response", errors: [] } });
  });
});
