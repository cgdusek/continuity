# Dashboard UI

The Continuity plugin exposes a built-in dashboard at:

- `GET /plugins/continuity`
- `POST /plugins/continuity`

Route auth is `gateway`.

This dashboard is the plugin-owned operator surface for slot control, capture/recall settings, and review actions.

## Layout

The page renders seven sections:

1. Slot status
2. Agent scope
3. Summary
4. Capture and recall settings
5. Subject bindings
6. Bound subjects
7. Pending review
8. Approved

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
- `Subject Id (optional)`: narrows the pending/approved review tables to one subject
- `Refresh`: reloads the dashboard for the selected agent

All review actions in the tables below apply to the currently selected agent.

## Capture And Recall Settings

These controls write scalar `plugins.entries.continuity.config` values.

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
- `Enable recent direct context`: turns on same-user cross-channel recent-history capture and recall when identity mode resolves a subject

### Same-User Direct Settings

- `Identity mode`: `off | single_user | explicit | hybrid`
- `Default direct subject id`: fallback subject for `single_user` and unmatched directs in `hybrid`
- `Recent max excerpts`: maximum recent direct-history lines injected per prompt
- `Recent max chars`: character budget for the recent direct-history block
- `Recent TTL hours`: how long recent direct-history excerpts remain eligible

### Save Action

- `Save settings`: writes the updated plugin config to the OpenClaw config file

Behavior notes:

- Existing records are not reclassified when settings change; the new settings affect future capture and recall behavior
- The dashboard does not currently expose an editor for `recall.scope`
- The dashboard does not currently expose an editor for `identity.bindings`; those bindings are rendered read-only
- Default recall scope is deny-by-default with an allow rule for direct chats

## Summary

Shows:

- pending and approved counts
- resolved subject count
- recent-history subject count
- current identity mode
- count of legacy direct records that remain agent-scoped

## Subject Bindings

Renders the currently loaded binding rules as read-only text so operators can confirm config-file edits were applied.

## Bound Subjects

Shows one row per known subject with:

- approved / pending / rejected durable counts
- recent excerpt count
- last-seen timestamp
- known direct session keys

## Pending Review

Shows up to 50 `pending` records for the selected agent.

Columns:

- `Id`: continuity record id
- `Kind`: `fact`, `preference`, `decision`, or `open_loop`
- `Subject`: bound subject id when the record is subject-scoped
- `Scope`: `agent | subject | session`
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
- `memory/continuity/subjects/<subjectId>/facts.md`
- `memory/continuity/subjects/<subjectId>/preferences.md`
- `memory/continuity/subjects/<subjectId>/decisions.md`
- `memory/continuity/subjects/<subjectId>/open-loops.md`

## Related Runtime Surfaces

- Gateway methods: `continuity.status`, `continuity.list`, `continuity.patch`, `continuity.explain`
- Gateway methods: `continuity.subjects`, `continuity.recent`
- CLI: `continuity status`, `continuity review`, `continuity approve`, `continuity reject`, `continuity rm`, `continuity subjects`, `continuity recent`
