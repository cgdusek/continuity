# Configuration

Configuration schema is defined in `openclaw.plugin.json` under `configSchema`.

## `capture`

- `mainDirect`: `off | review | auto` (default: `auto`)
- `pairedDirect`: `off | review | auto` (default: `review`)
- `group`: `off | review | auto` (default: `off`)
- `channel`: `off | review | auto` (default: `off`)
- `minConfidence`: number `0..1` (default: `0.75`)

## `review`

- `autoApproveMain`: boolean (default: `true`)
- `requireSource`: boolean (default: `true`)

## `recall`

- `maxItems`: integer `1..12` (default: `4`)
- `includeOpenLoops`: boolean (default: `true`)
- `scope`: object (additional properties allowed)

## UI Hints

`openclaw.plugin.json` also declares `uiHints` labels/help text for capture, review, and recall settings so host UIs can render consistent controls.
