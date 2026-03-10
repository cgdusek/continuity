#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEV_ROOT="${CONTINUITY_DEV_ROOT:-$ROOT/.tmp/run-dev}"
OPENCLAW_INSTALL_DIR="${CONTINUITY_OPENCLAW_DIR:-$DEV_ROOT/openclaw}"
OPENCLAW_STATE_DIR="${CONTINUITY_OPENCLAW_STATE_DIR:-$DEV_ROOT/state}"
OPENCLAW_CONFIG_PATH="${CONTINUITY_OPENCLAW_CONFIG_PATH:-$OPENCLAW_STATE_DIR/openclaw.json}"
OPENCLAW_WORKSPACE_DIR="${CONTINUITY_OPENCLAW_WORKSPACE_DIR:-$DEV_ROOT/workspace}"
GATEWAY_HOST="${CONTINUITY_GATEWAY_HOST:-127.0.0.1}"
GATEWAY_PORT="${CONTINUITY_GATEWAY_PORT:-19001}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

require_loopback_host() {
  case "$1" in
    127.0.0.1 | localhost | ::1 | "[::1]")
      ;;
    *)
      echo "CONTINUITY_GATEWAY_HOST must be a loopback host because the gateway binds loopback only: $1" >&2
      exit 1
      ;;
  esac
}

format_http_host() {
  case "$1" in
    ::1 | "[::1]")
      printf '[::1]'
      ;;
    *)
      printf '%s' "$1"
      ;;
  esac
}

validate_port() {
  case "$1" in
    '' | *[!0-9]*)
      echo "CONTINUITY_GATEWAY_PORT must be a numeric TCP port: $1" >&2
      exit 1
      ;;
  esac
  if (( $1 < 1 || $1 > 65535 )); then
    echo "CONTINUITY_GATEWAY_PORT must be between 1 and 65535: $1" >&2
    exit 1
  fi
}

read_installed_openclaw_version() {
  local package_json
  package_json="$OPENCLAW_INSTALL_DIR/node_modules/openclaw/package.json"
  if [[ ! -f "$package_json" ]]; then
    return 0
  fi
  node -e 'const fs=require("node:fs"); const pkg=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(pkg.version || "");' "$package_json"
}

write_local_package_json() {
  if [[ -f "$OPENCLAW_INSTALL_DIR/package.json" ]]; then
    return 0
  fi
  mkdir -p "$OPENCLAW_INSTALL_DIR"
  cat >"$OPENCLAW_INSTALL_DIR/package.json" <<'EOF'
{
  "name": "continuity-openclaw-dev",
  "private": true
}
EOF
}

require_cmd node
require_cmd npm
require_cmd pnpm

require_loopback_host "$GATEWAY_HOST"
validate_port "$GATEWAY_PORT"

mkdir -p "$DEV_ROOT" "$OPENCLAW_STATE_DIR" "$OPENCLAW_WORKSPACE_DIR"
mkdir -p "$(dirname "$OPENCLAW_CONFIG_PATH")"

LATEST_OPENCLAW_VERSION="$(npm view openclaw version --json 2>/dev/null | tr -d '"[:space:]')"
INSTALLED_OPENCLAW_VERSION="$(read_installed_openclaw_version)"

if [[ -z "$LATEST_OPENCLAW_VERSION" ]]; then
  if [[ -z "$INSTALLED_OPENCLAW_VERSION" ]]; then
    echo "failed to resolve openclaw@latest and no local install exists under $OPENCLAW_INSTALL_DIR" >&2
    exit 1
  fi
  TARGET_OPENCLAW_VERSION="$INSTALLED_OPENCLAW_VERSION"
  echo "warning: failed to resolve openclaw@latest; reusing local openclaw@$TARGET_OPENCLAW_VERSION" >&2
else
  TARGET_OPENCLAW_VERSION="$LATEST_OPENCLAW_VERSION"
fi

write_local_package_json

if [[ "$INSTALLED_OPENCLAW_VERSION" != "$TARGET_OPENCLAW_VERSION" ]]; then
  echo "installing openclaw@$TARGET_OPENCLAW_VERSION into $OPENCLAW_INSTALL_DIR"
  pnpm --dir "$OPENCLAW_INSTALL_DIR" add --save-exact "openclaw@$TARGET_OPENCLAW_VERSION"
else
  echo "using local openclaw@$TARGET_OPENCLAW_VERSION from $OPENCLAW_INSTALL_DIR"
fi

OPENCLAW_BIN="$OPENCLAW_INSTALL_DIR/node_modules/.bin/openclaw"
if [[ ! -x "$OPENCLAW_BIN" ]]; then
  echo "openclaw CLI missing after install: $OPENCLAW_BIN" >&2
  exit 1
fi

echo "building continuity"
(
  cd "$ROOT"
  pnpm build
)

export OPENCLAW_STATE_DIR
export OPENCLAW_CONFIG_PATH

echo "linking continuity into local OpenClaw"
"$OPENCLAW_BIN" plugins install --link "$ROOT"
"$OPENCLAW_BIN" plugins enable continuity
"$OPENCLAW_BIN" config set agents.defaults.workspace "$OPENCLAW_WORKSPACE_DIR"
"$OPENCLAW_BIN" config set plugins.slots.contextEngine continuity

URL_HOST="$(format_http_host "$GATEWAY_HOST")"
GATEWAY_UI_URL="http://${URL_HOST}:${GATEWAY_PORT}/"
GATEWAY_WS_URL="ws://${URL_HOST}:${GATEWAY_PORT}"
PLUGIN_UI_URL="${GATEWAY_UI_URL}plugins/continuity"

cat <<EOF

OpenClaw local dev
  version: openclaw@$TARGET_OPENCLAW_VERSION
  config: $OPENCLAW_CONFIG_PATH
  state: $OPENCLAW_STATE_DIR
  workspace: $OPENCLAW_WORKSPACE_DIR
  gateway ws: $GATEWAY_WS_URL
  gateway ui: $GATEWAY_UI_URL
  continuity ui: $PLUGIN_UI_URL

EOF

exec "$OPENCLAW_BIN" gateway \
  --dev \
  --allow-unconfigured \
  --auth none \
  --bind loopback \
  --force \
  --port "$GATEWAY_PORT" \
  run
