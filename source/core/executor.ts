import type { Result } from "@errors/results";
import { pipeline } from "./pipeline";
import { ok } from "@errors/results";
import { Err } from "@errors/types";

import type {
  Middleware, Operation,
  Transport, Context, Headers,
} from "./types";

export type ExecuteConfig = {
  headers: Headers;
  operation: Operation;
  transport: Transport;
  middleware: Middleware[];
};

export async function execute<TData>(config: ExecuteConfig): Promise<Result<TData>> {
  const { transport, headers, middleware, operation } = config;
  const context: Context = { operation, headers };

  try {
    const piped = await pipeline({ context, middleware });
    const response = await transport(piped.operation);

    if (response.errors && response.errors.length > 0) {
      return Err.response(response.errors);
    };

    return ok<TData>(response.data);
  } catch (err) {
    return Err.network(err);
  };
};
