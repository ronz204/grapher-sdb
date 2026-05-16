import type { Headers, Operation, Transport } from "@core/types";
import type { GqlResponse } from "@errors/types";

interface HttpConfig {
  url: string; headers?: Headers;
};

export function httpTransport(config: HttpConfig): Transport {
  return async (op: Operation): Promise<GqlResponse> => {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.headers
      },
      body: JSON.stringify({
        query: op.query,
        ...(op.vars !== undefined && { variables: op.vars }),
        ...(op.name && { operationName: op.name }),
      }),
    });

    return await response.json() as GqlResponse;
  };
};
