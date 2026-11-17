import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createOdeenServer } from '../odeenServer'
import { clientForToken, withClient, type SupabaseConfig } from './supabase'

/**
 * Remote ODEEN MCP server (#99): Streamable HTTP, stateless, behind OAuth.
 * Supabase Auth is the authorization server; this function is the protected
 * resource. Clients discover Auth through the protected resource metadata
 * (RFC 9728) that the 401 challenge points to.
 */

export interface HandlerConfig extends SupabaseConfig {
  /** Public URL of this MCP endpoint, e.g. https://<ref>.supabase.co/functions/v1/mcp */
  resourceUrl: string
}

const METADATA_PATH = '/.well-known/oauth-protected-resource'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, mcp-protocol-version, mcp-session-id, last-event-id',
  'Access-Control-Expose-Headers': 'www-authenticate, mcp-session-id',
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(response.body, { status: response.status, headers })
}

export function createHandler(config: HandlerConfig): (req: Request) => Promise<Response> {
  const metadataUrl = `${config.resourceUrl}${METADATA_PATH}`
  const metadata = {
    resource: config.resourceUrl,
    authorization_servers: [`${config.url}/auth/v1`],
    bearer_methods_supported: ['header'],
    resource_name: 'ODEEN',
  }

  function unauthorized(description: string): Response {
    return Response.json(
      { error: 'invalid_token', error_description: description },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': `Bearer resource_metadata="${metadataUrl}", error="invalid_token", error_description="${description}"`,
        },
      },
    )
  }

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

    const path = new URL(req.url).pathname
    if (req.method === 'GET' && path.endsWith(METADATA_PATH)) {
      return withCors(Response.json(metadata))
    }

    const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) return withCors(unauthorized('Sign in to ODEEN to use this server'))

    const client = await clientForToken(config, token)
    if (!client) return withCors(unauthorized('The access token is invalid or expired'))

    // Stateless: a fresh server and transport per request, JSON responses (no SSE).
    const server = createOdeenServer()
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    await server.connect(transport)

    try {
      return withCors(await withClient(client, () => transport.handleRequest(req)))
    } finally {
      await server.close()
    }
  }
}
