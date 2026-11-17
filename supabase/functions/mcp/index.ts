// Remote ODEEN MCP server (#99). The handler is bundled from mcp/remote/ by
// `pnpm mcp:build:remote` into ./dist (gitignored); `pnpm mcp:deploy` builds and deploys.

import { createHandler } from './dist/handler.js'

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const url = env('SUPABASE_URL')

Deno.serve(
  createHandler({
    url,
    anonKey: env('SUPABASE_ANON_KEY'),
    // Behind the gateway the request URL is internal; the public URL is fixed.
    resourceUrl: Deno.env.get('MCP_RESOURCE_URL') ?? `${url}/functions/v1/mcp`,
  }),
)
