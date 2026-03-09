# Continuity

External OpenClaw continuity context-engine plugin package.

This repository intentionally ships a **thin wrapper** only. Core continuity behavior lives in OpenClaw's runtime SDK module: `openclaw/plugin-sdk/continuity`.

## What This Package Provides

- Plugin registration (`id: continuity`, `kind: context-engine`)
- Context engine registration for the continuity slot
- Gateway method passthrough endpoints:
  - `continuity.status`
  - `continuity.list`
  - `continuity.patch`
  - `continuity.explain`
- Continuity CLI registration (`continuity` command namespace)

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

`deploy-dev.sh` copies the repository into `${OPENCLAW_PLUGIN_ROOT:-$HOME/.openclaw/extensions}/continuity` after building.

## Test Commands

```bash
pnpm test:unit
pnpm test:coverage
pnpm test:e2e
pnpm typecheck
```

## CI Summary

CI is defined in `.github/workflows/ci.yml`.

- Pull requests run smoke lanes:
  - build + typecheck
  - unit tests
  - package-load e2e
- Pushes to `main`, scheduled runs, and manual full dispatch run extended lanes (multi-node verify, coverage, e2e).

## Documentation System

- Agent/operator guide: [AGENTS.md](AGENTS.md)
- Full docs index: [docs/README.md](docs/README.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Gateway API: [docs/gateway-api.md](docs/gateway-api.md)
- Configuration schema: [docs/configuration.md](docs/configuration.md)
- Development + CI workflow: [docs/development-and-ci.md](docs/development-and-ci.md)
- Repository map: [docs/repo-map.md](docs/repo-map.md)
