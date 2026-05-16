# grapher — Copilot Instructions

## Context files — read these before writing any code

The `archive/` folder contains the authoritative documentation for this project. Always read the relevant files before implementing anything.

| File | When to read it |
|---|---|
| `archive/overview.md` | Starting any task — what the project is, who it's for, what it ships |
| `archive/philosophy.md` | Before any API or design decision — the 5 core principles |
| `archive/modules.md` | Before touching any module — full map of every piece and how they connect |
| `archive/guideline.md` | Before implementing a phase — build order, tasks, and done criteria per phase |
| `archive/decisions.md` | Before changing an existing pattern — ADR rationale and rejected alternatives |

**Rule:** If a task touches more than one module, read `modules.md` and `guideline.md` first. If it involves a design choice, read `philosophy.md` and `decisions.md` first.

---

## Project at a glance

- **What:** Minimal, type-safe GraphQL client for TypeScript. No cache, no global state.
- **Runtime:** Bun. Runs anywhere with native `fetch`.
- **Source:** `source/` (not `src/`). Entry point: `source/index.ts`.
- **Tests:** Vitest (`vitest.config.ts`).
- **Build:** `bunup` — dual ESM + CJS with `.d.ts` declarations.

---

## Hard rules (never break these)

- Never add generics at `.query()`, `.mutation()`, or `.send()` call sites — types flow from `gql`.
- Never let `.send()` throw — always return `Result<T, E>`.
- Never build a module before the one it depends on (see `archive/guideline.md`).
- Never intercept `fetch` globally in tests — use `memoryTransport`.
- Never add error handling with `instanceof` — use the `type` discriminant on error variants.
- Never mutate `ctx` in middleware outside of an explicit `next(ctx)` handoff.
