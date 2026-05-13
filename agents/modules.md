# Modules

A map of every module in grapher: what it does, how it works, and how it connects to the rest. This is the reference document for understanding the system as a whole before diving into individual specs.

---

## How the pieces fit together

Every request follows the same path:

```
client.query(doc, vars)
  → builder (.use, .timeout, .abort)
    → executor
      → pipeline (middleware chain)
        → transport (http / sse / memory)
          → Result<TData, GqlError>
```

The client builds the context. The pipeline transforms it. The transport executes it. The executor wraps the outcome in a `Result` and hands it back.

---

## `gql` — tagged template

**What it does:** Parses a GraphQL document string into a `TypedDocumentNode<TData, TVariables>` at definition time.

**How it works:** Calls `parse()` from `graphql-js` on the template string and attaches `TData` and `TVariables` as phantom type parameters. The result is a standard `TypedDocumentNode` — the same interface used by `graphql-codegen` and `gql.tada`.

**Key behavior:**
- Fails immediately at module load time if the document has syntax errors — not at request time.
- `TVariables` defaults to `never` for operations with no variables.
- The document itself is unchanged — `gql` is purely a parse + type annotation step.

**Differentiator:** Types flow from the document into every downstream call automatically. You never repeat the type at `.query()` or `.send()`.

**Connects to:** `client` (accepted as first argument to `.query()`, `.mutation()`, `.subscription()`), `executor` (document is printed back to string for the request body).

---

## `createClient` — client and fluent builder

**What it does:** The single public entry point. Creates a configured client and returns `.query()`, `.mutation()`, and `.subscription()`. Each operation method returns a builder.

**How it works:** `createClient(config)` stores the global config (url, headers, timeout, plugins, transport). Each call to `.query()` or `.mutation()` creates a new builder instance that inherits the global config and can override it locally. `.send()` on the builder triggers the executor.

**Builder methods:**

| Method | Scope | What it does |
|---|---|---|
| `.use(plugin)` | This request only | Appends a middleware to the local pipeline |
| `.timeout(ms)` | This request only | Overrides the global timeout |
| `.abort(signal)` | This request only | Attaches an external `AbortController` signal |
| `.send()` | — | Executes the operation, returns `Promise<Result<TData, GqlError>>` |

**Key behavior:**
- Global plugins run first, then per-request plugins added with `.use()`.
- `.use()` does not mutate the client — it creates a new builder step.
- `.send()` is the only method that triggers I/O.

**Connects to:** `executor` (`.send()` delegates here), `gql` (accepts `TypedDocumentNode` as input), `pipeline` (passes global + local plugins), `transport` (passes configured or default transport).

---

## `pipeline` — middleware chain

**What it does:** Runs an ordered array of middleware functions, each with the ability to transform the request context, call `next()` to continue, or short-circuit by returning early.

**How it works:** `createPipeline(middlewares)` returns a function that takes an initial `RequestContext` and runs the chain recursively. Each middleware receives `(ctx, next)` — it can mutate ctx, call `next(ctx)` to pass control forward, inspect the result, and then return. Not calling `next()` stops the chain.

**`RequestContext` shape:**
```ts
{
  operation: Operation       // { query, variables, operationName }
  headers: Record<string, string>
  transport: TransportFn
  signal: AbortSignal
  timeout: number
}
```

**Key behavior:**
- Middleware order matters — earlier plugins run first on the way in, last on the way out.
- Short-circuiting (not calling `next`) is a first-class pattern — used for caching, mocking, and early abort.
- Every middleware has identical power to built-in ones — there is no internal API.

**Differentiator:** Most clients expose lifecycle hooks (`beforeRequest`, `afterResponse`). grapher exposes a full pipeline where each step wraps the next — enabling before/after logic, error recovery, and conditional branching in a single composable unit.

**Connects to:** `executor` (pipeline is invoked here), `client` (global and per-request plugins are assembled here), `retryPlugin` / `loggerPlugin` (implement the middleware interface).

---

## `executor` — pipeline runner and result wrapper

**What it does:** Orchestrates one complete request cycle: assembles the context, runs the pipeline, calls the transport, and wraps the outcome in a `Result`.

**How it works:** The executor builds the initial `RequestContext` from the client config and builder overrides, invokes `createPipeline` with the composed middleware list, and passes the transport as the terminal step. It catches any thrown error and maps it to the appropriate `GqlError` variant. It never throws.

**Key behavior:**
- The transport is the last step in the pipeline — middleware always runs before it.
- Network errors, response errors, and timeout errors are caught here and normalized into `GqlNetworkError`, `GqlResponseError`, or `GqlTimeoutError`.
- Timeout is enforced via `AbortController` — the actual network request is cancelled, not just ignored.

**Connects to:** `pipeline`, `transport/*`, `errors/result`, `errors/types`.

---

## `Result<T, E>` — discriminated union

**What it does:** Represents the outcome of any `.send()` call. Either success with typed data, or failure with a typed error. Never an exception.

**Shape:**
```ts
type Result<T, E> =
  | { ok: true;  data: T }
  | { ok: false; error: E }
```

**How it works:** The executor wraps every outcome in `Result` before returning. TypeScript narrows the type automatically when you check `result.ok` — no assertions needed.

**Helpers:** `isOk(result)` and `isErr(result)` — typed narrowing functions for use outside of `if` blocks.

