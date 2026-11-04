import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerAssistantTools } from './tools/assistant'
import { registerTaskTools } from './tools/tasks'

const server = new McpServer(
  { name: 'odeen', version: '0.1.0' },
  {
    instructions:
      'ODEEN is the user\'s deep work system. Tasks live in projects and move through todo → doing → done, with at most 3 in "doing" per project. When work starts from a GitHub issue, create or find its task and attach the issue with `link_task`. Things that come up but are not part of the current work go to the capture inbox with `add_capture`, not into new tasks.',
  },
)

registerTaskTools(server)
registerAssistantTools(server)

// stdout carries the protocol, so anything for a human goes to stderr.
await server.connect(new StdioServerTransport())
