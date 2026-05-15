import type { Transport, Operation, Headers } from "@pipelines/types";
import type { GqlResponse } from "@graphql/errors";

export type HttpTransportConfig = {
  url: string; headers?: Headers;
};

export class HttpTransport {
  constructor(private readonly config: HttpTransportConfig) {};

  public readonly send: Transport = async (op: Operation): Promise<GqlResponse> => {
    const variables = (op.vars !== undefined && { variables: op.vars });

    const body: Record<string, unknown> = {
      ...variables,
      name: op.name,
      query: op.query,
    };

    const response = await fetch(this.config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
      },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    return json as GqlResponse;
  };
};
