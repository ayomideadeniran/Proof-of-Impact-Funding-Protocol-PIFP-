#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/.render/bin"
RUNTIME_DIR="$ROOT_DIR/.render/runtime"

mkdir -p "$BIN_DIR" "$RUNTIME_DIR"
export PATH="$BIN_DIR:$HOME/.starkup/bin:$PATH"

if [ -z "${ORACLE_SNCAST_BIN:-}" ] && [ -x "$BIN_DIR/sncast" ]; then
  export ORACLE_SNCAST_BIN="$BIN_DIR/sncast"
fi

if [ -n "${ORACLE_SNCAST_ACCOUNTS_JSON:-}" ] && [ -z "${ORACLE_ACCOUNTS_FILE:-}" ]; then
  export ORACLE_ACCOUNTS_FILE="$RUNTIME_DIR/starknet_accounts.json"
  printf '%s' "$ORACLE_SNCAST_ACCOUNTS_JSON" > "$ORACLE_ACCOUNTS_FILE"
fi

exec "$ROOT_DIR/target/release/oracle-service"
