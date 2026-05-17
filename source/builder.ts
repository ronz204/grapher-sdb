import type { GqlNode, Plugin, Handler, Headers } from "./types";
import { type Result, ok } from "./results";
import { toOperation } from "./tagged";
import { compose } from "./compose";
import { Err } from "./errors";

type BuilderState<TData, TVariables> = {
  doc: GqlNode<TData, TVariables>;
  variables?: TVariables;
  transport: Handler;
  headers: Headers;
  global: Plugin[];
  local: Plugin[];
};

export type Builder<TData> = {
  use(plugin: Plugin): Builder<TData>;
  send(): Promise<Result<TData>>;
};

export function builder<TData, TVariables>(
  state: BuilderState<TData, TVariables>,
): Builder<TData> {
  return {
    use: (plugin) => builder({
      ...state, local: state.local.concat(plugin)
    }),

    send: async () => {
      const operation = toOperation(state.doc, state.variables);
      const ctx = { headers: state.headers, operation };

      const plugins = state.global.concat(state.local);
      const handler = compose(plugins, state.transport);

      try {
        const response = await handler(ctx);

        if (response.errors && response.errors.length > 0) {
          return Err.response(response.errors);
        };

        return ok<TData>(response.data);
      } catch (err) {
        return Err.network(err);
      };
    },
  };
};
