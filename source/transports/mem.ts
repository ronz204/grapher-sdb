import type { Transport, Operation } from "@pipelines/types";
import type { GqlResponse } from "@graphql/errors";

export type MemoryHandler = (op: Operation) => GqlResponse | Promise<GqlResponse>;

export class MemoryTransport {
  constructor(private readonly handler: MemoryHandler) {};

  public readonly send: Transport = (op: Operation): Promise<GqlResponse> => {
    try {
      return Promise.resolve(this.handler(op));
    } catch (err) {
      return Promise.reject(err);
    };
  };
};
