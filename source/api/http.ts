import type { Headers, Operation, Transport } from "@core/types";
import type { GqlResponse } from "@errors/types";

interface Config {
  url: string; headers?: Headers;
};

export function httpTransport(config: Config): Transport {
  return async (op: Operation): Promise<GqlResponse> => {
    const vars = (op.vars !== undefined && { variables: op.vars });

    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.headers
      },
      body: JSON.stringify({
        ...vars, query: op.query,
        operationName: op.name,
      }),
    });

    return await response.json() as GqlResponse;
  };
};
