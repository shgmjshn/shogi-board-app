#!/usr/bin/env bash
set -euo pipefail

export NPM_CONFIG_PRODUCTION=false
export RUSTUP_INIT_SKIP_PATH_CHECK=yes
export CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
export RUSTUP_HOME="${RUSTUP_HOME:-$HOME/.rustup}"

setup_rust() {
  # wasm-pack には wasm32-unknown-unknown ターゲットが必要。
  # Vercel 同梱の /rust にはこのターゲットがないため、rustup で管理する。
  if [ ! -f "$CARGO_HOME/env" ]; then
    echo "Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
  fi

  # shellcheck disable=SC1091
  . "$CARGO_HOME/env"

  echo "Adding wasm32-unknown-unknown target..."
  rustup target add wasm32-unknown-unknown

  echo "Using Rust: $(rustc --version)"
}

setup_rust

( cd ../shogi-core && npx --yes wasm-pack build --release )

npm ci --include=dev || npm install --include=dev
