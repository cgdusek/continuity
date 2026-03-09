# Configuration

Configuration schema is declared in `openclaw.plugin.json` under `configSchema`.
Runtime normalization is implemented in `src/continuity/config.ts` (`resolveContinuityConfig`).

Plugin config is read from `plugins.entries.continuity.config`.

Top-level schema is an object with `additionalProperties: false`.

## `capture`

- `mainDirect`: `off | review | auto` (default: `auto`)
- `pairedDirect`: `off | review | auto` (default: `review`)
- `group`: `off | review | auto` (default: `off`)
- `channel`: `off | review | auto` (default: `off`)
- `minConfidence`: number `0..1` (default: `0.75`)
- object has `additionalProperties: false`

## `review`

- `autoApproveMain`: boolean (default: `true`)
- `requireSource`: boolean (default: `true`)
- object has `additionalProperties: false`

## `recall`

- `maxItems`: integer `1..12` (default: `4`)
- `includeOpenLoops`: boolean (default: `true`)
- `scope`: object (`additionalProperties: true`)
- object has `additionalProperties: false`

## Runtime Normalization Rules

`resolveContinuityConfig(raw)` applies these behaviors:

- invalid or missing sections fall back to defaults
- capture modes accept only `off|review|auto`
- `capture.minConfidence`:
  - accepts `0`
  - falls back when invalid/negative
  - clamps to `<= 1`
- `recall.maxItems`:
  - falls back when invalid/non-positive
  - truncates decimals
  - minimum `1`, maximum `12`
- `recall.scope`:
  - deep-cloned from input
  - default policy when missing:
    - `default: "deny"`
    - `rules: [{ action: "allow", match: { chatType: "direct" } }]`
  - invalid/missing `scope.default` falls back to `"deny"`

## Notes On `review.requireSource`

- This flag is preserved in config and returned by `continuity.status`.
- Current runtime capture records already include `source.excerpt`, so this flag does not add extra gating logic in `service.patch` today.

## UI Hints

`openclaw.plugin.json` declares `uiHints` labels/help text for host UI controls:

- `capture.mainDirect`
- `capture.pairedDirect`
- `capture.group`
- `capture.channel`
- `capture.minConfidence`
- `review.autoApproveMain`
- `review.requireSource`
- `recall.maxItems`
- `recall.includeOpenLoops`
- `recall.scope`
