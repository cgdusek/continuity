# Gateway API

All methods are registered inside `src/index.ts`.

## `continuity.status`

- Optional params: `agentId` (string)
- Behavior: returns `service.status(agentId?)`
- Validation: trims `agentId`; empty string is ignored

## `continuity.list`

- Optional params:
  - `agentId` (string)
  - `state`: `pending | approved | rejected | all`
  - `kind`: `fact | preference | decision | open_loop | all`
  - `sourceClass`: `main_direct | paired_direct | group | channel | all`
  - `limit`: positive integer (number or numeric string)
- Behavior: builds `filters` object with only valid values and calls `service.list(...)`

## `continuity.patch`

- Required params:
  - `id` (non-empty string)
  - `action`: `approve | reject | remove`
- Optional params: `agentId`
- Behavior:
  - invalid/missing `id` or `action` -> invalid request error
  - when service returns `{ ok: false }` -> invalid request error (`unknown continuity id`)
  - otherwise returns service result

## `continuity.explain`

- Required params: `id` (non-empty string)
- Optional params: `agentId`
- Behavior:
  - missing `id` -> invalid request error
  - null/empty service result -> invalid request error (`unknown continuity id`)
  - otherwise returns service result

## Common Failure Handling

Any thrown exception in method handlers returns:

- `ok: false`
- `error.code: UNAVAILABLE`
- `error.message: String(error)`
