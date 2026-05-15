import type { Middleware, Operation, Transport } from "./types";
import type { Context, Headers } from "./types";
import type { Result } from "@graphql/results";

import { Mapper } from "@graphql/mapper";
import { Pipeline } from "./pipeline";

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
        return Mapper.toResponseErr(response.errors);
      };

      return Mapper.toOkResponse<TData>(response.data);
    } catch (err) {
      return Mapper.toNetworkErr(err);
    };
  };
};
