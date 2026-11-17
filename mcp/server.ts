import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createOdeenServer } from './odeenServer'

// stdout carries the protocol, so anything for a human goes to stderr.
await createOdeenServer().connect(new StdioServerTransport())
