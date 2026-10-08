# ODEEN MCP server

Lets Claude Code read and write your ODEEN data over [MCP](https://modelcontextprotocol.io) (stdio, local). Tracked in #99.

It signs in as you, with the anon key and your own session, so every query goes through RLS. There is no service-role key anywhere.

## Setup

```bash
pnpm install
pnpm mcp:login   # builds, asks for your ODEEN email and password, stores the session
```

The session (it holds a refresh token) is saved in `~/.config/odeen/mcp-session.json`, readable by you only. `pnpm mcp:logout` removes it; the web and desktop apps stay signed in.

Inside this repo Claude Code picks the server up from `.mcp.json`. To use it from any other repository:

```bash
claude mcp add --scope user odeen -- node /absolute/path/to/odeen-hyperfocus/mcp/dist/server.js
```

After changing anything under `mcp/` or in the services it uses, run `pnpm mcp:build` and restart the server (`/mcp` in Claude Code).

## Which Supabase

The server uses the same project as `pnpm dev`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`. To point it somewhere else (for example the remote project while `.env` is local), create `.env.mcp.local`:

```bash
ODEEN_SUPABASE_URL=https://<project-ref>.supabase.co
ODEEN_SUPABASE_ANON_KEY=<anon key>
```

Sessions are stored per project, so run `pnpm mcp:login` once for each.

## Tools

| Tool              | What it does                                                       |
| ----------------- | ------------------------------------------------------------------ |
| `list_projects`   | Your projects                                                      |
| `create_project`  | New project                                                        |
| `list_tasks`      | Tasks, optionally by project and status                            |
| `get_task`        | One task with its description and links                            |
| `create_task`     | New task, optionally with links attached                           |
| `update_task`     | Edit title, description, energy, impact, attractiveness, intention |
| `move_task`       | Change status; at most 3 tasks in `doing` per project              |
| `link_task`       | Attach a GitHub issue or an Obsidian note                          |
| `unlink_task`     | Remove a link                                                      |
| `add_capture`     | Drop something into the capture inbox                              |
| `list_captures`   | The inbox (or converted / archived captures)                       |
| `list_intentions` | Day, personal and week intentions for a date                       |

Nothing here deletes tasks, projects or captures.

Obsidian notes are linked, not written: Claude Code writes the note with its Obsidian tools, then calls `link_task` with `Vault/path/to/note`.

## How it is built

`mcp/vite.config.ts` bundles the server with `@/services/supabase` aliased to `mcp/services/supabase.ts`, a Node client with a file-backed session. The tools call the existing module services (`tasks`, `taskLinks`, `projects`, `captures`, `intentions`), so queries and validation live in one place.
