import { describe, it, expect } from "vitest";
import { createClient } from "@client";
import { MemoryTransport } from "@transports/mem";
import { gql } from "@graphql/tagged";
import type { Middleware } from "@pipelines/types";

const GetUser = gql<{ user: { id: string } }>`
  query GetUser {
    user { id }
  }
`;

const GetUserById = gql<{ user: { id: string } }, { id: string }>`
  query GetUserById($id: ID!) {
    user(id: $id) { id }
  }
`;

describe("createClient", () => {
  describe("query", () => {
    it("returns a builder with send and use", () => {
      const client = createClient({ transport: new MemoryTransport(() => ({ data: null })).send });
      const builder = client.query(GetUser);
      expect(typeof builder.send).toBe("function");
      expect(typeof builder.use).toBe("function");
    });

    it("returns { ok: true } with data on success", async () => {
      const data = { user: { id: "1" } };
      const client = createClient({ transport: new MemoryTransport(() => ({ data })).send });
      const result = await client.query(GetUser).send();
      expect(result).toEqual({ ok: true, data });
    });

    it("passes variables to the transport", async () => {
      let received: unknown;
      const transport = new MemoryTransport((op) => { received = op.vars; return { data: null }; });
      const client = createClient({ transport: transport.send });
      await client.query(GetUserById, { id: "42" }).send();
      expect(received).toEqual({ id: "42" });
    });

    it("passes the operation name to the transport", async () => {
      let receivedName: string | undefined;
      const transport = new MemoryTransport((op) => { receivedName = op.name; return { data: null }; });
      const client = createClient({ transport: transport.send });
      await client.query(GetUser).send();
      expect(receivedName).toBe("GetUser");
    });

    it("returns { ok: false } when the transport returns errors", async () => {
      const transport = new MemoryTransport(() => ({ errors: [{ message: "not found" } as never] }));
      const client = createClient({ transport: transport.send });
      const result = await client.query(GetUser).send();
      expect(result.ok).toBe(false);
    });

    it("returns { ok: false } when the transport throws", async () => {
      const transport = new MemoryTransport(() => { throw new Error("network failure"); });
      const client = createClient({ transport: transport.send });
      const result = await client.query(GetUser).send();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe("network");
    });
  });

  describe("mutation", () => {
    it("returns { ok: true } with data on success", async () => {
      const CreatePost = gql<{ createPost: { id: string } }, { title: string }>`
        mutation CreatePost($title: String!) {
          createPost(title: $title) { id }
        }
      `;
      const data = { createPost: { id: "p1" } };
      const client = createClient({ transport: new MemoryTransport(() => ({ data })).send });
      const result = await client.mutation(CreatePost, { title: "Hello" }).send();
      expect(result).toEqual({ ok: true, data });
    });
  });

  describe("builder.use()", () => {
    it("runs the added middleware on send", async () => {
      const trace: string[] = [];
      const mw: Middleware = async (ctx, next) => { trace.push("mw"); return next(ctx); };
      const client = createClient({ transport: new MemoryTransport(() => ({ data: null })).send });
      await client.query(GetUser).use(mw).send();
      expect(trace).toEqual(["mw"]);
    });

    it("does not mutate the original builder", async () => {
      const trace: string[] = [];
      const mw: Middleware = async (ctx, next) => { trace.push("mw"); return next(ctx); };
      const client = createClient({ transport: new MemoryTransport(() => ({ data: null })).send });
      const builder = client.query(GetUser);
      builder.use(mw);
      await builder.send();
      expect(trace).toEqual([]);
    });

    it("chains multiple use() calls in order", async () => {
      const trace: string[] = [];
      const mw1: Middleware = async (ctx, next) => { trace.push("1"); return next(ctx); };
      const mw2: Middleware = async (ctx, next) => { trace.push("2"); return next(ctx); };
      const client = createClient({ transport: new MemoryTransport(() => ({ data: null })).send });
      await client.query(GetUser).use(mw1).use(mw2).send();
      expect(trace).toEqual(["1", "2"]);
    });
  });

  describe("middleware ordering", () => {
    it("runs global middleware before per-request middleware", async () => {
      const trace: string[] = [];
      const globalMw: Middleware = async (ctx, next) => { trace.push("global"); return next(ctx); };
      const localMw: Middleware = async (ctx, next) => { trace.push("local"); return next(ctx); };
      const client = createClient({
        transport: new MemoryTransport(() => ({ data: null })).send,
        middleware: [globalMw],
      });
      await client.query(GetUser).use(localMw).send();
      expect(trace).toEqual(["global", "local"]);
    });
  });

  describe("global headers", () => {
    it("forwards configured headers to the context", async () => {
      let receivedHeaders: Record<string, string> | undefined;
      const mw: Middleware = async (ctx, next) => {
        receivedHeaders = ctx.headers;
        return next(ctx);
      };
      const client = createClient({
        transport: new MemoryTransport(() => ({ data: null })).send,
        headers: { Authorization: "Bearer token" },
        middleware: [mw],
      });
      await client.query(GetUser).send();
      expect(receivedHeaders).toMatchObject({ Authorization: "Bearer token" });
    });
  });
});
