# Architecture

## Purpose

This plugin owns continuity behavior end to end:

- capture durable items from turns
- persist and review those items
- resolve same-user direct-session scope
- persist recent bound direct-history excerpts
- materialize approved continuity markdown files
- inject approved continuity context into prompt construction
- expose gateway/CLI/HTTP controls for operators

The implementation lives in this repository under `src/continuity/*`.

## Registration Lifecycle

`src/index.ts` is the runtime entrypoint.

1. `register(api)` validates plugin config shape via `resolveContinuityConfig(api.pluginConfig)`.
2. A lazy singleton `ensureService()` is created for one `ContinuityService` instance per registration call.
3. Plugin wires:
   - context engine: `registerContextEngine("continuity", factory)`
   - gateway methods: `continuity.status|list|patch|explain`
   - CLI registrar: `registerCli(..., { commands: ["continuity"] })`
   - HTTP route: `registerHttpRoute({ path: "/plugins/continuity", auth: "gateway", match: "exact" })`
   - hook: `on("before_prompt_build", handler)`
4. Context engine factory constructs:
   - `new ContinuityContextEngine({ service: ensureService(), logger })`

## Core Components

### `ContinuityService` (`src/continuity/service.ts`)

Primary stateful domain service.

- Store path per agent:
  - `<stateDir>/agents/<agentId>/continuity/store.json`
- Recent-history store path per agent:
  - `<stateDir>/agents/<agentId>/continuity/recent.json`
- Store format:
  - durable store: `{ version: 2, records: ContinuityRecord[] }`
  - recent store: `{ version: 1, entries: ContinuityRecentEntry[] }`
- Write model:
  - async lock (`createAsyncLock`) serializes mutations
  - atomic file writes (`writeJsonAtomic`, `writeTextAtomic`)
- Public API:
  - `captureTurn`
  - `list`
  - `status`
  - `subjects`
  - `recent`
  - `patch`
  - `explain`
  - `buildSystemPromptAddition`

### `ContinuityContextEngine` (`src/continuity/engine.ts`)

Context-engine adapter around service behavior.

- `bootstrap`/`ingest`/`assemble` are pass-through/no-op for continuity state changes.
- `afterTurn` extracts the new turn slice and calls `service.captureTurn(...)`.
- `compact` delegates to OpenClaw embedded compact runtime when available; otherwise returns a safe non-compacting fallback.

### Extractor + Scope Modules

- `extractor.ts`: heuristic continuity extraction + prompt-injection pattern rejection.
- `scope.ts`: source classification and recall scope policy evaluation.
- `identity.ts`: agent/direct-session binding resolution into `agent | subject | session` scope.
- `session-key.ts`: agent/session parsing and workspace resolution.

### HTTP Dashboard Route (`src/continuity/route.ts`)

Route: `/plugins/continuity`

- `GET`: renders continuity dashboard HTML (slot status, config form, pending/approved tables)
- `POST`: handles:
  - config save (`save-config`)
  - slot toggle (`slot-enable`, `slot-disable`)
  - review actions (`approve`, `reject`, `remove`)

## Capture Pipeline

1. `afterTurn` receives full message history and `prePromptMessageCount`.
2. Engine derives new turn messages (or falls back to trailing user/assistant window when boundaries are stale).
3. Service rejects capture when:
   - no `sessionKey`
   - subagent session
   - capture mode for source class is `off` for durable extraction only
4. Extractor returns matches (`fact|preference|decision|open_loop`) with confidence.
5. Service resolves direct sessions into `agent`, `subject`, or isolated `session` scope.
6. Service filters durable matches by `capture.minConfidence`.
7. Service deduplicates durable records by `scopeId + kind + normalizedText`.
8. When `recent.enabled` and the resolved scope is `subject`, service also stores sanitized recent direct-history excerpts from the new turn slice.
7. Record is created as:
   - `approved` when mode is `auto` (with `review.autoApproveMain` guard for main direct)
   - otherwise `pending`

## Persistence And Markdown Materialization

On each store mutation:

- store JSON is written atomically
- approved items are materialized into:
  - `memory/continuity/facts.md`
  - `memory/continuity/preferences.md`
  - `memory/continuity/decisions.md`
  - `memory/continuity/open-loops.md`
  - `memory/continuity/subjects/<subjectId>/*.md` for subject-scoped records

Session-scoped approved records are not materialized to workspace markdown.

Managed content is bounded by:

- `<!-- OPENCLAW_CONTINUITY:BEGIN -->`
- `<!-- OPENCLAW_CONTINUITY:END -->`

Manual content outside managed blocks is preserved.

## Recall Injection Pipeline

`before_prompt_build` handler in `src/index.ts`:

1. Runs only when `plugins.slots.contextEngine === "continuity"`.
2. Normalizes prompt messages into continuity message shape.
3. Calls `service.buildSystemPromptAddition(...)`.
4. When addition exists, returns `{ prependSystemContext: addition }`.

Service recall behavior:

- optionally emits `<recent-direct-context>` with sanitized recent bound direct-history excerpts from other session keys that resolve to the same subject
- reads approved records only
- filters approved records to the current `scopeId`
- enforces `recall.scope` policy against `sessionKey`
- ranks by prompt-token overlap, kind boost, confidence, then recency
- emits up to `recall.maxItems` lines within a character budget

## Error Model

Gateway handlers normalize failures to:

- invalid inputs or unknown IDs:
  - `errorShape("INVALID_REQUEST", "...")`
- runtime/service exceptions:
  - `errorShape("UNAVAILABLE", String(error))`
