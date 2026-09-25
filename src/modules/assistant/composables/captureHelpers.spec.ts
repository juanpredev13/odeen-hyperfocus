import { describe, expect, it } from 'vitest'
import {
  CAPTURE_KINDS,
  MAX_CAPTURE_LENGTH,
  byStatus,
  countByKind,
  getKindInfo,
  isValidCaptureText,
  parseQuickCapture,
  pinnedProblems,
  timeAgo,
} from '@/modules/assistant/composables/captureHelpers'
import type { Capture } from '@/modules/assistant/types'

function capture(partial: Partial<Capture>): Capture {
  return {
    id: 'c',
    user_id: 'u',
    session_id: null,
    kind: 'open_loop',
    text: 'x',
    status: 'inbox',
    task_id: null,
    pinned: false,
    created_at: '2026-09-25T10:00:00Z',
    processed_at: null,
    ...partial,
  }
}

describe('parseQuickCapture', () => {
  it('defaults to open loop and trims', () => {
    expect(parseQuickCapture('  call the dentist  ')).toEqual({ kind: 'open_loop', text: 'call the dentist' })
  })

  it.each([
    ['idea: walking meetings', 'idea', 'walking meetings'],
    ['Problem:  how to structure the book', 'problem', 'how to structure the book'],
    ['worry:rent is due', 'worry', 'rent is due'],
    ['waiting: invoice from client', 'waiting_for', 'invoice from client'],
    ['waiting_for: package', 'waiting_for', 'package'],
    ['distraction: checked news', 'distraction', 'checked news'],
    ['loop: renew passport', 'open_loop', 'renew passport'],
  ] as const)('%s → %s', (input, kind, text) => {
    expect(parseQuickCapture(input)).toEqual({ kind, text })
  })

  it('keeps unknown prefixes as text', () => {
    expect(parseQuickCapture('note: something')).toEqual({ kind: 'open_loop', text: 'note: something' })
  })

  it('keeps a known prefix with no content as plain text', () => {
    expect(parseQuickCapture('idea:')).toEqual({ kind: 'open_loop', text: 'idea:' })
  })

  it('uses the provided fallback kind', () => {
    expect(parseQuickCapture('meeting ran long', 'distraction').kind).toBe('distraction')
  })

  it('does not treat times as prefixes', () => {
    expect(parseQuickCapture('9:30 standup notes').text).toBe('9:30 standup notes')
  })
})

describe('isValidCaptureText', () => {
  it('rejects blank and over-long text', () => {
    expect(isValidCaptureText('   ')).toBe(false)
    expect(isValidCaptureText('a'.repeat(MAX_CAPTURE_LENGTH + 1))).toBe(false)
    expect(isValidCaptureText('ok')).toBe(true)
  })
})

describe('filters', () => {
  const all = [
    capture({ id: 'old', created_at: '2026-09-24T10:00:00Z' }),
    capture({ id: 'new', created_at: '2026-09-25T12:00:00Z' }),
    capture({ id: 'arch', status: 'archived', processed_at: '2026-09-25T12:00:00Z' }),
    capture({ id: 'pin', kind: 'problem', pinned: true }),
    capture({ id: 'pin-done', kind: 'problem', pinned: true, status: 'archived' }),
  ]

  it('byStatus filters and sorts newest first', () => {
    expect(byStatus(all, 'inbox').map((c) => c.id)).toEqual(['new', 'pin', 'old'])
  })

  it('pinnedProblems only returns pinned problems still in the inbox', () => {
    expect(pinnedProblems(all).map((c) => c.id)).toEqual(['pin'])
  })

  it('countByKind covers every kind', () => {
    const counts = countByKind(all)
    expect(Object.keys(counts).sort()).toEqual(CAPTURE_KINDS.map((k) => k.id).sort())
    expect(counts.problem).toBe(2)
    expect(counts.open_loop).toBe(3)
  })
})

describe('getKindInfo', () => {
  it('returns label and prefix', () => {
    expect(getKindInfo('waiting_for')).toMatchObject({ label: 'Waiting for', prefix: 'waiting' })
  })
})

describe('timeAgo', () => {
  const now = new Date('2026-09-25T12:00:00Z')
  it.each([
    ['2026-09-25T11:59:30Z', 'just now'],
    ['2026-09-25T11:55:00Z', '5m'],
    ['2026-09-25T09:00:00Z', '3h'],
    ['2026-09-23T12:00:00Z', '2d'],
    ['2026-09-25T12:00:10Z', 'just now'],
  ])('%s → %s', (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected)
  })
})
