import type { Middleware, Context, Next } from "./types";

export type PipelineConfig = {
  context: Context;
  middleware: Middleware[];
};

export function pipeline(config: PipelineConfig): Promise<Context> {
  const { context, middleware } = config;

  const execute = (index: number): Next => (ctx: Context) => {
    if (index >= middleware.length) {
      return Promise.resolve(ctx);
    };

    const mw = middleware[index]!;
    return mw(ctx, execute(index + 1));
  };

  return execute(0)(context);
};
