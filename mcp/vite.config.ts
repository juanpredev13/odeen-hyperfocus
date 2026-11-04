import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const root = resolve(import.meta.dirname, '..')

export default defineConfig({
  root,
  publicDir: false,
  // The server reads its configuration at runtime (see env.ts); nothing from .env is inlined.
  envPrefix: 'ODEEN_BUILD_',
  resolve: {
    alias: [
      // Module services import the browser client; here they get the Node one.
      { find: '@/services/supabase', replacement: resolve(root, 'mcp/services/supabase.ts') },
      { find: '@', replacement: resolve(root, 'src') },
    ],
  },
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'mcp/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        server: resolve(root, 'mcp/server.ts'),
        login: resolve(root, 'mcp/login.ts'),
      },
      // Shared chunks stay next to the entries: env.ts finds the repo root from its own path.
      output: { chunkFileNames: '[name].js' },
    },
  },
})
