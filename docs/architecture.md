# Architecture

## Purpose

The plugin is an external wrapper that delegates continuity behavior to OpenClaw's SDK module (`openclaw/plugin-sdk/continuity`).

## Runtime Lifecycle

1. OpenClaw loads plugin entrypoint from `dist/index.js`.
2. `register(api)` resolves plugin config via `resolveContinuityConfig(api.pluginConfig)`.
3. Wrapper lazily instantiates one `ContinuityService` using `createContinuityService(api.config, pluginConfig)`.
4. Wrapper registers:
   - context engine `continuity`
   - gateway methods (`status`, `list`, `patch`, `explain`)
   - CLI registrar (`continuity` command namespace)
5. Context engine factory constructs `new ContinuityContextEngine(ensureService())`.

The wrapper does not register HTTP routes and does not implement continuity extraction/recall logic itself.

## Design Constraints

- Service initialization is lazy and singleton per plugin registration call.
- Wrapper performs boundary validation and normalization only:
  - trims string params
  - parses positive integer `limit`
  - enforces enum filters/actions
- Business logic remains in the upstream SDK service.

## Error Model

- Invalid or missing request parameters -> `errorShape(ErrorCodes.INVALID_REQUEST, ...)`
- Runtime/service failures -> `errorShape(ErrorCodes.UNAVAILABLE, String(err))`
- Unknown continuity IDs for `patch`/`explain` -> invalid request error with explicit ID context
