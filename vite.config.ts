import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Set by `tauri ios dev` / `tauri android dev` so a physical device can reach the dev server
const tauriDevHost = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Keep Rust compiler errors visible when running under `tauri dev`
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: tauriDevHost || false,
    hmr: tauriDevHost ? { protocol: 'ws', host: tauriDevHost, port: 5183 } : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
