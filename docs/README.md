# Documentation Index

This directory is the source of truth for repository behavior, operations, and contributor workflow.

## Reading Order

1. `repo-map.md` - Current project layout and file responsibilities
2. `architecture.md` - Runtime design and request lifecycle
3. `gateway-api.md` - Gateway method contracts and validation behavior
4. `configuration.md` - Plugin configuration schema and defaults
5. `development-and-ci.md` - Local workflows, test matrix, and CI lanes

## Documentation Contract

When code changes, update docs in the same PR:

- `src/index.ts` -> `architecture.md` and/or `gateway-api.md`
- `openclaw.plugin.json` -> `configuration.md`
- `scripts/*` or `package.json` scripts -> `development-and-ci.md`
- Folder/file organization changes -> `repo-map.md`
- High-level user-facing changes -> root `README.md`
