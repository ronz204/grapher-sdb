import { describe, it, expect } from "vitest";
import { gql } from "@gql";

describe("gql", () => {
  it("parses a valid document without throwing", () => {
    expect(() => {
      gql`
        query GetUser($id: ID!) {
          user(id: $id) {
            name
          }
        }
      `;
    }).not.toThrow();
  });

  it("throws at definition time on an invalid document", () => {
    expect(() => {
      gql`
        query {
          @@invalid syntax
        }
      `;
    }).toThrow(/GraphQL syntax error/);
  });

  it("throws when interpolation is attempted", () => {
    const id = "42";
    expect(() => {
      gql`query { user(id: ${id}) { name } }`;
    }).toThrow(/does not support interpolation/);
  });

  it("returns a DocumentNode with the correct shape", () => {
    const doc = gql`
      query GetUser {
        user {
          name
        }
      }
    `;
    expect(doc.kind).toBe("Document");
    expect(doc.definitions).toHaveLength(1);
  });
});
