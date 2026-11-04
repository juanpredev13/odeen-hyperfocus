import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// The bundle lives in `mcp/dist/`, two levels below the repo root. Resolving from
// the file (not the cwd) lets the server run from any repository.
const root = resolve(import.meta.dirname, '../..')

// `loadEnvFile` never overrides a variable that is already set, so the order is
// the priority: real environment, then `.env.mcp.local`, then the app's `.env`.
for (const name of ['.env.mcp.local', '.env']) {
  const file = resolve(root, name)
  if (existsSync(file)) process.loadEnvFile(file)
}

export const supabaseUrl = process.env.ODEEN_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
export const supabaseAnonKey =
  process.env.ODEEN_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''
