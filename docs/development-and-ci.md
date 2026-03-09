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

Notes:

- `test:unit` runs `vitest run` for `src/**/*.test.ts`.
- `test:coverage` uses V8 coverage and enforces 100% thresholds for all runtime source files under `src/`, excluding tests, declaration files, the type-only continuity schema types, and the continuity barrel file (per `vitest.config.ts`).

Clean artifacts:

```bash
pnpm clean
```

## Deployment Helper

`bash scripts/deploy-dev.sh`

- Builds the plugin
- Copies repository content to `${OPENCLAW_PLUGIN_ROOT:-$HOME/.openclaw/extensions}/continuity`
- Excludes `.git`, `coverage`, `node_modules`, and `.tmp`

## E2E Packaging Harness

`bash scripts/test-e2e.sh`

- Packs the npm tarball into `.tmp/e2e/`
- Extracts it under `.tmp/e2e/unpacked/package`
- Runs `node scripts/e2e-smoke.mjs <package-dir>`
- Asserts tarball packaging guarantees (`dist/`, `openclaw.plugin.json`)
- Asserts package load, registration, CLI wiring, gateway methods, route POST actions, review flow, markdown materialization, and recall behavior against a simulated host

## CI Workflow (`.github/workflows/ci.yml`)

### Automatic Triggers

- `pull_request` targeting `dev`
- `push` to `main`
- weekly schedule (`0 9 * * 1`, Monday 09:00 UTC)

### Manual Trigger

`workflow_dispatch` input (required):

- `level: smoke | full | both` (default: `full`)

### Smoke Lanes (manual only: `level=smoke|both`)

- `smoke-build`: install + build + typecheck (Node 22)
- `smoke-unit`: install + unit tests (Node 22)
- `smoke-e2e`: install + build + packaged integration smoke (Node 22)

### Full Lanes (automatic + manual `level=full|both`)

- `full-verify` on Node 22 and 24: build + typecheck + unit tests
- `full-coverage` on Node 22: full-source 100% coverage gate + artifact upload
- `full-e2e` on Node 22: packaged integration smoke

### CI Execution Controls

- Runner image is pinned to `ubuntu-24.04`
- Node/pnpm versions are centralized in workflow `env`
- pnpm cache uses `pnpm-lock.yaml` as the dependency cache key
- Concurrency key: `ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}`
- In-progress runs are canceled on the same PR/ref, except scheduled runs

## Release Notes

Before tagging or publishing, verify:

1. `dist/` builds cleanly.
2. `openclaw.plugin.json` and package metadata reflect the intended release.
3. Full CI checks pass on PR/push targets (and optional smoke/manual lanes are green when used).
