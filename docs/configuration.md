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

## `identity`

- `mode`: `off | single_user | explicit | hybrid` (default: `off`)
- `defaultDirectSubjectId`: string (default: `owner`)
- `bindings`: array of:
  - `subjectId`: string
  - `matches`: array of matcher objects with optional:
    - `channel`
    - `keyPrefix`
    - `rawKeyPrefix`
- object has `additionalProperties: false`

## `recent`

- `enabled`: boolean (default: `false`)
- `maxExcerpts`: integer `1..12` (default: `6`)
- `maxChars`: integer `200..4000` (default: `1200`)
- `ttlHours`: integer `1..168` (default: `24`)
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
- `identity.mode` accepts only `off|single_user|explicit|hybrid`
- `identity.defaultDirectSubjectId` is normalized with the same sanitizer used for agent ids
- `identity.bindings`:
  - each binding `subjectId` is normalized
  - each matcher is trimmed/lowercased
  - first matching binding wins at runtime
- `recall.maxItems`:
  - falls back when invalid/non-positive
  - truncates decimals
  - minimum `1`, maximum `12`
- `recent.maxExcerpts`, `recent.maxChars`, and `recent.ttlHours`:
  - fall back when invalid/out of range
  - truncate decimals
  - clamp to their documented max values
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
- `identity.mode`
- `identity.defaultDirectSubjectId`
- `identity.bindings`
- `recent.enabled`
- `recent.maxExcerpts`
- `recent.maxChars`
- `recent.ttlHours`
- `recall.maxItems`
- `recall.includeOpenLoops`
- `recall.scope`
