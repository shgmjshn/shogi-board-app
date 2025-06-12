import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  build: {
    target: "esnext"
  },
  optimizeDeps: {
    exclude: ['shogi_core']
  },
  resolve: {
    alias: {
      'shogi_core': resolve(__dirname, '../shogi-core/pkg/shogi_core.js')
    }
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      strict: false
    },
    middlewareMode: false,
    hmr: {
      protocol: 'ws'
    }
  },
  assetsInclude: ['**/*.wasm']
})
