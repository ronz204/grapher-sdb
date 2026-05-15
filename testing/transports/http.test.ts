import { describe, it, expect, vi, afterEach } from "vitest";
import { HttpTransport } from "@transports/http";
import type { Operation } from "@pipelines/types";
import type { GqlResponse } from "@graphql/errors";

const op: Operation = { name: "GetUser", query: "{ user { id } }" };

function mockFetch(body: GqlResponse): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );
};

describe("httpTransport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("request format", () => {
    it("sends a POST request to the configured url", async () => {
      const spy = mockFetch({ data: null });
      const { send } = new HttpTransport({ url: "https://api.example.com/graphql" });
      await send(op);

      const [url, init] = spy.mock.calls[0]!;
      expect(url).toBe("https://api.example.com/graphql");
      expect((init as RequestInit).method).toBe("POST");
    });

    it("sets Content-Type to application/json", async () => {
      const spy = mockFetch({ data: null });
      const { send } = new HttpTransport({ url: "https://api.example.com/graphql" });
      await send(op);

      const [, init] = spy.mock.calls[0]!;
      expect(init as RequestInit).toMatchObject({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      });
    });

    it("sends the query and operationName in the body", async () => {
      const spy = mockFetch({ data: null });
      const { send } = new HttpTransport({ url: "https://api.example.com/graphql" });
      await send(op);

      const [, init] = spy.mock.calls[0]!;
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.query).toBe(op.query);
      expect(body.name).toBe(op.name);
    });

    it("includes variables in the body when present", async () => {
      const spy = mockFetch({ data: null });
      const opWithVars: Operation = { ...op, vars: { id: "1" } };
      const { send } = new HttpTransport({ url: "https://api.example.com/graphql" });
      await send(opWithVars);

      const [, init] = spy.mock.calls[0]!;
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.variables).toEqual({ id: "1" });
    });

    it("omits variables from the body when absent", async () => {
      const spy = mockFetch({ data: null });
      const { send } = new HttpTransport({ url: "https://api.example.com/graphql" });
      await send(op);

      const [, init] = spy.mock.calls[0]!;
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).not.toHaveProperty("variables");
    });

    it("merges configured headers into the request", async () => {
      const spy = mockFetch({ data: null });
      const { send } = new HttpTransport({
        url: "https://api.example.com/graphql",
        headers: { Authorization: "Bearer token" },
      });
      await send(op);

      const [, init] = spy.mock.calls[0]!;
      expect(init as RequestInit).toMatchObject({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      });
    });
  });

  describe("response handling", () => {
    it("returns the parsed data from the response", async () => {
      mockFetch({ data: { user: { id: "1" } } });
      const { send } = new HttpTransport({ url: "https://api.example.com/graphql" });
      const result = await send(op);
      expect(result.data).toEqual({ user: { id: "1" } });
    });

    it("returns errors present in the response body", async () => {
      mockFetch({ errors: [{ message: "not found" } as never] });
      const { send } = new HttpTransport({ url: "https://api.example.com/graphql" });
      const result = await send(op);
      expect(result.errors).toEqual([{ message: "not found" }]);
    });

    it("propagates fetch failures as rejected promises", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("connection refused"));
      const { send } = new HttpTransport({ url: "https://api.example.com/graphql" });
      await expect(send(op)).rejects.toThrow("connection refused");
    });
  });
});
