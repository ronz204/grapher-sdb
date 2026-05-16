import type { GqlNode } from "./types";
import { GraphQLError } from "graphql";
import { interpolate, formatter, strToAst } from "./tagged";

export function gql<TData = unknown, TVariables = never>(
  strings: TemplateStringsArray, ...values: unknown[]
): GqlNode<TData, TVariables> {

  interpolate(values);
  const query = strings.raw.join("");

  try {
    return strToAst(query) as GqlNode<TData, TVariables>;
  } catch (err) {
    if (err instanceof GraphQLError) {
      throw formatter({ query, err });
    };
    throw err;
  };
};
