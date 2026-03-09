# Repository Map

## Top Level

- `.github/workflows/ci.yml`: CI smoke/full lanes
- `openclaw.plugin.json`: Plugin metadata, UI hints, and config schema
- `package.json`: Package metadata, scripts, runtime/dev requirements
- `README.md`: Public package overview and usage
- `AGENTS.md`: Agent/human contribution contract

## Source

- `src/index.ts`: Runtime plugin wrapper
- `src/openclaw-plugin-sdk-continuity.d.ts`: Ambient SDK typings for compilation
- `src/index.test.ts`: Unit tests for registration and gateway behavior

## Tests And Tooling

- `test/mocks/openclaw-plugin-sdk-continuity.ts`: SDK mock used by unit tests
- `vitest.config.ts`: Test config, aliasing, strict 100% coverage thresholds
- `tsconfig.json`: TypeScript build config (`dist/` output)

## Scripts

- `scripts/deploy-dev.sh`: Build + copy package into local OpenClaw extension directory
- `scripts/test-e2e.sh`: Package, unpack, and run e2e smoke harness
- `scripts/e2e-smoke.mjs`: Simulated host load + gateway/CLI behavior assertions

## Generated/Transient

- `dist/`: Build artifacts
- `coverage/`: Coverage artifacts
- `.tmp/`: Temporary files for e2e packaging checks
