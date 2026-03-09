# Continuity

Standalone Continuity context-engine plugin for OpenClaw.

This package now owns its continuity runtime implementation. It no longer imports
`openclaw/plugin-sdk/continuity`; it only depends on the root `openclaw/plugin-sdk` API surface.

## Behavior

- Slot-gated runtime activation via `plugins.slots.contextEngine = "continuity"`
- Always-available management surfaces:
  - Gateway RPC: `continuity.status`, `continuity.list`, `continuity.patch`, `continuity.explain`
  - CLI: `openclaw continuity status|review|approve|reject|rm`
  - Plugin-owned dashboard route: `GET/POST /plugins/continuity` (gateway auth)

## Install

1. Build the package: `pnpm build`
2. Deploy it into a local OpenClaw extension directory: `bash scripts/deploy-dev.sh`
3. Enable the slot: `openclaw config set plugins.slots.contextEngine continuity`

## Requirements

- OpenClaw `2026.3.8` or newer
