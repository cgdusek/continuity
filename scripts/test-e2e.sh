#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rm -rf .tmp/e2e
mkdir -p .tmp/e2e/unpacked
pnpm pack --pack-destination .tmp/e2e >/dev/null
TARBALL="$(find .tmp/e2e -maxdepth 1 -name '*.tgz' | head -n 1)"
if [[ -z "${TARBALL}" ]]; then
  echo "missing tarball" >&2
  exit 1
fi

tar -xzf "$TARBALL" -C .tmp/e2e/unpacked
PACKAGE_DIR="$(find .tmp/e2e/unpacked -maxdepth 1 -type d -name 'package' | head -n 1)"
if [[ -z "${PACKAGE_DIR}" ]]; then
  echo "missing extracted package dir" >&2
  exit 1
fi
node scripts/e2e-smoke.mjs "$PACKAGE_DIR"
