# Dashboard UI

The Continuity plugin exposes a built-in dashboard at:

- `GET /plugins/continuity`
- `POST /plugins/continuity`

Route auth is `gateway`.

This dashboard is the plugin-owned operator surface for slot control, capture/recall settings, and review actions.

## Layout

The page renders five sections:

1. Slot status
2. Agent scope
3. Capture and recall settings
4. Pending review
5. Approved

## Slot Status

Displays whether OpenClaw currently has `plugins.slots.contextEngine === "continuity"`.

Controls:

- `Activate slot`: sets `plugins.slots.contextEngine` to `continuity`
- `Deactivate slot`: removes the slot when Continuity currently owns it

Behavior note:

- Continuity recall injection during `before_prompt_build` runs only when the Continuity slot is active.

## Agent Scope

Controls which agent store the dashboard reads and mutates.

- `Agent Id (optional)`: when blank, the plugin falls back to the default agent from OpenClaw config
- `Refresh`: reloads the dashboard for the selected agent

All review actions in the tables below apply to the currently selected agent.

## Capture And Recall Settings

These controls write `plugins.entries.continuity.config`.

### Capture Modes

Four source-class selectors control how new continuity candidates are handled:

- `Main direct capture`
- `Paired direct capture`
- `Group capture`
- `Channel capture`

Mode meanings:

- `off`: discard captures from that source class
- `review`: store captures as `pending`
- `auto`: store captures as `approved`, except main direct still depends on `Auto-approve main direct`

Source-class meanings:

- `Main direct`: the canonical main direct session (`main` or equivalent direct-main key)
- `Paired direct`: other direct-message sessions
- `Group`: group-chat sessions
- `Channel`: channel, broadcast, cron, internal, unknown non-direct, and subagent-like sessions

### Numeric Settings

- `Min confidence`: minimum extractor score (`0..1`) required before a candidate is stored
- `Max recall items`: maximum approved items considered for prompt injection (`1..12`)

### Boolean Settings

- `Auto-approve main direct`: when enabled, `Main direct capture = auto` produces immediately approved items; when disabled, main-direct auto captures remain pending
- `Require source`: preserved in config and shown by status APIs; current runtime records already include source excerpts, so this flag does not add extra approval gating today
- `Include open loops`: allows approved `open_loop` records to participate in automatic recall injection

### Save Action

- `Save settings`: writes the updated plugin config to the OpenClaw config file

Behavior notes:

- Existing records are not reclassified when settings change; the new settings affect future capture and recall behavior
- The dashboard does not currently expose an editor for `recall.scope`
- Default recall scope is deny-by-default with an allow rule for direct chats

## Pending Review

Shows up to 50 `pending` records for the selected agent.

Columns:

- `Id`: continuity record id
- `Kind`: `fact`, `preference`, `decision`, or `open_loop`
- `Text`: normalized continuity statement
- `Source`: `sessionKey`, falling back to `sessionId` when needed

Actions:

- `Approve`: converts the record to `approved` and materializes it into the corresponding markdown file
- `Reject`: converts the record to `rejected`
- `Remove`: deletes the record from the continuity store

## Approved

Shows up to 50 `approved` records for the selected agent.

Columns match the pending table.

Actions:

- `Remove`: deletes the record and updates the materialized markdown output

## Materialized Files

Approved items are written into workspace memory files:

- `memory/continuity/facts.md`
- `memory/continuity/preferences.md`
- `memory/continuity/decisions.md`
- `memory/continuity/open-loops.md`

## Related Runtime Surfaces

- Gateway methods: `continuity.status`, `continuity.list`, `continuity.patch`, `continuity.explain`
- CLI: `continuity status`, `continuity review`, `continuity approve`, `continuity reject`, `continuity rm`
