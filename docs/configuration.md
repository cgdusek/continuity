# Configuration

Configuration schema is defined in `openclaw.plugin.json` under `configSchema`.

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
