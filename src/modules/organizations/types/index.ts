export type OrganizationRole = 'owner' | 'admin' | 'member'

/** Roles an invitation or a role change can grant. Ownership is never transferred here. */
export type AssignableRole = Exclude<OrganizationRole, 'owner'>

export interface Organization {
  id: string
  name: string
  created_by: string
  created_at: string
}

/** An organization as seen by the signed-in user, with their role in it. */
export interface OrganizationSummary extends Organization {
  role: OrganizationRole
}

export interface OrganizationMember {
  organization_id: string
  user_id: string
  email: string
  role: OrganizationRole
  created_at: string
}

export interface OrganizationInvitation {
  id: string
  organization_id: string
  email: string
  role: AssignableRole
  invited_by: string | null
  created_at: string
}

/** An invitation addressed to the signed-in user. */
export interface PendingInvitation extends OrganizationInvitation {
  organization_name: string
}

export interface Client {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

export interface ClientPayload {
  name: string
  email: string
  phone: string
  notes: string
}

/** Same limits as the check constraints in the organizations migration. */
export const ORGANIZATION_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  notes: 5000,
} as const

export interface OrganizationsError {
  message: string
}

export interface OrganizationsResult<T> {
  data: T | null
  error: OrganizationsError | null
}