**Differentiator:** Errors are values. The unhappy path is as explicit and structured as the happy path. No try/catch, no swallowed exceptions, no empty catch blocks.

**Connects to:** `executor` (constructed here), `errors/types` (the `E` in `Result<T, E>`).

---

## `errors` — error types

**What it does:** Defines the three error variants that can appear in a failed `Result`.

**Variants:**

| Type | When | Fields |
|---|---|---|
| `GqlNetworkError` | Request never completed | `type: 'network'`, `message: string`, `cause?: unknown` |
| `GqlResponseError` | Server returned `errors[]` | `type: 'response'`, `errors: GraphQLError[]` |
| `GqlTimeoutError` | Request exceeded timeout | `type: 'timeout'`, `ms: number` |

**Key behavior:**
- Each variant has a `type` string discriminant — enables exhaustive `switch` handling.
- `GqlResponseError` preserves the full `GraphQLError[]` array including `path`, `locations`, and `extensions`.
- `GqlNetworkError` preserves the original cause for debugging (`cause?: unknown`).

**Connects to:** `Result` (the `E` type parameter), `executor` (errors are constructed here), `retryPlugin` (retries on `network` and `timeout` variants).

---

## `transport/http` — default HTTP transport

**What it does:** Sends the operation as a POST request with a JSON body and returns the parsed `GraphQLResponse`.

**How it works:** Uses native `fetch`. Timeout is implemented via an internal `AbortController` that is linked to both the user-provided signal (if any) and the timeout duration. The request is actually cancelled — not just ignored after the fact.

**Request format:**
```
POST {url}
Content-Type: application/json

{ "query": "...", "variables": {...}, "operationName": "..." }
```

**Key behavior:**
- No polyfills — relies on native `fetch` available in Bun and all modern runtimes.
- Non-2xx responses that still contain a valid GraphQL body are treated as `GqlResponseError`, not network errors.
- The `operationName` field is omitted if not present in the document.

**Connects to:** `executor` (used as the default `TransportFn`), `errors/types` (maps fetch failures to `GqlNetworkError` or `GqlTimeoutError`).

---

## `transport/sse` — SSE subscription transport

**What it does:** Implements subscriptions over Server-Sent Events. Returns an `AsyncIterable<Result<TData, GqlError>>` that yields one `Result` per server event.

**How it works:** Opens an SSE connection to the GraphQL endpoint. Each `data:` event from the server is parsed as a `GraphQLResponse` and yielded as a `Result`. If the connection drops, it reconnects automatically with exponential backoff. Breaking out of the `for await` loop closes the connection and cleans up all resources.

**Key behavior:**
- Reconnect is automatic — the consumer sees a continuous stream.
- Cleanup is tied to the `for await` loop — no manual `.close()` needed.
- Each event is an independent `Result` — a single error event does not close the stream.

**Connects to:** `client` (`.subscription()` uses this transport), `Result`, `errors/types`.

---

## `transport/memory` — in-memory test transport

**What it does:** Replaces the network with a handler function. Takes an operation and returns a `GraphQLResponse` in-process. Used for testing.

**How it works:** `memoryTransport(handler)` returns a `TransportFn`. The handler receives the `Operation` object and returns a `GraphQLResponse` — or throws to simulate a network error. No network, no ports, no mocks.

**Key behavior:**
- The handler can be as simple as returning a hardcoded object or as complex as routing by `operationName`.
- Throwing inside the handler simulates a `GqlNetworkError`.
- Returning `{ errors: [...] }` simulates a `GqlResponseError`.

**Differentiator:** No `fetch` interception, no MSW setup, no global state. Testing is a pure function call.

**Connects to:** `createClient` (`transport` config option), `executor`.

---

## `plugins/retry` — retry middleware

**What it does:** Automatically retries failed requests on `GqlNetworkError` and `GqlTimeoutError` with exponential backoff.

**How it works:** Wraps the `next()` call in a loop. On a retryable error, waits for `delay * 2^attempt` milliseconds (with optional jitter) and tries again. Stops after `maxAttempts` total attempts.

**Options:**

| Option | Default | Description |
|---|---|---|
| `maxAttempts` | `3` | Total number of attempts including the first |
| `delay` | `500` | Base delay in ms |
| `jitter` | `true` | Randomizes delay to avoid thundering herd |
| `shouldRetry` | network + timeout | Predicate to decide which errors qualify |

**Key behavior:**
- Only retries on errors that indicate the request never reached the server — not on `GqlResponseError` (the server responded, retrying won't help).
- `shouldRetry` makes it possible to retry on specific response errors if needed.
- Can be applied globally (client config) or per-request (`.use()`).

**Connects to:** `pipeline` (implements the middleware interface), `errors/types` (checks error variant).

---

## `plugins/logger` — logger middleware

**What it does:** Logs each request with the operation name, variables, outcome, and duration.

**How it works:** Records a timestamp before calling `next()`, logs the result after. Log output is configurable — level and log function can both be replaced.

**Options:**

| Option | Default | Description |
|---|---|---|
| `level` | `'debug'` | Log level passed to the log function |
| `log` | `console[level]` | Replaceable log function |

**Key behavior:**
- Designed for development only — add it conditionally behind `NODE_ENV`.
- Duration is measured from just before `next()` to just after — includes all downstream middleware and the transport.
- Does not log variables that match a configurable blocklist (useful for masking tokens or PII).

**Connects to:** `pipeline` (implements the middleware interface).