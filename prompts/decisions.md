# Architecture Decisions

Each entry documents a decision that shapes how grapher is built: what was chosen, what was considered and rejected, and why. This file is the canonical record of design intent — useful for understanding existing code and for evaluating future changes.

---

## ADR-001 — `TData` and `TVariables` live in `gql`, not at the call site

**Decision:** Types are declared once inside the `gql` tagged template and flow automatically through the entire call chain. No generics appear at `.query()`, `.mutation()`, or `.send()`.

**Alternatives considered:**

- *Generic at the call site* (`client.query<MyType>(doc, vars)`) — the pattern used by most GraphQL clients. Rejected because the type and the document live in separate places and can drift silently. TypeScript enforces the shape of the generic, but it cannot verify that the generic matches what the server will actually return.
- *Infer from the document at runtime* — requires a schema and runtime introspection. Out of scope for a stateless client.

**Rationale:** The document is already the source of truth for the operation. Attaching types to the document at definition time makes the type system enforce the relationship between the two, not just within the type itself.

---

## ADR-002 — `.send()` returns `Result<T, E>`, never throws

**Decision:** `.send()` always returns a discriminated union `{ ok: true; data: T } | { ok: false; error: E }`. It never throws, not even for network failures.

**Alternatives considered:**

- *Throw on error* — the default JavaScript pattern. Rejected because it externalizes error handling: the caller must remember to wrap every call in try/catch, and TypeScript doesn't enforce it. Errors become implicit.
- *Return `null` on error* — loses the error information entirely.
- *Callback-based* — incompatible with `async/await` ergonomics.

**Rationale:** Errors in network code are expected outcomes, not exceptional states. A discriminated union makes the error path explicit, typed, and exhaustively checkable. The `type` discriminant on each error variant allows precise handling without instanceof checks.

---

## ADR-003 — Middleware as the single extension point

**Decision:** All request behavior beyond sending and receiving — auth, retries, logging, deduplication, anything — is expressed as middleware in a pipeline. There are no other extension hooks (`beforeRequest`, `afterResponse`, `onError`, etc.).

**Alternatives considered:**

- *Lifecycle hooks* — `beforeRequest`, `afterResponse`, `onError` at the client level. Simpler to understand initially, but limited: you can't compose hooks, you can't conditionally skip them, and they don't handle async cleanly.
- *Decorator pattern on the client* — wrapping the client object. Rejected because it requires knowledge of the client's internal API surface.

**Rationale:** A middleware chain is more expressive than hooks: each middleware can act before and after the request, short-circuit the chain entirely, or transform both the request and the response. The same function signature applies to every built-in and user-defined middleware — there is no internal vs. external API split.

---

## ADR-004 — No built-in cache

**Decision:** grapher has no cache, no normalization layer, and no query registry. Each `.send()` is an independent request.

**Alternatives considered:**

- *Optional in-memory cache* — rejected because "optional" caches tend to become expected in practice, and any cache introduces questions of invalidation, consistency, and lifetime that fall outside the library's scope.
- *Plugin-based cache* — the correct approach for anyone who needs one. The middleware API is expressive enough to implement a cache as a plugin that short-circuits the chain on a hit.

**Rationale:** Statelessness is a first-class property, not a default that gets overridden. A cache changes the semantics of every call: the same `.send()` may or may not hit the network depending on invisible state. Excluding the cache keeps the behavior of every call explicit and predictable.

---

## ADR-005 — SSE for subscriptions, not WebSocket

**Decision:** The v0.1 subscription transport uses Server-Sent Events (SSE), not WebSocket.

**Alternatives considered:**

- *WebSocket* — bidirectional, lower latency, the standard for subscriptions in most clients. Deferred to v0.2 because SSE covers the majority of subscription use cases with significantly less protocol complexity, works over standard HTTP infrastructure, and requires no special server-side handling beyond an SSE endpoint.
- *Long polling* — rejected as a transport primitive. Too inefficient and not worth abstracting.

**Rationale:** SSE is unidirectional (server → client), which maps directly to subscription semantics. It works through proxies and load balancers without configuration, uses standard HTTP headers for auth, and has native browser support. WebSocket adds reconnect logic, ping/pong heartbeats, and protocol negotiation that SSE handles transparently. For v0.1, SSE is the simpler and more reliable choice.

---

## ADR-006 — `memoryTransport` as the testing primitive

**Decision:** The recommended way to test code that depends on grapher is `memoryTransport` — a transport that accepts a handler function and returns controlled responses in-process, with no network.

**Alternatives considered:**

- *Mock `fetch`* — intercepting the global `fetch` is brittle, order-dependent, and leaks across tests if not cleaned up carefully.
- *MSW (Mock Service Worker)* — a valid approach, but introduces a separate dependency and service worker infrastructure for what is fundamentally a function-call substitution.
- *Record and replay* — too complex for unit testing; appropriate only for integration or contract tests.

**Rationale:** `memoryTransport` is a function that takes an operation and returns a `GraphQLResponse`. It's the simplest possible seam: no network, no mocks, no global state. The handler is a plain async function, so it can be as simple or as complex as the test requires.

---

## ADR-007 — `graphql-js` as an optional `peerDependency`

**Decision:** `graphql-js` is listed as an optional `peerDependency`. It is required only when using the `gql` tagged template directly. Users who bring documents from `graphql-codegen` don't need it.

**Alternatives considered:**

- *Bundle `graphql-js`* — rejected because `graphql-js` is large and most users who use codegen already have it as a dev dependency. Bundling it would duplicate it in the output.
- *Write a custom parser* — maintaining a GraphQL parser is out of scope and unnecessary when `graphql-js` is already the standard.
- *Remove the `gql` template entirely* — rejected because it is a meaningful DX feature for users who write queries inline.

**Rationale:** Optional peer dependency is the correct signal: grapher can use `graphql-js` if you have it, but it's not a hard requirement. Users who only use `TypedDocumentNode` from codegen pay zero cost.