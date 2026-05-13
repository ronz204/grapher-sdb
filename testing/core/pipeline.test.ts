import { describe, it, expect } from "vitest";
import { createPipeline } from "@core/pipeline";
import type { Middleware, RequestContext } from "@core/types";

function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
  return {
    operation: { query: "{ __typename }" },
    headers: {},
    transport: async () => ({ data: {} }),
    signal: new AbortController().signal,
    timeout: 0,
    ...overrides,
  };
}

describe("createPipeline", () => {
  it("runs middlewares in order", async () => {
    const order: number[] = [];
    const mw1: Middleware = async (ctx, next) => { order.push(1); return next(ctx); };
    const mw2: Middleware = async (ctx, next) => { order.push(2); return next(ctx); };
    const mw3: Middleware = async (ctx, next) => { order.push(3); return next(ctx); };

    await createPipeline([mw1, mw2, mw3])(makeCtx());

    expect(order).toEqual([1, 2, 3]);
  });

  it("short-circuiting stops the chain", async () => {
    const called: number[] = [];
    const mw1: Middleware = async (ctx, next) => { called.push(1); return next(ctx); };
    const mw2: Middleware = async (ctx) => { called.push(2); return ctx; }; // doesn't call next
    const mw3: Middleware = async (ctx, next) => { called.push(3); return next(ctx); };

    await createPipeline([mw1, mw2, mw3])(makeCtx());

    expect(called).toEqual([1, 2]);
  });

  it("a middleware can modify ctx before and after next()", async () => {
    const log: string[] = [];

    const wrapper: Middleware = async (ctx, next) => {
      log.push("before");
      const result = await next({ ...ctx, headers: { x: "set-before" } });
      log.push("after");
      return result;
    };

    const capture: Middleware = async (ctx, next) => {
      log.push(`in:${ctx.headers["x"] ?? "none"}`);
      return next(ctx);
    };

    await createPipeline([wrapper, capture])(makeCtx());

    expect(log).toEqual(["before", "in:set-before", "after"]);
  });

  it("returns the original ctx when no middlewares are provided", async () => {
    const ctx = makeCtx({ timeout: 42 });
    const result = await createPipeline([])(ctx);
    expect(result.timeout).toBe(42);
  });

  it("ctx changes propagate to subsequent middlewares", async () => {
    let seenHeaders: Record<string, string> = {};

    const mw1: Middleware = async (ctx, next) =>
      next({ ...ctx, headers: { ...ctx.headers, added: "yes" } });

    const mw2: Middleware = async (ctx, next) => {
      seenHeaders = ctx.headers;
      return next(ctx);
    };

    await createPipeline([mw1, mw2])(makeCtx());

    expect(seenHeaders["added"]).toBe("yes");
  });
});
