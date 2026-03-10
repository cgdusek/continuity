# Continuity

External OpenClaw continuity context-engine plugin package.

This repository contains the plugin implementation for continuity capture, review, persistence, recall, and operator controls.

## Plugin Functionality

- Capture durable continuity candidates from user/assistant turns and classify them as `fact`, `preference`, `decision`, or `open_loop`.
- Resolve direct sessions to agent, subject, or isolated session scope using opt-in same-user binding rules.
- Capture a small rolling recent direct-history window for bound same-user sessions when `recent.enabled` is on.
- Route captured items into `approved` or `pending` review state based on source-class capture mode and review settings.
- Persist a per-agent continuity store under `<stateDir>/agents/<agentId>/continuity/store.json`.
- Materialize approved continuity items into workspace markdown files under `memory/continuity/` and `memory/continuity/subjects/<subjectId>/`.
- Rank and inject approved continuity items into prompt build as untrusted historical context when the Continuity slot is active and recall scope allows it.
- Inject recent cross-channel direct excerpts as inert `<recent-direct-context>` when the current direct session resolves to a bound same-user subject.
- Expose operator controls through gateway methods, a `continuity` CLI namespace, and the plugin dashboard at `/plugins/continuity`.

## Dashboard UI

The plugin ships a built-in dashboard route:

- `GET/POST /plugins/continuity`

The dashboard provides:

- Continuity slot activation/deactivation
- Agent-scoped record browsing
- Capture and recall configuration controls
- Pending review actions (`approve`, `reject`, `remove`)
- Approved-item management (`remove`)

Dashboard control details are documented in [docs/dashboard-ui.md](docs/dashboard-ui.md).

## What This Package Registers

- Plugin metadata (`id: continuity`, `kind: context-engine`) from `dist/index.js`
- Context engine factory for slot `continuity`
- Gateway methods:
  - `continuity.status`
  - `continuity.list`
- `continuity.patch`
- `continuity.explain`
- `continuity.subjects`
- `continuity.recent`
- CLI namespace `continuity` with commands:
  - `status`
  - `review`
  - `approve <id>`
  - `reject <id>`
  - `rm <id>`
  - `subjects`
  - `recent`
- HTTP dashboard route: `GET/POST /plugins/continuity`
- Prompt hook: `before_prompt_build` (adds `<recent-direct-context>...</recent-direct-context>` and `<continuity>...</continuity>` context when slot is active)
- Plugin manifest + config schema: `openclaw.plugin.json`

## Runtime Behavior (High Level)

- Extracts durable continuity candidates from user/assistant turn text.
- Resolves direct sessions into `agent`, `subject`, or `session` scope depending on `identity.mode` and configured bindings.
- Stores recent bound direct-history excerpts in:
  - `<stateDir>/agents/<agentId>/continuity/recent.json`
- Persists per-agent continuity store at:
  - `<stateDir>/agents/<agentId>/continuity/store.json`
- Keeps approved items materialized into workspace markdown files:
  - `memory/continuity/facts.md`
  - `memory/continuity/preferences.md`
  - `memory/continuity/decisions.md`
  - `memory/continuity/open-loops.md`
- Keeps approved subject-scoped items materialized into:
  - `memory/continuity/subjects/<subjectId>/facts.md`
  - `memory/continuity/subjects/<subjectId>/preferences.md`
  - `memory/continuity/subjects/<subjectId>/decisions.md`
  - `memory/continuity/subjects/<subjectId>/open-loops.md`
- Supports pending/approved/rejected review states and patch actions (`approve`, `reject`, `remove`).
- Builds recent direct-history and durable continuity snippets from the current scope and prepends them during prompt build when scope rules allow.

## Requirements

- Node.js `>=22.12.0`
- pnpm `10.23.0` (or compatible pnpm 10.x)
- OpenClaw peer dependency: `>=2026.3.8` (optional peer, required at runtime by host)

## Install And Build

```bash
pnpm install --frozen-lockfile
pnpm build
```

## Local Deploy To OpenClaw

```bash
bash scripts/deploy-dev.sh
openclaw config set plugins.slots.contextEngine continuity
```

`deploy-dev.sh` builds and copies the repository into `${OPENCLAW_PLUGIN_ROOT:-$HOME/.openclaw/extensions}/continuity` (excluding `.git`, `coverage`, `node_modules`, and `.tmp`).

## Local Dev Gateway

```bash
bash scripts/run-dev.sh
```

`run-dev.sh` resolves `openclaw@latest` from npm at runtime, installs or updates a local copy under `.tmp/run-dev/openclaw`, builds this plugin, links the repository into that local OpenClaw instance, and starts a loopback-only gateway with no auth on port `19001`.

The script prints the local endpoints before startup:

- Gateway WS: `ws://127.0.0.1:19001`
- Gateway UI: `http://127.0.0.1:19001/`
- Continuity UI: `http://127.0.0.1:19001/plugins/continuity`

The launcher keeps its config, state, and workspace under `.tmp/run-dev/` so it does not reuse the default `~/.openclaw` directories.

Override points are exposed via environment variables:

- `CONTINUITY_DEV_ROOT`
- `CONTINUITY_OPENCLAW_DIR`
- `CONTINUITY_OPENCLAW_STATE_DIR`
- `CONTINUITY_OPENCLAW_CONFIG_PATH`
- `CONTINUITY_OPENCLAW_WORKSPACE_DIR`
- `CONTINUITY_GATEWAY_PORT`
- `CONTINUITY_GATEWAY_HOST` (`127.0.0.1`, `localhost`, or `::1` only)

## Validation Commands

```bash
pnpm build
pnpm typecheck
pnpm test:unit
pnpm test:e2e
```

Optional full local test lane:

```bash
pnpm test:coverage
```

`test:coverage` enforces 100% coverage across the runtime source tree under `src/`, excluding tests, declaration files, the type-only continuity schema types, and the continuity barrel file.

## CI Summary

CI is defined in `.github/workflows/ci.yml`.

- Automatic full lanes run on:
  - pull requests targeting `dev`
  - pushes to `main`
  - weekly schedule (`0 9 * * 1`, Monday 09:00 UTC)
- Manual `workflow_dispatch` input:
  - `level: smoke | full | both` (default: `full`)
- Smoke lanes (manual only for `smoke|both`):
  - build + typecheck (Node 22)
  - unit tests (Node 22)
  - packaged integration smoke (Node 22)
- Full lanes (automatic + manual `full|both`):
  - verify matrix (Node 22 and 24)
  - full-source 100% coverage gate + artifact upload (Node 22)
  - packaged integration smoke (Node 22)
- Workflow defaults:
  - pinned runner image (`ubuntu-24.04`)
  - centralized Node/pnpm versions
  - pnpm cache keyed by `pnpm-lock.yaml`

## Documentation

- Contributor contract: [AGENTS.md](AGENTS.md)
- Docs index: [docs/README.md](docs/README.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Gateway API: [docs/gateway-api.md](docs/gateway-api.md)
- Configuration: [docs/configuration.md](docs/configuration.md)
- Development and CI: [docs/development-and-ci.md](docs/development-and-ci.md)
- Dashboard UI: [docs/dashboard-ui.md](docs/dashboard-ui.md)
- Repository map: [docs/repo-map.md](docs/repo-map.md)
