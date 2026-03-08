#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/.render/bin"

mkdir -p "$BIN_DIR"
export PATH="$BIN_DIR:$HOME/.starkup/bin:$PATH"

if ! command -v sncast >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.starkup.sh | sh
fi

if [ -f "$HOME/.starkup/env" ]; then
  # shellcheck disable=SC1090
  source "$HOME/.starkup/env"
fi

if ! command -v sncast >/dev/null 2>&1; then
  echo "sncast installation failed during Render build" >&2
  exit 1
fi

cp "$(command -v sncast)" "$BIN_DIR/sncast"
chmod +x "$BIN_DIR/sncast"

cargo build --release
