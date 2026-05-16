import type { DocumentNode } from "graphql";
import { parse, print, GraphQLError } from "graphql";

export function interpolate(values: unknown[]): void {
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
};

type Arguments = { query: string; err: GraphQLError; };
export function formatter({ query, err }: Arguments): Error {
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

export const strToAst = (query: string): DocumentNode => parse(query);
export const astToStr = (doc: DocumentNode): string => print(doc);
