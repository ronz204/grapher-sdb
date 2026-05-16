import type { Result } from "@errors/results"; 
import { Pipeline } from "./pipeline";
import { ok } from "@errors/results";
import { Err } from "@errors/types";

import type {
  Middleware, Operation,
  Transport, Context, Headers,
} from "./types";

export class Executor {
  constructor(
    private readonly transport: Transport,
    private readonly headers: Headers = {},
    private readonly middleware: Middleware[] = [],
  ) {};

  public async execute<TData>(op: Operation): Promise<Result<TData>> {
    const ctx: Context = { operation: op, headers: this.headers };

    try {
      const piped = await new Pipeline(this.middleware).run(ctx);
      const response = await this.transport(piped.operation);

      if (response.errors && response.errors.length > 0) {
        return Err.response(response.errors);
      };

      return ok<TData>(response.data);
    } catch (err) {
      return Err.network(err);
    };
  };
};
