# Gateway API

All methods are registered inside `src/index.ts`.

## `continuity.status`

- Optional params: `agentId` (string)
- Validation:
  - trims `agentId`
  - empty string is treated as missing
- Behavior:
  - calls `service.status(agentId?)`
  - returns service payload verbatim (for example `enabled`, `slotSelected`, counts, resolved capture/review/identity/recent settings, subject counts, and legacy direct count)

## `continuity.list`

- Optional params:
  - `agentId` (string)
  - `state`: `pending | approved | rejected | all`
  - `kind`: `fact | preference | decision | open_loop | all`
  - `sourceClass`: `main_direct | paired_direct | group | channel | all`
  - `scopeKind`: `agent | subject | session | all`
  - `subjectId`: string
  - `limit`: positive integer (number or numeric string)
- Validation:
  - trims `agentId`; empty string is treated as missing
  - unknown enum values are ignored
  - `limit` parsing:
    - numeric values are truncated (`Math.trunc`) and must be `> 0`
    - string values are parsed with base-10 `parseInt` and must be `> 0`
    - invalid or non-positive values are ignored
- Behavior:
  - calls `service.list({ agentId, filters })`
  - `filters` object is always passed with `state|kind|sourceClass|scopeKind|subjectId|limit` keys (possibly `undefined`)
  - returns service payload verbatim (`ContinuityRecord[]`)

## `continuity.patch`

- Required params:
  - `id` (non-empty string)
  - `action`: `approve | reject | remove`
- Optional params: `agentId`
- Behavior:
  - invalid/missing `id` or `action` -> `INVALID_REQUEST` (`id and action required`)
  - calls `service.patch({ agentId?, id, action })`
  - when service returns `{ ok: false }` -> `INVALID_REQUEST` (`unknown continuity id: <id>`)
  - otherwise returns service result verbatim (`{ ok: true, ... }`)

## `continuity.explain`

- Required params: `id` (non-empty string)
- Optional params: `agentId`
- Behavior:
  - missing `id` -> `INVALID_REQUEST` (`id required`)
  - calls `service.explain({ agentId?, id })`
  - null result -> `INVALID_REQUEST` (`unknown continuity id: <id>`)
- otherwise returns service result verbatim

## `continuity.subjects`

- Optional params:
  - `agentId` (string)
  - `limit` (positive integer)
- Behavior:
  - calls `service.subjects({ agentId?, limit? })`
  - returns subject summaries with review/recent counts plus known session keys

## `continuity.recent`

- Optional params:
  - `agentId` (string)
  - `subjectId` (string)
  - `sessionKey` (string; resolves a subject before listing excerpts)
  - `limit` (positive integer)
- Behavior:
  - calls `service.recent({ agentId?, subjectId?, sessionKey?, limit? })`
  - returns recent same-user direct-history excerpts sorted newest-first

## Common Failure Handling

Any thrown exception in method handlers returns:

- `ok: false`
- `error.code: UNAVAILABLE`
- `error.message: String(error)` (for example, `Error: offline`)
