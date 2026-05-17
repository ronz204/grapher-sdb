import type { Handler, Plugin, Headers, GqlNode } from "./types";
import { builder, type Builder } from "./builder";

export type ClientConfig = {
  transport: Handler;
  plugins?: Plugin[];
  headers?: Headers;
};

export type Client = {
  query<TData, TVariables>(
    doc: GqlNode<TData, TVariables>,
    variables?: TVariables,
  ): Builder<TData>;

  mutation<TData, TVariables>(
    doc: GqlNode<TData, TVariables>,
    variables?: TVariables,
  ): Builder<TData>;
};

export function client(config: ClientConfig): Client {
  const { transport, plugins = [], headers = {} } = config;

  const build = <TData, TVariables>(
    doc: GqlNode<TData, TVariables>,
    variables?: TVariables,
  ): Builder<TData> =>
    builder({
      doc,
      headers,
      transport,
      global: plugins,
      local: [],
      ...(variables !== undefined && { variables }),
    });

  return {
    query: build,
    mutation: build,
  };
};
