# Build Guideline

Construction roadmap for grapher v0.1. Covers the build order, what each phase delivers, and what done looks like for each piece. Phases are sequential — later phases depend on earlier ones being complete and tested.

---

## Principles for building this

- **Build bottom-up.** Types and errors first, then the pipeline, then the transport, then the client on top. Never build a consumer before the thing it consumes.
- **Test at every layer.** Each module gets tests before the next module is started. A broken foundation discovered late is expensive.
- **No placeholders.** If a module isn't ready, the phase isn't done. Stubs are only acceptable inside the module being built, not across modules.
- **One transport at a time.** HTTP first, SSE after, memory in parallel with HTTP (it's needed for testing).

---

## Overview

| Phase | What it delivers | Duration |
|---|---|---|
| 1 | Project scaffold, tooling, types | Days 1–2 |
| 2 | `gql`, `Result`, error types | Days 3–4 |
| 3 | Pipeline and executor | Days 5–6 |
| 4 | HTTP transport + memory transport | Days 7–8 |
| 5 | `createClient` + fluent builder | Days 9–10 |
| 6 | `retryPlugin` + `loggerPlugin` | Days 11–12 |
| 7 | SSE transport (subscriptions) | Days 13–15 |
| 8 | Integration tests + examples | Days 16–17 |
| 9 | Build, types output, publish prep | Days 18–19 |

Total: ~19 days for a complete, tested, publishable v0.1.

---

## Phase 1 — Scaffold and tooling (Days 1–2)

Set up the project so every subsequent phase has a clean foundation to build on.

**Tasks:**
- Initialize the repo with `bun init`
- Configure `tsconfig.json` — strict mode, ESM output, path aliases
- Set up `bunup` for dual ESM + CJS build
- Create the full `src/` directory structure (empty files are fine)
- Set up `bun test` and verify the test runner works
- Add `graphql` as an optional peer dependency in `package.json`
- Write a minimal `src/index.ts` barrel (empty exports for now)
- Set up `build.ts` with the bunup config

**Done when:**
- `bun run build` completes without errors
- `bun test` runs and reports 0 tests (not a failure)
- Directory structure matches the spec in `contributing/structure.md`

---

## Phase 2 — `gql`, `Result`, and error types (Days 3–4)

The two foundational primitives that everything else depends on: the document wrapper and the result/error model.

**Tasks:**

`src/gql.ts`
- Implement the `gql` tagged template
- Call `parse()` from `graphql-js` on the template string
- Return a `TypedDocumentNode<TData, TVariables>`
- Throw a descriptive error at parse time (not at request time) if the document is invalid

`src/errors/types.ts`
- Define `GqlNetworkError` — `{ type: 'network'; message: string; cause?: unknown }`
- Define `GqlResponseError` — `{ type: 'response'; errors: GraphQLError[] }`
- Define `GqlTimeoutError` — `{ type: 'timeout'; ms: number }`
- Define `GqlError` as the union of the three

`src/errors/result.ts`
- Define `Result<T, E>` — `{ ok: true; data: T } | { ok: false; error: E }`
- Export `isOk(result): result is { ok: true; data: T }`
- Export `isErr(result): result is { ok: false; error: E }`

**Tests:**
- `gql` parses a valid document without throwing
- `gql` throws at definition time on an invalid document
- `isOk` and `isErr` narrow correctly
- Error types have the correct `type` discriminant values

**Done when:** All tests pass. TypeScript accepts `gql<MyData, MyVars>` and infers correctly.

---

## Phase 3 — Pipeline and executor (Days 5–6)

The execution core. Pipeline runs middleware. Executor connects pipeline to transport.

**Tasks:**

`src/core/types.ts`
- Define `Operation` — `{ query: string; variables?: unknown; operationName?: string }`
- Define `RequestContext` — `{ operation, headers, transport, signal, timeout }`
- Define `TransportFn` — `(op: Operation, signal: AbortSignal) => Promise<GraphQLResponse>`
- Define `Middleware` — `(ctx: RequestContext, next: NextFn) => Promise<RequestContext>`
- Define `NextFn` — `(ctx: RequestContext) => Promise<RequestContext>`
- Define `GraphQLResponse` — `{ data?: unknown; errors?: GraphQLError[] }`

`src/core/pipeline.ts`
- Implement `createPipeline(middlewares: Middleware[])`
- Return a function that takes an initial `RequestContext` and runs the chain
- Each middleware calls `next(ctx)` to continue or returns early to short-circuit

`src/core/executor.ts`
- Build `RequestContext` from config and builder overrides
- Invoke `createPipeline` with the composed middleware list
- Pass the transport as the terminal step
- Catch errors and map to `GqlNetworkError`, `GqlResponseError`, or `GqlTimeoutError`
- Always return `Result<TData, GqlError>` — never throw

**Tests:**
- Pipeline runs middlewares in order
- Short-circuiting a middleware stops the chain
- A middleware can modify `ctx` before and after `next()`
- Executor returns `{ ok: true, data }` on success
- Executor returns `{ ok: false, error }` on transport error
- Executor never throws — error cases return `Result`, not exceptions

**Done when:** Pipeline and executor tests pass. Executor can be tested using a stub transport (inline function, not `memoryTransport` — that comes next).

---

## Phase 4 — HTTP transport and memory transport (Days 7–8)

Two transports in parallel: the real one (HTTP) and the test one (memory). Memory transport is needed to test the client in Phase 5.

**Tasks:**

`src/transport/http.ts`
- Implement `httpTransport(url: string, defaultHeaders: Headers): TransportFn`
- POST the operation as JSON to the URL
- Set `Content-Type: application/json`
- Implement timeout via internal `AbortController` — cancel the actual request, not just the response handling
- Link the timeout signal with any external signal passed from the builder
- Parse the response as JSON and return a `GraphQLResponse`
- Map `fetch` errors to `GqlNetworkError`
- Map timeout to `GqlTimeoutError`

`src/transport/memory.ts`
- Implement `memoryTransport(handler: (op: Operation) => Promise<GraphQLResponse>): TransportFn`
- Call the handler directly — no network
- Let the handler throw to simulate a `GqlNetworkError`
- Let the handler return `{ errors: [...] }` to simulate a `GqlResponseError`

**Tests (http):**
- Sends correct POST body (operationName, query, variables)
- Sets `Content-Type: application/json`
- Returns `{ data }` on 200 with a valid body
- Returns `GqlResponseError` when the body contains `errors[]`
- Returns `GqlNetworkError` on fetch failure
- Returns `GqlTimeoutError` when timeout is exceeded
- Cancels the request on abort signal

**Tests (memory):**
- Calls the handler with the correct operation
- Returns `{ data }` from the handler
- Maps handler `{ errors }` to `GqlResponseError`
- Maps handler throw to `GqlNetworkError`

**Done when:** Both transports are tested. Memory transport is ready to be used in Phase 5 client tests.

---

## Phase 5 — `createClient` and fluent builder (Days 9–10)

The public-facing API. This is what users import.

**Tasks:**

`src/core/client.ts`
- Implement `createClient(config: ClientConfig)`
- Config accepts: `url`, `headers`, `timeout`, `plugins`, `transport`
- Return an object with `.query()`, `.mutation()`, `.subscription()`
- Each method returns a builder
- Builder implements `.use(plugin)`, `.timeout(ms)`, `.abort(signal)`, `.send()`
- `.use()` must not mutate the client — return a new builder instance
- `.send()` delegates to the executor
- Global plugins run before per-request plugins

**Tests (use `memoryTransport` for all client tests):**
- `.query()` passes the correct operation to the transport
- `.mutation()` passes the correct operation to the transport
- `result.data` is typed correctly based on the document
- Wrong variable type is a TypeScript compile error (type-level test)
- `.use()` adds middleware only for that request
- `.timeout()` overrides the global timeout for that request
- `.abort()` cancels the request when the signal fires
- Global plugins run before per-request plugins
- Client config is not mutated by builder methods

**Done when:** All tests pass. End-to-end flow works: `createClient` → `.query(doc, vars).send()` → `Result`.

---

## Phase 6 — `retryPlugin` and `loggerPlugin` (Days 11–12)

Two built-in plugins that demonstrate the middleware system and cover real production needs.

**Tasks:**

`src/plugins/retry.ts`
- Implement `retryPlugin(options?)` returning a `Middleware`
- Retry on `GqlNetworkError` and `GqlTimeoutError` by default
- Exponential backoff: `delay * 2^attempt`
- Jitter: randomize delay by ±30% when enabled
- `shouldRetry` predicate overrides default behavior
- Stop after `maxAttempts` total attempts (not retries)

`src/plugins/logger.ts`
- Implement `loggerPlugin(options?)` returning a `Middleware`
- Log before calling `next()`: operation name, variables
- Log after: duration in ms, outcome (ok / error type)
- Default to `console.debug`
- Accept a custom `log` function

**Tests (retry):**
- Retries exactly `maxAttempts - 1` times on network error
- Does not retry on `GqlResponseError`
- Respects `shouldRetry` predicate
- Applies exponential backoff between attempts
- Does not retry after max attempts — returns the last error

**Tests (logger):**
- Calls the log function before and after the request
- Logs the correct operation name
- Logs duration as a number greater than 0
- Calls the custom `log` function if provided

**Done when:** Both plugins tested. Both work correctly when added to `createClient` config and via `.use()`.

---

## Phase 7 — SSE transport / subscriptions (Days 13–15)

The most complex piece. Three days because SSE reconnect and async cleanup require careful implementation.

**Tasks:**

`src/transport/sse.ts`
- Implement `sseTransport(url: string, headers: Headers): SseTransportFn`
- Return an `AsyncGenerator<Result<TData, GqlError>>`
- Parse each `data:` event as a `GraphQLResponse` and yield a `Result`
- Reconnect automatically on connection drop with exponential backoff
- Clean up the connection when the `for await` loop exits (via `return()` on the generator)
- Link cleanup to any external `AbortSignal`

`src/core/client.ts` (update)
- Wire `.subscription()` to the SSE transport
- `.subscription()` returns the `AsyncIterable` directly — no `.send()`, it's already lazy

**Tests:**
- Yields `{ ok: true, data }` for each valid SSE event
- Yields `{ ok: false, error }` for malformed events
- Reconnects on connection drop
- Stops reconnecting after the loop exits
- Cleans up the connection on break
- Cleans up on abort signal

**Done when:** Subscription tests pass. A `for await` loop over `.subscription()` works end-to-end.

---

## Phase 8 — Integration tests and examples (Days 16–17)

End-to-end validation across the full stack and working examples for documentation.

**Tasks:**

Integration tests (`tests/`)
- Full query flow: `createClient` → `gql` → `.query().send()` → `Result`
- Full mutation flow
- Retry plugin integrated with the client
- Logger plugin integrated with the client
- Per-request `.use()` vs global plugins — order verification
- `.abort()` cancels mid-flight request
- Subscription: full `for await` loop with early break

Examples (`examples/`)
- `basic.ts` — query and mutation with error handling
- `with-plugins.ts` — auth middleware, retry, logger
- `subscriptions.ts` — `for await` loop, break, cleanup

**Done when:** All integration tests pass. Examples run without errors using `bun run examples/basic.ts`.

---

## Phase 9 — Build, types, publish prep (Days 18–19)

Package it for release.

**Tasks:**
- Run `bunup` and verify ESM + CJS output
- Verify `.d.ts` files are generated for every public export
- Verify `src/index.ts` barrel exports everything public and nothing internal
- Check `package.json` `exports` field covers `import`, `require`, and `types`
- Verify tree-shaking works — import only `retryPlugin`, bundle should not include `loggerPlugin`
- Run the full test suite one final time
- Write `CHANGELOG.md` with the v0.1 feature list
- Tag `v0.1.0`

**Done when:** `npm pack` produces a clean tarball. A fresh project can install it and run the basic example without errors.

---

## Backlog (post v0.1)

Items that are explicitly out of scope for v0.1 but tracked for future releases.

### v0.2

| Item | Notes |
|---|---|
| WebSocket transport | For subscriptions that require bidirectional communication |
| Request batching | Multiple operations in a single HTTP request |
| Persisted queries (APQ) | Send hash first, full query on cache miss |
| Schema validation plugin | Validate operations against a schema before sending |
| `dedupPlugin` | Deduplicate in-flight requests with the same operation + variables |

### v1.0

| Item | Notes |
|---|---|
| Stable API guarantee | Semver contract, no breaking changes without major bump |
| OpenTelemetry plugin | Traces and spans for every request |
| Multipart file upload | GraphQL multipart request spec |
| Federation hints | Support for `@defer` and `@stream` |

---

## Definition of done (v0.1)

A phase is done when:
1. All unit tests for that phase pass
2. TypeScript reports zero errors with `strict: true`
3. No module imports from a module in a later phase
4. The public API surface matches the spec in `docs/spec/`

The release is done when:
1. All phases are complete
2. Integration tests pass
3. Examples run
4. The build produces valid ESM + CJS + `.d.ts`
5. `npm pack` succeeds on a clean install