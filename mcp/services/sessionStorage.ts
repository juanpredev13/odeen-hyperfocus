import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')

export const SESSION_FILE = join(configHome, 'odeen', 'mcp-session.json')

function read(): Record<string, string> {
  if (!existsSync(SESSION_FILE)) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(SESSION_FILE, 'utf8'))
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null) return {}

  const entries = Object.entries(parsed).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  )
  return Object.fromEntries(entries)
}

function write(values: Record<string, string>): void {
  mkdirSync(dirname(SESSION_FILE), { recursive: true, mode: 0o700 })
  writeFileSync(SESSION_FILE, JSON.stringify(values), { mode: 0o600 })
  // `mode` only applies when the file is created; keep an existing one private too.
  chmodSync(SESSION_FILE, 0o600)
}

/**
 * File-backed replacement for `localStorage`, for Supabase Auth. Holds the
 * refresh token, so the file is readable by the owner only. Keys are per
 * Supabase project, so a local and a remote session can coexist.
 */
export const sessionStorage = {
  getItem(key: string): string | null {
    return read()[key] ?? null
  },
  setItem(key: string, value: string): void {
    write({ ...read(), [key]: value })
  },
  removeItem(key: string): void {
    write(Object.fromEntries(Object.entries(read()).filter(([name]) => name !== key)))
  },
}
