import type { Middleware, RequestContext } from "./types.ts";

export function createPipeline(
  middlewares: Middleware[],
): (ctx: RequestContext) => Promise<RequestContext> {
  const run =
    (index: number) =>
    (ctx: RequestContext): Promise<RequestContext> => {
      if (index >= middlewares.length) return Promise.resolve(ctx);
      const mw = middlewares[index]!;
      return mw(ctx, run(index + 1));
    };

  return run(0);
}
