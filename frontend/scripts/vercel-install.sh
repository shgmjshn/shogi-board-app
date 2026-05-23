#!/usr/bin/env bash
set -euo pipefail

export NPM_CONFIG_PRODUCTION=false

setup_rust() {
  # Vercel ビルド環境では Rust が /rust にプリインストールされている
  if [ -f /rust/env ]; then
    # shellcheck disable=SC1091
    . /rust/env
    echo "Using Vercel Rust: $(rustc --version)"
    return 0
  fi

  if command -v rustc >/dev/null 2>&1 && command -v cargo >/dev/null 2>&1; then
    echo "Using existing Rust: $(rustc --version)"
    return 0
  fi

  export CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
  export RUSTUP_HOME="${RUSTUP_HOME:-$HOME/.rustup}"

  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  # shellcheck disable=SC1091
  . "$CARGO_HOME/env"
  echo "Installed Rust: $(rustc --version)"
}

setup_rust

( cd ../shogi-core && npx --yes wasm-pack build --release )

npm ci --include=dev || npm install --include=dev
