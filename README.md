# Continuity

Standalone Continuity plugin package for OpenClaw.

This repo intentionally contains the external plugin wrapper only. The runtime continuity implementation is provided by OpenClaw through `openclaw/plugin-sdk/continuity`.

## Install

1. Build the package: `pnpm build`
2. Deploy it into a local OpenClaw extension directory: `bash scripts/deploy-dev.sh`
3. Enable the slot: `openclaw config set plugins.slots.contextEngine continuity`

## Requirements

- OpenClaw `2026.3.3` or newer
- A build that exports `openclaw/plugin-sdk/continuity`
