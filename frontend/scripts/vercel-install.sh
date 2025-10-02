#!/usr/bin/env bash
set -euo pipefail

export CARGO_HOME=${CARGO_HOME:-/root/.cargo}
export RUSTUP_HOME=${RUSTUP_HOME:-/root/.rustup}
export NPM_CONFIG_PRODUCTION=false

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. /root/.cargo/env

( cd ../shogi-core && npx --yes wasm-pack build --release )

npm ci --include=dev || npm install --include=dev


