# Continuity

External OpenClaw continuity context-engine plugin package.

This repository contains the plugin implementation for continuity capture, review, persistence, recall, and operator controls.

## What This Package Registers

- Plugin metadata (`id: continuity`, `kind: context-engine`) from `dist/index.js`
- Context engine factory for slot `continuity`
- Gateway methods:
  - `continuity.status`
  - `continuity.list`
  - `continuity.patch`
  - `continuity.explain`
- CLI namespace `continuity` with commands:
  - `status`
  - `review`
  - `approve <id>`
  - `reject <id>`
  - `rm <id>`
- HTTP dashboard route: `GET/POST /plugins/continuity`
- Prompt hook: `before_prompt_build` (adds `<continuity>...</continuity>` context when slot is active)
- Plugin manifest + config schema: `openclaw.plugin.json`

## Runtime Behavior (High Level)

- Extracts durable continuity candidates from user/assistant turn text.
- Persists per-agent continuity store at:
  - `<stateDir>/agents/<agentId>/continuity/store.json`
- Keeps approved items materialized into workspace markdown files:
  - `memory/continuity/facts.md`
  - `memory/continuity/preferences.md`
  - `memory/continuity/decisions.md`
  - `memory/continuity/open-loops.md`
- Supports pending/approved/rejected review states and patch actions (`approve`, `reject`, `remove`).
- Builds recall snippets from approved items and prepends them during prompt build when scope rules allow.

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
- Repository map: [docs/repo-map.md](docs/repo-map.md)
