import { describe, expect, it } from 'vitest'
import { buildProjectSlugs, toSlug } from '@/modules/projects/composables/projectSlugs'

function project(id: string, name: string, created_at: string) {
  return { id, name, created_at }
}

describe('toSlug', () => {
  it('lower-cases and joins words with dashes', () => {
    expect(toSlug('  Web  Cliente Demo ')).toBe('web-cliente-demo')
  })
})

describe('buildProjectSlugs', () => {
  it('keeps the plain slug when names are unique', () => {
    const slugs = buildProjectSlugs([project('a', 'Alpha', '2026-01-01'), project('b', 'Beta', '2026-01-02')])
    expect(slugs.get('a')).toBe('alpha')
    expect(slugs.get('b')).toBe('beta')
  })

  it('adds -2, -3 to newer projects with the same name, whatever the list order', () => {
    const slugs = buildProjectSlugs([
      project('c', 'Web', '2026-03-01'),
      project('a', 'Web', '2026-01-01'),
      project('b', 'web', '2026-02-01'),
    ])
    expect(slugs.get('a')).toBe('web')
    expect(slugs.get('b')).toBe('web-2')
    expect(slugs.get('c')).toBe('web-3')
  })

  it('never reuses a slug taken by a project literally named "<name> 2"', () => {
    const slugs = buildProjectSlugs([
      project('a', 'Web 2', '2026-01-01'),
      project('b', 'Web', '2026-02-01'),
      project('c', 'Web', '2026-03-01'),
    ])
    expect(slugs.get('a')).toBe('web-2')
    expect(slugs.get('b')).toBe('web')
    expect(slugs.get('c')).toBe('web-3')
  })
})
