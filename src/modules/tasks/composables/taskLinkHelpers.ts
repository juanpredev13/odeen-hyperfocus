import type { ParsedTaskLink } from '@/modules/tasks/types'

const GITHUB_NAME = '[A-Za-z0-9_.-]+'
const GITHUB_ISSUE_URL = new RegExp(
  `^(?:https?://)?(?:www\\.)?github\\.com/(${GITHUB_NAME})/(${GITHUB_NAME})/issues/(\\d+)(?:[/?#].*)?$`,
)
const GITHUB_ISSUE_SHORT = new RegExp(`^(${GITHUB_NAME})/(${GITHUB_NAME})#(\\d+)$`)
const GITHUB_CANONICAL = new RegExp(
  `^https://github\\.com/(${GITHUB_NAME})/(${GITHUB_NAME})/issues/(\\d+)$`,
)

export interface GithubIssueRef {
  owner: string
  repo: string
  number: number
}

/** Owner, repo and issue number captured by one of the GitHub patterns. */
function githubCaptures(pattern: RegExp, text: string): [string, string, string] | null {
  const [, owner, repo, number] = text.match(pattern) ?? []
  return owner && repo && number ? [owner, repo, number] : null
}

function githubLink([owner, repo, number]: [string, string, string]): ParsedTaskLink {
  const issue = String(Number(number))
  return {
    kind: 'github_issue',
    url: `https://github.com/${owner}/${repo}/issues/${issue}`,
    label: `${owner}/${repo}#${issue}`,
  }
}

function obsidianLink(vault: string, file: string): ParsedTaskLink | null {
  const cleanVault = vault.trim()
  const cleanFile = file.trim().replace(/^\/+/, '').replace(/\.md$/i, '')
  if (!cleanVault || !cleanFile) return null

  const noteName = cleanFile.split('/').pop() ?? cleanFile
  return {
    kind: 'obsidian_note',
    url: `obsidian://open?vault=${encodeURIComponent(cleanVault)}&file=${encodeURIComponent(cleanFile)}`,
    label: noteName,
  }
}

function parseObsidianUri(input: string): ParsedTaskLink | null {
  let uri: URL
  try {
    uri = new URL(input)
  } catch {
    return null
  }
  if (uri.protocol !== 'obsidian:') return null

  const vault = uri.searchParams.get('vault')
  const file = uri.searchParams.get('file') ?? uri.searchParams.get('path')
  if (!vault || !file) return null
  return obsidianLink(vault, file)
}

/**
 * Turns what the user pasted into a canonical link, or null when the
 * input is not a recognised format. Accepted:
 * - GitHub issue URL, or `owner/repo#123`
 * - Obsidian URL (`obsidian://open?vault=…&file=…`), or `Vault/path/to/note`
 */
export function parseTaskLink(input: string): ParsedTaskLink | null {
  const text = input.trim()
  if (!text) return null

  const github = githubCaptures(GITHUB_ISSUE_URL, text) ?? githubCaptures(GITHUB_ISSUE_SHORT, text)
  if (github) return githubLink(github)

  if (text.toLowerCase().startsWith('obsidian://')) return parseObsidianUri(text)

  // `Vault/path/to/note` — anything else with a scheme is rejected.
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return null
  const slash = text.indexOf('/')
  if (slash <= 0) return null
  return obsidianLink(text.slice(0, slash), text.slice(slash + 1))
}

/** Owner, repo and number of a canonical GitHub issue URL. */
export function githubIssueRef(url: string): GithubIssueRef | null {
  const match = githubCaptures(GITHUB_CANONICAL, url)
  if (!match) return null
  return { owner: match[0], repo: match[1], number: Number(match[2]) }
}
