import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import topLevelAwait from 'vite-plugin-top-level-await'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    topLevelAwait()
  ],
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['shogi_core'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'shogi-core': resolve(__dirname, '../shogi-core/pkg/shogi_core.js'),
      'shogi_core': resolve(__dirname, '../shogi-core/pkg/shogi_core.js'),
      'shogi_core_bg.wasm': resolve(__dirname, '../shogi-core/pkg/shogi_core_bg.wasm')
    }
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      strict: false,
      allow: ['..']
    },
    middlewareMode: false,
    hmr: {
      overlay: true
    }
  },
  assetsInclude: ['**/*.wasm']
})
