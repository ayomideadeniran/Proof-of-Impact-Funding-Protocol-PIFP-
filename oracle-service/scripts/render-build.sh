#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/.render/bin"
CARGO_INSTALL_ROOT="$ROOT_DIR/.render/cargo"

mkdir -p "$BIN_DIR"
mkdir -p "$CARGO_INSTALL_ROOT"
export PATH="$BIN_DIR:$CARGO_INSTALL_ROOT/bin:$PATH"

if ! command -v sncast >/dev/null 2>&1; then
  cargo install \
    --git https://github.com/foundry-rs/starknet-foundry.git \
    --locked \
    --root "$CARGO_INSTALL_ROOT" \
    sncast
fi

cp "$(command -v sncast)" "$BIN_DIR/sncast"
chmod +x "$BIN_DIR/sncast"

cargo build --release
