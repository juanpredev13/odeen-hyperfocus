import type {
  Capture,
  CaptureKind,
  CaptureKindInfo,
  CaptureStatus,
} from '@/modules/assistant/types'

export const MAX_CAPTURE_LENGTH = 1000

export const DEFAULT_CAPTURE_KIND: CaptureKind = 'open_loop'

export const CAPTURE_KINDS: readonly CaptureKindInfo[] = [
  { id: 'open_loop', label: 'Open loop', icon: 'pending_actions', prefix: 'loop' },
  { id: 'distraction', label: 'Distraction', icon: 'notifications_paused', prefix: 'distraction' },
  { id: 'idea', label: 'Idea', icon: 'lightbulb', prefix: 'idea' },
  { id: 'problem', label: 'Problem', icon: 'psychology_alt', prefix: 'problem' },
  { id: 'worry', label: 'Worry', icon: 'cloud', prefix: 'worry' },
  { id: 'waiting_for', label: 'Waiting for', icon: 'hourglass_top', prefix: 'waiting' },
]

export function getKindInfo(kind: CaptureKind): CaptureKindInfo {
  const info = CAPTURE_KINDS.find((k) => k.id === kind)
  if (!info) throw new Error(`Unknown capture kind: ${kind}`)
  return info
}

export interface ParsedCapture {
  kind: CaptureKind
  text: string
}

/**
 * Quick-capture syntax: an optional "prefix:" picks the kind
 * ("idea: try a walking meeting"). Without a known prefix the
 * fallback kind is used and the text is kept as typed.
 */
export function parseQuickCapture(input: string, fallback: CaptureKind = DEFAULT_CAPTURE_KIND): ParsedCapture {
  const trimmed = input.trim()
  const match = /^([a-z_]+)\s*:\s*(.*)$/is.exec(trimmed)
  if (match && match[1] !== undefined && match[2] !== undefined) {
    const prefix = match[1].toLowerCase()
    const info = CAPTURE_KINDS.find((k) => k.prefix === prefix || k.id === prefix)
    const rest = match[2].trim()
    if (info && rest) return { kind: info.id, text: rest }
  }
  return { kind: fallback, text: trimmed }
}

export function isValidCaptureText(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_CAPTURE_LENGTH
}

export function byStatus(captures: readonly Capture[], status: CaptureStatus): Capture[] {
  return captures
    .filter((c) => c.status === status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function pinnedProblems(captures: readonly Capture[]): Capture[] {
  return byStatus(captures, 'inbox').filter((c) => c.kind === 'problem' && c.pinned)
}

export function countByKind(captures: readonly Capture[]): Record<CaptureKind, number> {
  const counts: Record<CaptureKind, number> = {
    open_loop: 0,
    distraction: 0,
    idea: 0,
    problem: 0,
    worry: 0,
    waiting_for: 0,
  }
  for (const c of captures) counts[c.kind]++
  return counts
}

/** Short relative time ("just now", "5m", "3h", "2d") for inbox rows. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
