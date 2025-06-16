import * as wasm from 'shogi-core';

declare global {
  interface Window {
    wasmModule: typeof wasm;
  }
}

// Boardクラスの型定義を拡張
declare module 'shogi-core' {
  interface Board {
    board_new(): void;
  }
}

export {}; 