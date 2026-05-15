import { describe, it, expect } from "vitest";
import { GraphQLError } from "graphql";
import { MemoryTransport } from "@transports/mem";
import type { Operation } from "@pipelines/types";

const op: Operation = { name: "GetUser", query: "{ user { id } }" };

describe("memoryTransport", () => {
  describe("synchronous handler", () => {
    it("returns the handler's data response", async () => {
      const { send } = new MemoryTransport(() => ({ data: { user: { id: "1" } } }));
      const result = await send(op);
      expect(result).toEqual({ data: { user: { id: "1" } } });
    });

    it("passes the operation to the handler", async () => {
      let received: Operation | undefined;
      const { send } = new MemoryTransport((o) => {
        received = o;
        return { data: null };
      });
      await send(op);
      expect(received).toBe(op);
    });

    it("returns error responses from the handler", async () => {
      const errors = [new GraphQLError("not found")];
      const { send } = new MemoryTransport(() => ({ errors }));
      const result = await send(op);
      expect(result.errors).toBe(errors);
    });
  });

  describe("asynchronous handler", () => {
    it("resolves the handler's async response", async () => {
      const { send } = new MemoryTransport(async () => ({ data: { id: "2" } }));
      const result = await send(op);
      expect(result).toEqual({ data: { id: "2" } });
    });

    it("passes the operation to an async handler", async () => {
      let received: Operation | undefined;
      const { send } = new MemoryTransport(async (o) => {
        received = o;
        return { data: null };
      });
      await send(op);
      expect(received).toBe(op);
    });
  });

  describe("simulating errors", () => {
    it("propagates a thrown error from the handler", async () => {
      const { send } = new MemoryTransport(() => { throw new Error("network failure"); });
      await expect(send(op)).rejects.toThrow("network failure");
    });

    it("propagates a rejection from an async handler", async () => {
      const { send } = new MemoryTransport(async () => { throw new Error("async failure"); });
      await expect(send(op)).rejects.toThrow("async failure");
    });
  });
});
