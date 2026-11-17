import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const root = resolve(import.meta.dirname, '..')

/**
 * Bundles the remote MCP handler into one ESM file for the `mcp` Supabase
 * Edge Function (Deno). Dependencies are inlined; only Node built-ins that
 * Deno provides stay external.
 */
export default defineConfig({
  root,
  publicDir: false,
  envPrefix: 'ODEEN_BUILD_',
  resolve: {
    alias: [
      // Module services import the browser client; here they get the request-scoped one.
      { find: '@/services/supabase', replacement: resolve(root, 'mcp/remote/supabase.ts') },
      { find: '@', replacement: resolve(root, 'src') },
    ],
  },
  ssr: {
    noExternal: true,
    target: 'webworker',
  },
  build: {
    ssr: resolve(root, 'mcp/remote/handler.ts'),
    target: 'esnext',
    outDir: 'supabase/functions/mcp/dist',
    emptyOutDir: true,
    // Minified: the Supabase CLI scans the bundle for import paths, including ones in comments.
    minify: true,
    rollupOptions: {
      external: [/^node:/],
      output: { entryFileNames: 'handler.js', inlineDynamicImports: true },
    },
  },
})
