# AGENTS.md

This file is the operational guide for humans and coding agents working in this repository.

## Mission

Maintain the Continuity OpenClaw plugin implementation in this repository, including capture/review/recall behavior, plugin interfaces, and packaging guarantees.

## Ground Rules

- Keep runtime behavior aligned across plugin entrypoint, continuity service modules, tests, and docs.
- Preserve explicit input validation at gateway and route boundaries.
- Preserve packaging guarantees: built output in `dist/`, plugin metadata in `openclaw.plugin.json`.
- Do not add runtime dependencies unless required.

## Start Here

1. Read [docs/README.md](docs/README.md) for the docs index.
2. Inspect [src/index.ts](src/index.ts) to understand runtime behavior.
3. Run the validation commands from `docs/development-and-ci.md` before opening a PR.

## Repository Map

- Plugin entrypoint and registration wiring: `src/index.ts`
- Core continuity implementation: `src/continuity/*.ts`
- Unit tests: `src/index.test.ts`, `src/continuity/*.test.ts`
- Plugin manifest + config schema: `openclaw.plugin.json`
- Build/test toolchain: `package.json`, `tsconfig.json`, `vitest.config.ts`
- CI workflow: `.github/workflows/ci.yml`
- Utility scripts: `scripts/deploy-dev.sh`, `scripts/test-e2e.sh`, `scripts/e2e-smoke.mjs`

## Definition Of Done

1. Code, tests, and docs reflect the same behavior.
2. `pnpm build`, `pnpm typecheck`, `pnpm test:unit`, and `pnpm test:e2e` pass locally.
3. PR targets `dev` and all PR CI checks are green.

## Commit And PR Standards

- Use scoped, descriptive commit messages.
- Keep changes focused; avoid unrelated refactors.
- Document any behavior change in `README.md` and relevant files under `docs/`.
