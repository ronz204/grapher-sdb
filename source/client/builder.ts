import { Executor } from "@pipelines/executor";
import type { ClientConfig } from "./types";
import type { Result } from "@graphql/results";
import type { Middleware, Operation } from "@pipelines/types";

export class Builder<TData> {
  constructor(
    private readonly config: ClientConfig,
    private readonly operation: Operation,
    private readonly middleware: Middleware[]) {};

  public use(middleware: Middleware): Builder<TData> {
    return new Builder<TData>(this.config, this.operation, [...this.middleware, middleware]);
  };

  public send(): Promise<Result<TData>> {
    return new Executor({
      transport: this.config.transport,
      middleware: [...(this.config.middleware ?? []), ...this.middleware],
      ...(this.config.headers !== undefined ? { headers: this.config.headers } : {}),
    }).execute<TData>(this.operation);
  };
};
