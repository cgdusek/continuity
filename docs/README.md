# Documentation Index

This directory is the source of truth for repository behavior, operations, and contributor workflow.

## Reading Order

1. `repo-map.md` - Current project layout and file responsibilities
2. `architecture.md` - Runtime lifecycle, continuity pipelines, and component responsibilities
3. `gateway-api.md` - Gateway method contracts, normalization rules, and failure behavior
4. `configuration.md` - Plugin schema plus runtime config normalization behavior
5. `development-and-ci.md` - Local commands, packaging scripts, and CI execution model

## Documentation Contract

When code changes, update docs in the same PR:

- plugin wiring in `src/index.ts` -> `architecture.md`, `gateway-api.md`, and root `README.md`
- runtime behavior in `src/continuity/*.ts` -> `architecture.md` (and `gateway-api.md` when gateway contracts change)
- `openclaw.plugin.json` or config parsing in `src/continuity/config.ts` -> `configuration.md`
- `.github/workflows/ci.yml`, `scripts/*`, or `package.json` scripts -> `development-and-ci.md`
- folder/file organization changes -> `repo-map.md`
- operator/user-visible behavior changes -> root `README.md`
