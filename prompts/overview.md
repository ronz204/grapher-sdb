### Overview

grapher is a minimal, type-safe GraphQL client for TypeScript. It sits between your application code and a GraphQL API: it sends operations, returns typed results, and lets you compose any extra behavior through a middleware system. That's the entire scope. No cache, no global state, no framework opinions.

---

### The problem it solves

Every mainstream GraphQL client is built around a cache. The cache is the product — it drives the API design, the bundle size, the mental model, and the upgrade pain. If you don't need the cache (most backends, CLIs, scripts, server-side code), you're still paying for all of it.

Beyond the cache, most clients force you to repeat type information at the call site:

```ts
// what every other client asks you to do
const result = await request<GetUserQuery>(url, document, variables)
```

The type and the document live in separate places. You update one, forget the other, and TypeScript has no way to warn you — the drift is silent.

grapher solves both problems. It drops the cache entirely and makes the document the single source of truth for types: you define `TData` and `TVariables` once inside `gql`, and they flow automatically through the entire call chain. No generics at the call site, ever.

---

### Who it's for

grapher is a good fit when you need:

- A GraphQL client for a **backend service, CLI, or script** — environments where a normalized cache adds no value
- A **lightweight alternative** to Apollo Client or urql in a frontend that doesn't need reactive caching
- A client that **works with your existing codegen** — grapher accepts `TypedDocumentNode`, so `graphql-codegen` and `gql.tada` work without any adapter
- **Full control over request behavior** through a composable middleware system, without patching internal APIs

It is not a good fit if you need a normalized client-side cache, optimistic UI, or automatic re-rendering on cache updates. Those use cases are exactly what Apollo Client and urql are built for.

---

### What it ships

This is temporary, it can change in the future.

| Piece | What it does |
|---|---|
| `createClient()` | Single entry point. Returns a typed client. |
| `gql` tagged template | Parses the document, attaches `TData` and `TVariables`. |
| Fluent builder API | `.use()`, `.timeout()`, `.abort()`, `.send()` per request. |
| `Result<T, E>` | Discriminated union — `.send()` never throws. |
| HTTP transport | Native `fetch`, POST, `AbortController` timeout. |
| SSE transport | Subscriptions as `AsyncIterable`. Auto-reconnects. |
| Memory transport | In-process handler for testing. No network. |
| `retryPlugin` | Exponential backoff with jitter. |
| `loggerPlugin` | Operation name, variables, duration, outcome. |

---

### What it deliberately excludes

- **Request batching** — planned for v0.2.
- **Persisted queries** — planned for v0.2.
- **Schema validation** — planned for v0.2.

---

### Runtime and build

- Built with and optimized for **Bun**, but runs in any modern runtime that supports native `fetch`.
- Ships **ESM + CJS dual output** with full `.d.ts` declarations.
- `graphql` is an **optional `peerDependency`** — required only if you use the `gql` tagged template directly. Unnecessary if you bring documents from `graphql-codegen`.