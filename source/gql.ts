import { parse, GraphQLError } from "graphql";
import type { TypedQueryDocumentNode } from "graphql";

function formatError(err: GraphQLError, query: string): Error {
  const location = err.locations?.[0];

  if (!location) {
    return new Error(`GraphQL syntax error: ${err.message}`);
  };

  const lines = query.split('\n');
  const errorLine = lines[location.line - 1] ?? '';
  const pointer = ' '.repeat(Math.max(0, location.column - 1)) + '^';

  return new Error(
    `GraphQL syntax error in gql tag:\n` +
    `${err.message}\n\n` +
    `  ${location.line} | ${errorLine}\n` +
    `      ${pointer}\n` +
    `at line ${location.line}, column ${location.column}`
  );
};

export function gql<TData = unknown, TVariables = never>(
  strings: TemplateStringsArray, ...values: unknown[]
): TypedQueryDocumentNode<TData, TVariables> {
  if (values.length > 0) {
    throw new Error(
      'gql tag does not support interpolation.\n' +
      'Use GraphQL variables instead:\n\n' +
      '  // BAD:\n' +
      '  gql`query { user(id: ${id}) }`\n\n' +
      '  // GOOD:\n' +
      '  gql`query($id: ID!) { user(id: $id) }`'
    );
  };

  const query = strings.raw.join("");

  try {
    const document = parse(query);
    return document as TypedQueryDocumentNode<TData, TVariables>;
  } catch (err) {
    if (err instanceof GraphQLError) {
      throw formatError(err, query);
    };
    throw err;
  };
};
