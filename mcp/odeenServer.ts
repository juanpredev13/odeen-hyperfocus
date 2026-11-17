import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerAssistantTools } from './tools/assistant'
import { registerTaskTools } from './tools/tasks'

const INSTRUCTIONS =
  'ODEEN is the user\'s deep work system. Tasks live in projects and move through todo → doing → done, with at most 3 in "doing" per project. When work starts from a GitHub issue, create or find its task and attach the issue with `link_task`. Things that come up but are not part of the current work go to the capture inbox with `add_capture`, not into new tasks.'

/** The ODEEN MCP server with every tool registered. Shared by the stdio and HTTP entries. */
export function createOdeenServer(): McpServer {
  const server = new McpServer({ name: 'odeen', version: '0.2.0' }, { instructions: INSTRUCTIONS })
  registerTaskTools(server)
  registerAssistantTools(server)
  return server
}
