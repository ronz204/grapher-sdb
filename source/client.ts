import { print } from "graphql";
import type { DocumentNode, TypedQueryDocumentNode, OperationDefinitionNode } from "graphql";
import { Executor } from "@pipelines/executor";
import type { Middleware, Transport, Operation } from "@pipelines/types";
import type { Result } from "@graphql/results";

// ---- Types -----------------------------------------------------------------

export type ClientConfig = {
  transport: Transport;
  headers?: Record<string, string>;
  middleware?: Middleware[];
};

type VarsArgs<TVariables> = [TVariables] extends [never] ? [] : [vars: TVariables];

export type Client = {
  query<TData, TVariables>(
    doc: TypedQueryDocumentNode<TData, TVariables>,
    ...args: VarsArgs<TVariables>
  ): Builder<TData>;
  mutation<TData, TVariables>(
    doc: TypedQueryDocumentNode<TData, TVariables>,
    ...args: VarsArgs<TVariables>
  ): Builder<TData>;
};

// ---- Builder ---------------------------------------------------------------

export class Builder<TData> {
  constructor(
    private readonly clientConfig: ClientConfig,
    private readonly op: Operation,
    private readonly localMiddleware: Middleware[],
  ) {}

  public use(middleware: Middleware): Builder<TData> {
    return new Builder<TData>(this.clientConfig, this.op, [...this.localMiddleware, middleware]);
  };

  public send(): Promise<Result<TData>> {
    return new Executor({
      transport: this.clientConfig.transport,
      middleware: [...(this.clientConfig.middleware ?? []), ...this.localMiddleware],
      ...(this.clientConfig.headers !== undefined ? { headers: this.clientConfig.headers } : {}),
    }).execute<TData>(this.op);
  };
};

// ---- createClient ----------------------------------------------------------

function buildOp(doc: DocumentNode, vars?: unknown): Operation {
  const name = (doc.definitions[0] as OperationDefinitionNode | undefined)?.name?.value ?? "";
  return {
    name,
    query: print(doc),
    ...(vars !== undefined ? { vars } : {}),
  };
};

export function createClient(config: ClientConfig): Client {
  return {
    query(doc, ...args) {
      return new Builder(config, buildOp(doc, args[0] as unknown), []);
    },
    mutation(doc, ...args) {
      return new Builder(config, buildOp(doc, args[0] as unknown), []);
    },
  };
};
