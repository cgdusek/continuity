#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_ROOT="${OPENCLAW_PLUGIN_ROOT:-${HOME}/.openclaw/extensions}"
TARGET_DIR="${TARGET_ROOT}/continuity"

cd "$ROOT"
pnpm build
mkdir -p "$TARGET_ROOT"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
rsync -a --delete \
  --exclude .git \
  --exclude coverage \
  --exclude node_modules \
  --exclude .tmp \
  "$ROOT/" "$TARGET_DIR/"

echo "deployed $TARGET_DIR"
