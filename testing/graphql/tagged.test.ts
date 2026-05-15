import { gql } from "@graphql/tagged";
import { describe, it, expect } from "vitest";
import type { OperationDefinitionNode } from "graphql";

describe("gql", () => {
  describe("valid documents", () => {
    it("parses a query without throwing", () => {
      expect(() => gql`query GetUser { user { id name } }`).not.toThrow();
    });

    it("parses a mutation without throwing", () => {
      expect(() =>
        gql`mutation CreateUser($name: String!) { createUser(name: $name) { id } }`
      ).not.toThrow();
    });

    it("parses a fragment without throwing", () => {
      expect(() =>
        gql`fragment UserFields on User { id name }`
      ).not.toThrow();
    });

    it("returns a DocumentNode with kind 'Document'", () => {
      const doc = gql`query GetUser { user { id name } }`;
      expect(doc.kind).toBe("Document");
    });

    it("returns a DocumentNode with the correct number of definitions", () => {
      const doc = gql`query GetUser { user { id } }`;
      expect(doc.definitions).toHaveLength(1);
    });

    it("preserves the operation name in definitions", () => {
      const doc = gql`query GetUser { user { id } }`;
      const definition = doc.definitions[0] as OperationDefinitionNode;
      expect(definition.name?.value).toBe("GetUser");
    });
  });
});
