import { print } from "graphql";
import type { DocumentNode, TypedQueryDocumentNode, OperationDefinitionNode } from "graphql";
import type { Operation } from "@pipelines/types";
import { Builder } from "./builder";
import type { ClientConfig, VarsArgs } from "./types";

function buildOp(doc: DocumentNode, vars?: unknown): Operation {
  const name = (doc.definitions[0] as OperationDefinitionNode | undefined)?.name?.value ?? "";
  return {
    name,
    query: print(doc),
    ...(vars !== undefined ? { vars } : {}),
  };
};

export class Client {
  constructor(private readonly config: ClientConfig) {}

  public query<TData, TVariables>(
    doc: TypedQueryDocumentNode<TData, TVariables>,
    ...args: VarsArgs<TVariables>
  ): Builder<TData> {
    return new Builder(this.config, buildOp(doc, args[0] as unknown), []);
  };

  public mutation<TData, TVariables>(
    doc: TypedQueryDocumentNode<TData, TVariables>,
    ...args: VarsArgs<TVariables>
  ): Builder<TData> {
    return new Builder(this.config, buildOp(doc, args[0] as unknown), []);
  };
};
