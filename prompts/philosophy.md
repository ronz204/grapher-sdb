### Philosophy

These are the principles behind every design decision in grapher. When something is unclear — what to include, how an API should behave, where a boundary belongs — the answer comes from here.

---

### Minimal core, composable surface

The core does exactly one thing: execute a GraphQL operation and return a typed result. Everything else — auth, retries, logging, caching, deduplication — is a plugin.

This means the core stays small and predictable regardless of what plugins you add. It also means there is no feature that requires internal access. Every plugin you write has exactly the same power as the built-in ones. There is no privileged internal API.

If a feature can't be expressed as middleware, it doesn't belong in grapher.

---

### Type lives in the document, not at the call site

The response type and the query document are the same thing, expressed in two languages. Keeping them in separate places — the document in one file, the generic at the call site — creates a gap that silently drifts. TypeScript can't warn you when you update the query and forget to update the type.

In grapher, `TData` and `TVariables` are declared once, inside `gql`, at the definition site of the document. From that point they flow automatically: through `.query()`, through `.send()`, into `result.data`. There are no generics at the call site. The document is the single source of truth.

This is not a convention. It's enforced by the type system.

---

### Errors are values, not exceptions

`.send()` never throws. It returns a `Result<T, E>` — a discriminated union with an `ok` flag. Checking `result.ok` is all TypeScript needs to narrow the type and know what's available.

Errors are further discriminated by a `type` field: `'network'`, `'response'`, `'timeout'`. Each carries exactly the fields that make sense for that case, and nothing else. You handle them with a `switch` and TypeScript tells you if you miss a case.

The goal is to make the unhappy path as structured and explicit as the happy path. Empty catch blocks and swallowed errors are not a grapher pattern.

---

### Stateless by default

There is no global store, no normalized cache, no query registry. Each `.send()` is an independent HTTP request. What you do with the result is entirely up to you.

This is a constraint, not a limitation. Statelessness makes behavior predictable: the same call always does the same thing, regardless of what happened before. It makes testing trivial: no setup, no teardown, no cache invalidation. And it makes grapher appropriate in environments where a cache would be meaningless — server-side code, CLIs, background jobs.

If you need a cache, you can build one as a plugin. That is by design.

---

### Ecosystem compatible, not ecosystem dependent

grapher speaks `TypedDocumentNode` — the standard interface the GraphQL ecosystem uses to carry types inside documents. Any tool that outputs a `TypedDocumentNode` works with grapher out of the box: `graphql-codegen`, `gql.tada`, any future tool that adopts the same interface.

`graphql-js` is an optional `peerDependency`. grapher uses three things from it: `parse()`, `print()`, and the `TypedDocumentNode` type. Nothing from the execution engine, resolvers, or schema builder. If you bring documents from codegen, you don't need `graphql-js` at all.

The goal is zero lock-in. grapher should be easy to adopt and easy to leave.