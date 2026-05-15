import { describe, it, expect, vi } from "vitest";
import { Pipeline } from "@pipelines/pipeline";
import type { Context, Middleware, NextFn } from "@pipelines/types";

const baseCtx: Context = {
  operation: { name: "TestOp", query: "{ test }" },
  headers: {},
  transport: async () => ({ data: null }),
};

describe("Pipeline", () => {
  describe("empty middleware list", () => {
    it("resolves without throwing", async () => {
      await expect(new Pipeline([]).run(baseCtx)).resolves.toBeDefined();
    });

    it("returns the original context unchanged", async () => {
      const result = await new Pipeline([]).run(baseCtx);
      expect(result).toEqual(baseCtx);
    });
  });

  describe("single middleware", () => {
    it("calls the middleware once", async () => {
      const spy = vi.fn((ctx: Context, next: NextFn) => next(ctx));
      await new Pipeline([spy]).run(baseCtx);
      expect(spy).toHaveBeenCalledOnce();
    });

    it("passes the initial context to the middleware", async () => {
      const spy = vi.fn((ctx: Context, next: NextFn) => next(ctx));
      await new Pipeline([spy]).run(baseCtx);
      expect(spy).toHaveBeenCalledWith(baseCtx, expect.any(Function));
    });

    it("calling next() from the last middleware resolves with current ctx", async () => {
      let nextResult: Context | undefined;
      const mw: Middleware = async (ctx, next) => {
        nextResult = await next(ctx);
        return nextResult;
      };
      await new Pipeline([mw]).run(baseCtx);
      expect(nextResult).toEqual(baseCtx);
    });
  });

  describe("middleware order", () => {
    it("runs middlewares in the declared order", async () => {
      const order: number[] = [];
      const mw1: Middleware = (ctx, next) => { order.push(1); return next(ctx); };
      const mw2: Middleware = (ctx, next) => { order.push(2); return next(ctx); };
      const mw3: Middleware = (ctx, next) => { order.push(3); return next(ctx); };

      await new Pipeline([mw1, mw2, mw3]).run(baseCtx);

      expect(order).toEqual([1, 2, 3]);
    });

    it("executes the wrap-around in the correct order (before/after next)", async () => {
      const trace: string[] = [];
      const mw1: Middleware = async (ctx, next) => {
        trace.push("mw1:before");
        const result = await next(ctx);
        trace.push("mw1:after");
        return result;
      };
      const mw2: Middleware = async (ctx, next) => {
        trace.push("mw2:before");
        const result = await next(ctx);
        trace.push("mw2:after");
        return result;
      };

      await new Pipeline([mw1, mw2]).run(baseCtx);

      expect(trace).toEqual(["mw1:before", "mw2:before", "mw2:after", "mw1:after"]);
    });
  });

  describe("context propagation", () => {
    it("passes the ctx returned by next() down to the caller", async () => {
      const modified: Context = { ...baseCtx, headers: { "x-custom": "yes" } };
      const mw1: Middleware = async (_ctx, next) => next(modified);

      let received: Context | undefined;
      const mw2: Middleware = async (ctx, next) => {
        received = ctx;
        return next(ctx);
      };

      await new Pipeline([mw1, mw2]).run(baseCtx);

      expect(received?.headers["x-custom"]).toBe("yes");
    });

    it("returns the ctx from the final step of the chain", async () => {
      const final: Context = { ...baseCtx, headers: { "x-final": "1" } };
      const mw: Middleware = async (_ctx, next) => next(final);

      const result = await new Pipeline([mw]).run(baseCtx);

      expect(result.headers["x-final"]).toBe("1");
    });
  });

  describe("short-circuiting", () => {
    it("stops the chain when a middleware does not call next()", async () => {
      const afterSpy = vi.fn((ctx: Context, next: NextFn) => next(ctx));
      const blocker: Middleware = async (ctx) => ctx; // intentionally skips next

      await new Pipeline([blocker, afterSpy]).run(baseCtx);

      expect(afterSpy).not.toHaveBeenCalled();
    });

    it("returns the ctx from the short-circuiting middleware", async () => {
      const early: Context = { ...baseCtx, headers: { "x-early": "1" } };
      const mw: Middleware = async () => early;

      const result = await new Pipeline([mw]).run(baseCtx);

      expect(result.headers["x-early"]).toBe("1");
    });
  });
});
