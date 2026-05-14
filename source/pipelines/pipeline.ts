import type { Middleware, Context, NextFn } from "./types";

export class Pipeline {
  constructor(private middleware: Middleware[]) {};

  public run(ctx: Context): Promise<Context> {
    const execute = (index: number): NextFn => (ctx: Context) => {
      if (index >= this.middleware.length) {
        return Promise.resolve(ctx);
      };

      const mw = this.middleware[index]!;
      return mw(ctx, execute(index + 1));
    };

    return execute(0)(ctx);
  };
};
