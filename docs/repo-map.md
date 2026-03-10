# Repository Map

## Top Level

- `.github/workflows/ci.yml`: automated full CI lanes + manual smoke/full dispatch lanes
- `openclaw.plugin.json`: plugin metadata, UI hints, and config schema
- `package.json`: package metadata, publish files, scripts, runtime/dev requirements
- `README.md`: package overview, local workflows, CI summary, and docs links
- `AGENTS.md`: agent/human contribution contract

## Documentation

- `docs/README.md`: docs index and update contract
- `docs/architecture.md`: runtime lifecycle, capture/review/recall pipeline, and route registration
- `docs/configuration.md`: plugin config schema, defaults, and normalization rules
- `docs/dashboard-ui.md`: Continuity dashboard route, control meanings, and review actions
- `docs/development-and-ci.md`: local commands, helper scripts, and CI workflow
- `docs/gateway-api.md`: gateway method contracts and error behavior

## Source Entrypoints

- `src/index.ts`: plugin registration, gateway handlers, CLI + route registration, prompt hook
- `src/openclaw-plugin-sdk.d.ts`: ambient OpenClaw SDK typings used for compilation
- `src/index.test.ts`: plugin entrypoint integration-style unit coverage

## Continuity Modules (`src/continuity`)

- `assistant-visible-text.ts`: strips assistant internal tag/scaffolding blocks
- `chat-content.ts`: extracts text from OpenClaw chat content payloads
- `cli.ts`: `continuity` CLI command registration
- `config.ts`: continuity config defaults + normalization
- `engine.ts`: context-engine adapter (`afterTurn` capture + compact delegation)
- `errors.ts`: shared gateway error code helpers
- `extractor.ts`: heuristic continuity extraction + prompt-injection filtering
- `index.ts`: continuity module exports
- `json-files.ts`: atomic JSON/text write helpers + async lock
- `route.ts`: `/plugins/continuity` dashboard GET/POST handler
- `scope.ts`: source class and recall scope policy checks
- `service.ts`: continuity store, review, materialization, and recall assembly
- `session-key.ts`: agent/session parsing + workspace resolution
- `types.ts`: continuity type surface

## Tests And Tooling

- `src/continuity/*.test.ts`: unit coverage for continuity modules
- `vitest.config.ts`: test config and 100% coverage thresholds
- `tsconfig.json`: TypeScript NodeNext build config (`dist/` output)

## Scripts

- `scripts/deploy-dev.sh`: build + copy package into local OpenClaw extension directory
- `scripts/run-dev.sh`: build Continuity, link it into a local `openclaw@latest` install, and run a loopback dev gateway with printed UI links
- `scripts/test-e2e.sh`: pack tarball, unpack, and execute packaged integration smoke harness
- `scripts/e2e-smoke.mjs`: simulated host load that validates packaging, registration, CLI, gateway, route review/config actions, materialization, and recall for packaged output

## Generated/Transient

- `dist/`: Build artifacts
- `coverage/`: Coverage artifacts
- `.tmp/`: Temporary files for e2e packaging checks
