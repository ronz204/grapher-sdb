import { print } from "graphql";
import type { DocumentNode, TypedQueryDocumentNode } from "graphql";
import type { Operation } from "@pipelines/types";
import { Builder } from "./builder";
import type { ClientConfig } from "./types";

function buildOp(doc: DocumentNode, vars?: unknown): Operation {
  const def = doc.definitions[0];
  const name = def !== undefined && def.kind === "OperationDefinition" && def.name != null
    ? def.name.value
    : "";
  return {
    name,
    query: print(doc),
    ...(vars !== undefined ? { vars } : {}),
  };
};

export class Client {
  constructor(private readonly config: ClientConfig) {}

  public query<TData>(doc: TypedQueryDocumentNode<TData, never>): Builder<TData>;
  public query<TData, TVariables>(doc: TypedQueryDocumentNode<TData, TVariables>, vars: TVariables): Builder<TData>;
  public query<TData, TVariables>(doc: TypedQueryDocumentNode<TData, TVariables>, vars?: TVariables): Builder<TData> {
    return new Builder(this.config, buildOp(doc, vars), []);
  };

  public mutation<TData>(doc: TypedQueryDocumentNode<TData, never>): Builder<TData>;
  public mutation<TData, TVariables>(doc: TypedQueryDocumentNode<TData, TVariables>, vars: TVariables): Builder<TData>;
  public mutation<TData, TVariables>(doc: TypedQueryDocumentNode<TData, TVariables>, vars?: TVariables): Builder<TData> {
    return new Builder(this.config, buildOp(doc, vars), []);
  };
};
