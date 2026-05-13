import { createPipeline } from "./pipeline.ts";
import type { Middleware, Operation, RequestContext } from "./types.ts";
import type { GqlError, Result } from "../types.ts";
import type { TransportFn } from "./types.ts";

export type ExecutorConfig = {
  transport: TransportFn;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  middlewares?: Middleware[];
};

const TIMEOUT = Symbol("timeout");

export async function execute<TData = unknown>(
  operation: Operation,
  config: ExecutorConfig,
): Promise<Result<TData, GqlError>> {
  const controller = new AbortController();

  if (config.signal?.aborted === true) {
    controller.abort();
  } else if (config.signal) {
    config.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  }

  const ctx: RequestContext = {
    operation,
    headers: config.headers ?? {},
    transport: config.transport,
    signal: controller.signal,
    timeout: config.timeout ?? 0,
  };

  const run = createPipeline(config.middlewares ?? []);

  try {
    const finalCtx = await run(ctx);

    const transportPromise = finalCtx.transport(
      finalCtx.operation,
      finalCtx.signal,
    );

    const response =
      config.timeout !== undefined && config.timeout > 0
        ? await Promise.race([
            transportPromise,
            new Promise<never>((_, reject) =>
              setTimeout(() => {
                controller.abort();
                reject(TIMEOUT);
              }, config.timeout),
            ),
          ])
        : await transportPromise;

    if (response.errors && response.errors.length > 0) {
      return { ok: false, error: { type: "response", errors: response.errors } };
    }

    return { ok: true, data: response.data as TData };
  } catch (err) {
    if (err === TIMEOUT) {
      return { ok: false, error: { type: "timeout", ms: config.timeout! } };
    }

    return {
      ok: false,
      error: {
        type: "network",
        message: err instanceof Error ? err.message : String(err),
        cause: err,
      },
    };
  }
}
