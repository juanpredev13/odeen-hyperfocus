import { describe, expect, it } from 'vitest'
import { githubIssueRef, parseTaskLink } from '@/modules/tasks/composables/taskLinkHelpers'

describe('parseTaskLink — GitHub', () => {
  it.each([
    'https://github.com/juanpredev13/odeen-hyperfocus/issues/75',
    'http://www.github.com/juanpredev13/odeen-hyperfocus/issues/75',
    'github.com/juanpredev13/odeen-hyperfocus/issues/75',
    'https://github.com/juanpredev13/odeen-hyperfocus/issues/75#issuecomment-1',
    'https://github.com/juanpredev13/odeen-hyperfocus/issues/75/',
    'juanpredev13/odeen-hyperfocus#75',
    '  juanpredev13/odeen-hyperfocus#075  ',
  ])('parses %s', (input) => {
    expect(parseTaskLink(input)).toEqual({
      kind: 'github_issue',
      url: 'https://github.com/juanpredev13/odeen-hyperfocus/issues/75',
      label: 'juanpredev13/odeen-hyperfocus#75',
    })
  })

  it('rejects pull requests and other GitHub pages', () => {
    expect(parseTaskLink('https://github.com/a/b/pull/3')).toBeNull()
    expect(parseTaskLink('https://github.com/a/b')).toBeNull()
  })
})

describe('parseTaskLink — Obsidian', () => {
  it('parses an Obsidian URL', () => {
    expect(parseTaskLink('obsidian://open?vault=My%20Vault&file=Projects%2FODEEN%20plan')).toEqual({
      kind: 'obsidian_note',
      url: 'obsidian://open?vault=My%20Vault&file=Projects%2FODEEN%20plan',
      label: 'ODEEN plan',
    })
  })

  it('parses Vault/path shorthand and drops .md', () => {
    expect(parseTaskLink('Work/Projects/ODEEN plan.md')).toEqual({
      kind: 'obsidian_note',
      url: 'obsidian://open?vault=Work&file=Projects%2FODEEN%20plan',
      label: 'ODEEN plan',
    })
  })

  it('rejects incomplete Obsidian input', () => {
    expect(parseTaskLink('obsidian://open?vault=Work')).toBeNull()
    expect(parseTaskLink('Work/')).toBeNull()
    expect(parseTaskLink('just words')).toBeNull()
  })

  it('rejects other schemes', () => {
    expect(parseTaskLink('javascript:alert(1)/x')).toBeNull()
    expect(parseTaskLink('https://example.com/a/b')).toBeNull()
  })
})

describe('githubIssueRef', () => {
  it('extracts owner, repo and number from a canonical URL', () => {
    expect(githubIssueRef('https://github.com/a/b/issues/12')).toEqual({
      owner: 'a',
      repo: 'b',
      number: 12,
    })
  })

  it('returns null for non-canonical URLs', () => {
    expect(githubIssueRef('a/b#12')).toBeNull()
  })
})
