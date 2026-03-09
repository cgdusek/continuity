# Documentation Index

This directory is the source of truth for repository behavior, operations, and contributor workflow.

## Reading Order

1. `repo-map.md` - Current project layout and file responsibilities
2. `architecture.md` - Runtime design and registration lifecycle
3. `gateway-api.md` - Gateway contracts, normalization rules, and failure behavior
4. `configuration.md` - Plugin schema, defaults, and UI hint keys
5. `development-and-ci.md` - Local commands, deploy/e2e scripts, and CI trigger model

## Documentation Contract

When code changes, update docs in the same PR:

- `src/index.ts` or `src/index.test.ts` -> `architecture.md` and/or `gateway-api.md`
- `openclaw.plugin.json` -> `configuration.md`
- `.github/workflows/ci.yml`, `scripts/*`, or `package.json` scripts -> `development-and-ci.md`
- folder/file organization changes -> `repo-map.md`
- high-level user-facing behavior changes -> root `README.md`
