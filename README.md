# Continuity

External OpenClaw continuity context-engine plugin package.

This repository intentionally ships a **thin wrapper** around OpenClaw's continuity SDK module: `openclaw/plugin-sdk/continuity`.

Core continuity behavior (capture, review workflows, recall, persistence) lives in the host SDK. This package owns plugin registration and gateway boundary handling.

## What This Package Provides

- Plugin registration (`id: continuity`, `kind: context-engine`) from `dist/index.js`
- Context engine registration for the `continuity` slot
- Gateway methods:
  - `continuity.status`
  - `continuity.list`
  - `continuity.patch`
  - `continuity.explain`
- Continuity CLI registration (`continuity` command namespace)
- Plugin manifest/config schema in `openclaw.plugin.json`

The wrapper does lightweight input normalization/validation before calling the SDK service:

- trim optional string params (for example, `agentId`)
- parse positive integer `limit`
- enforce supported enum values for list filters and patch actions

## Requirements

- Node.js `>=22.12.0`
- pnpm `10.23.0` (or compatible pnpm 10.x)
- OpenClaw version that exports `openclaw/plugin-sdk/continuity` (peer dependency: `>=2026.3.2`)

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

`deploy-dev.sh` builds the package and copies the repository into `${OPENCLAW_PLUGIN_ROOT:-$HOME/.openclaw/extensions}/continuity` (excluding `.git`, `coverage`, `node_modules`, and `.tmp`).

## Validation Commands

```bash
pnpm build
pnpm typecheck
pnpm test:unit
pnpm test:e2e
```

## CI Summary

CI is defined in `.github/workflows/ci.yml`.

- Automatic full lanes run on:
  - pull requests targeting `dev`
  - pushes to `main`
  - weekly schedule (`0 9 * * 1`, Monday 09:00 UTC)
- Manual `workflow_dispatch` supports `level: smoke | full | both` (default: `full`)
- Smoke lanes run only for manual dispatch with `level=smoke` or `level=both`:
  - build + typecheck
  - unit tests
  - package-load e2e
- Full lanes run automatically on PR/push/schedule and manually with `level=full` or `level=both`:
  - verify matrix (Node 22, 24)
  - coverage (Node 22, artifact upload)
  - package-load e2e (Node 22)

## Documentation System

- Agent/operator guide: [AGENTS.md](AGENTS.md)
- Full docs index: [docs/README.md](docs/README.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Gateway API: [docs/gateway-api.md](docs/gateway-api.md)
- Configuration schema: [docs/configuration.md](docs/configuration.md)
- Development + CI workflow: [docs/development-and-ci.md](docs/development-and-ci.md)
- Repository map: [docs/repo-map.md](docs/repo-map.md)
