import type { Project } from '@/modules/projects/types'

type SluggableProject = Pick<Project, 'id' | 'name' | 'created_at'>

export function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}

/**
 * Unique URL slug per project. Projects with the same name (a personal one and
 * one shared by an organization, say) get `-2`, `-3`… in creation order, so the
 * oldest keeps the plain slug and a link never changes when a newer one appears.
 */
export function buildProjectSlugs(projects: readonly SluggableProject[]): Map<string, string> {
  const ordered = [...projects].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  )
  const used = new Set<string>()
  const slugs = new Map<string, string>()

  for (const project of ordered) {
    const base = toSlug(project.name)
    let slug = base
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
    used.add(slug)
    slugs.set(project.id, slug)
  }

  return slugs
}
