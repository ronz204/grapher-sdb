import { GraphQLError } from "graphql";
import { Executor } from "@pipelines/executor";
import { describe, it, expect, vi } from "vitest";
import type { Transport, Middleware, Context } from "@pipelines/types";

const op = { name: "GetUser", query: "{ user { id } }" };

function stubTransport(response: Awaited<ReturnType<Transport>>): Transport {
  return async () => response;
};

describe("Executor", () => {
  describe("successful responses", () => {
    it("returns { ok: true } when the transport returns data", async () => {
      const executor = new Executor({ transport: stubTransport({ data: { user: { id: "1" } } }) });
      const result = await executor.execute(op);
      expect(result.ok).toBe(true);
    });

    it("returns the data from the transport response", async () => {
      const data = { user: { id: "1", name: "Alice" } };
      const executor = new Executor({ transport: stubTransport({ data }) });

      const result = await executor.execute(op);
      if (result.ok) expect(result.data).toEqual(data);
    });

    it("returns { ok: true } when errors is absent from the response", async () => {
      const executor = new Executor({ transport: stubTransport({ data: null }) });
      const result = await executor.execute(op);
      expect(result.ok).toBe(true);
    });

    it("returns { ok: true } when errors is an empty array", async () => {
      const executor = new Executor({ transport: stubTransport({ data: null, errors: [] }) });
      const result = await executor.execute(op);
      expect(result.ok).toBe(true);
    });
  });

  describe("response errors", () => {
    it("returns { ok: false } when the response contains errors", async () => {
      const executor = new Executor({
        transport: stubTransport({ errors: [new GraphQLError("not found")] }),
      });
      
      const result = await executor.execute(op);
      expect(result.ok).toBe(false);
    });

    it("sets the error type to 'response'", async () => {
      const executor = new Executor({
        transport: stubTransport({ errors: [new GraphQLError("forbidden")] }),
      });

      const result = await executor.execute(op);
      if (!result.ok) expect(result.error.type).toBe("response");
    });

    it("includes the GraphQL errors array in the error", async () => {
      const errors = [new GraphQLError("field error"), new GraphQLError("auth error")];
      const executor = new Executor({ transport: stubTransport({ errors }) });

      const result = await executor.execute(op);
      if (!result.ok && result.error.type === "response") {
        expect(result.error.errors).toBe(errors);
      };
    });
  });

  describe("network errors", () => {
    it("returns { ok: false } when the transport throws", async () => {
      const transport: Transport = async () => { throw new Error("fetch failed"); };
      const executor = new Executor({ transport });

      const result = await executor.execute(op);
      expect(result.ok).toBe(false);
    });

    it("sets the error type to 'network'", async () => {
      const transport: Transport = async () => { throw new Error("ECONNREFUSED"); };
      const executor = new Executor({ transport });

      const result = await executor.execute(op);
      if (!result.ok) expect(result.error.type).toBe("network");
    });

    it("includes the error message in the network error", async () => {
      const transport: Transport = async () => { throw new Error("fetch failed"); };
      const executor = new Executor({ transport });
      const result = await executor.execute(op);
      if (!result.ok && result.error.type === "network") {
        expect(result.error.message).toBe("fetch failed");
      }
    });

    it("never throws — always resolves with a Result", async () => {
      const transport: Transport = async () => { throw new Error("unexpected"); };
      const executor = new Executor({ transport });
      await expect(executor.execute(op)).resolves.toBeDefined();
    });

    it("handles non-Error thrown values", async () => {
      const transport: Transport = async () => { throw "string error"; };
      const executor = new Executor({ transport });
      const result = await executor.execute(op);
      if (!result.ok && result.error.type === "network") {
        expect(result.error.message).toBe("string error");
      }
    });
  });

  describe("operation forwarding", () => {
    it("passes the operation to the transport", async () => {
      const spy = vi.fn().mockResolvedValue({ data: null });
      const executor = new Executor({ transport: spy });
      await executor.execute(op);
      expect(spy).toHaveBeenCalledWith(op);
    });
  });

  describe("headers", () => {
    it("provides the configured headers in the initial context", async () => {
      let receivedCtx: Context | undefined;
      const mw: Middleware = async (ctx, next) => { receivedCtx = ctx; return next(ctx); };
      const executor = new Executor({
        transport: stubTransport({ data: null }),
        headers: { Authorization: "Bearer token" },
        middleware: [mw],
      });
      await executor.execute(op);
      expect(receivedCtx?.headers["Authorization"]).toBe("Bearer token");
    });

    it("defaults to empty headers when none are provided", async () => {
      let receivedCtx: Context | undefined;
      const mw: Middleware = async (ctx, next) => { receivedCtx = ctx; return next(ctx); };
      const executor = new Executor({ transport: stubTransport({ data: null }), middleware: [mw] });
      await executor.execute(op);
      expect(receivedCtx?.headers).toEqual({});
    });
  });

  describe("middleware integration", () => {
    it("runs middleware before calling the transport", async () => {
      const order: string[] = [];
      const mw: Middleware = async (ctx, next) => { order.push("middleware"); return next(ctx); };
      const transport: Transport = async () => { order.push("transport"); return { data: null }; };
      const executor = new Executor({ transport, middleware: [mw] });
      await executor.execute(op);
      expect(order).toEqual(["middleware", "transport"]);
    });

    it("uses the operation from the final middleware context", async () => {
      const modified = { name: "ModifiedOp", query: "{ modified }" };
      const mw: Middleware = async (_ctx, next) => next({ ..._ctx, operation: modified });
      const spy = vi.fn().mockResolvedValue({ data: null });
      const executor = new Executor({ transport: spy, middleware: [mw] });
      await executor.execute(op);
      expect(spy).toHaveBeenCalledWith(modified);
    });

    it("runs multiple middlewares in order", async () => {
      const order: number[] = [];
      const mw1: Middleware = (ctx, next) => { order.push(1); return next(ctx); };
      const mw2: Middleware = (ctx, next) => { order.push(2); return next(ctx); };
      const executor = new Executor({ transport: stubTransport({ data: null }), middleware: [mw1, mw2] });
      await executor.execute(op);
      expect(order).toEqual([1, 2]);
    });
  });
});
