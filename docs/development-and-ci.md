# Development And CI

## Prerequisites

- Node.js `>=22.12.0`
- pnpm `10.23.0`

## Local Commands

Install:

```bash
pnpm install --frozen-lockfile
```

Build + typecheck:

```bash
pnpm build
pnpm typecheck
```

Tests:

```bash
pnpm test:unit
pnpm test:coverage
pnpm test:e2e
```

Clean artifacts:

```bash
pnpm clean
```

## Deployment Helper

`bash scripts/deploy-dev.sh`

- Builds the plugin
- Copies repository content to `${OPENCLAW_PLUGIN_ROOT:-$HOME/.openclaw/extensions}/continuity`
- Excludes `.git`, `coverage`, `node_modules`, and `.tmp`

## CI Workflow (`.github/workflows/ci.yml`)

### Pull Request Lanes (smoke)

- `smoke-build`: install + build + typecheck
- `smoke-unit`: install + unit tests
- `smoke-e2e`: install + build + package-load e2e

### Full Lanes (push/schedule/manual full)

- `full-verify` on Node 22 and 24: build + typecheck + unit tests
- `full-coverage` on Node 22: coverage run + artifact upload
- `full-e2e` on Node 22: package-load e2e

## Release Notes

Before tagging or publishing, verify:

1. `dist/` builds cleanly.
2. `openclaw.plugin.json` and package metadata reflect the intended release.
3. CI smoke checks pass on PR, and full checks are green on target branch.
