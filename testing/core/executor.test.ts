import { describe, it, expect } from "vitest";
import { GraphQLError } from "graphql";
import { execute } from "@core/executor";
import type { Middleware, Operation, TransportFn } from "@core/types";

function makeOp(overrides?: Partial<Operation>): Operation {
  return { query: "{ __typename }", ...overrides };
}

describe("execute", () => {
  it("returns { ok: true, data } on success", async () => {
    const transport: TransportFn = async () => ({
      data: { user: { id: "1" } },
    });

    const result = await execute(makeOp(), { transport });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ user: { id: "1" } });
    }
  });

  it("returns { ok: false, error: { type: 'network' } } when transport throws", async () => {
    const transport: TransportFn = async () => {
      throw new Error("connection refused");
    };

    const result = await execute(makeOp(), { transport });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("network");
      if (result.error.type === "network") {
        expect(result.error.message).toBe("connection refused");
      }
    }
  });

  it("returns { ok: false, error: { type: 'response' } } when response has errors", async () => {
    const transport: TransportFn = async () => ({
      errors: [new GraphQLError("Not found")],
    });

    const result = await execute(makeOp(), { transport });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("response");
    }
  });

  it("never throws — error cases resolve to Result", async () => {
    const transport: TransportFn = async () => {
      throw new Error("boom");
    };

    await expect(execute(makeOp(), { transport })).resolves.toBeDefined();
  });

  it("passes the transformed operation to the transport after middleware runs", async () => {
    let seen: Operation | undefined;

    const transport: TransportFn = async (op) => {
      seen = op;
      return { data: {} };
    };

    const mw: Middleware = async (ctx, next) =>
      next({ ...ctx, operation: { ...ctx.operation, operationName: "TestOp" } });

    await execute(makeOp(), { transport, middlewares: [mw] });

    expect(seen?.operationName).toBe("TestOp");
  });

  it("runs middlewares before calling the transport", async () => {
    const order: string[] = [];

    const transport: TransportFn = async () => {
      order.push("transport");
      return { data: {} };
    };

    const mw: Middleware = async (ctx, next) => {
      order.push("middleware");
      return next(ctx);
    };

    await execute(makeOp(), { transport, middlewares: [mw] });

    expect(order).toEqual(["middleware", "transport"]);
  });

  it("returns { ok: false, error: { type: 'timeout' } } when timeout elapses", async () => {
    const transport: TransportFn = () =>
      new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 200));

    const result = await execute(makeOp(), { transport, timeout: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("timeout");
    }
  });
});
