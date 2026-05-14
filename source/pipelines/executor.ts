import type { Middleware, Context, Operation } from "./types";
import type { Result } from "@graphql/results";
import { Mapper } from "@graphql/mapper";
import { Pipeline } from "./pipeline";

export type ExecutorConfig = {
  middleware?: Middleware[];
  headers?: Context["headers"];
  transport: Context["transport"];
};

export class Executor {
  constructor(private config: ExecutorConfig) {}

  public async execute<TData>(op: Operation): Promise<Result<TData>> {
    const ctx: Context = {
      operation: op,
      transport: this.config.transport,
      headers: this.config.headers ?? {},
    };

    try {
      const finalCtx = await new Pipeline(this.config.middleware ?? []).run(ctx);
      const response = await finalCtx.transport(finalCtx.operation);
      
      if (response.errors && response.errors.length > 0) {
        return Mapper.toResponseErr(response.errors);
      };
      
      return Mapper.toOkResponse(response.data as TData);
    } catch (err) {
      return Mapper.toNetworkErr(err);
    };
  };
};
