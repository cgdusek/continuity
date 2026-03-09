# Repository Map

## Top Level

- `.github/workflows/ci.yml`: automated full CI lanes + manual smoke/full dispatch lanes
- `openclaw.plugin.json`: plugin metadata, UI hints, and config schema
- `package.json`: package metadata, publish files, scripts, runtime/dev requirements
- `README.md`: package overview, local workflows, CI summary, and docs links
- `AGENTS.md`: agent/human contribution contract

## Source

- `src/index.ts`: runtime wrapper (registration + gateway validation/normalization)
- `src/openclaw-plugin-sdk-continuity.d.ts`: ambient SDK typings for compilation
- `src/index.test.ts`: wrapper unit tests for registration and gateway behavior

## Tests And Tooling

- `test/mocks/openclaw-plugin-sdk-continuity.ts`: SDK mock used by unit tests via Vitest alias
- `vitest.config.ts`: test config and 100% coverage thresholds
- `tsconfig.json`: TypeScript NodeNext build config (`dist/` output)

## Scripts

- `scripts/deploy-dev.sh`: build + copy package into local OpenClaw extension directory
- `scripts/test-e2e.sh`: pack tarball, unpack, and execute e2e smoke harness
- `scripts/e2e-smoke.mjs`: simulated host load + gateway/CLI assertions for packaged output

## Generated/Transient

- `dist/`: Build artifacts
- `coverage/`: Coverage artifacts
- `.tmp/`: Temporary files for e2e packaging checks
