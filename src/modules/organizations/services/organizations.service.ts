import { supabase } from '@/services/supabase'
import {
  ORGANIZATION_LIMITS,
  type AssignableRole,
  type Client,
  type ClientPayload,
  type Organization,
  type OrganizationInvitation,
  type OrganizationMember,
  type OrganizationRole,
  type OrganizationSummary,
  type OrganizationsResult,
  type PendingInvitation,
} from '@/modules/organizations/types'

// Access rules (who can invite, edit clients, change roles…) are enforced by RLS in
// supabase/migrations/20261111000001_create_organizations.sql. The checks here only
// give clear messages before a request is sent.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fail<T>(message: string): OrganizationsResult<T> {
  return { data: null, error: { message } }
}

function ok<T>(data: T): OrganizationsResult<T> {
  return { data, error: null }
}

function validateName(raw: string, label: string): string | null {
  const name = raw.trim()
  if (!name) return `${label} is required`
  if (name.length > ORGANIZATION_LIMITS.name) {
    return `${label} must be at most ${ORGANIZATION_LIMITS.name} characters`
  }
  return null
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

async function currentUser(): Promise<{ id: string; email: string } | null> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  return { id: data.user.id, email: (data.user.email ?? '').toLowerCase() }
}

// ── Organizations ────────────────────────────────────────────────

interface MembershipRow {
  role: OrganizationRole
  organizations: Organization | null
}

export async function fetchMyOrganizations(): Promise<OrganizationsResult<OrganizationSummary[]>> {
  const user = await currentUser()
  if (!user) return fail('Not authenticated')

  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, created_by, created_at)')
    .eq('user_id', user.id)

  if (error) return fail(error.message)

  const rows = data as unknown as MembershipRow[]
  const organizations = rows
    .filter((row): row is MembershipRow & { organizations: Organization } => row.organizations !== null)
    .map((row) => ({ ...row.organizations, role: row.role }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return ok(organizations)
}

export async function fetchOrganization(id: string): Promise<OrganizationsResult<Organization>> {
  const { data, error } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle()

  if (error) return fail(error.message)
  if (!data) return fail('Organization not found')

  return ok(data as Organization)
}

/** Creates the organization and makes the caller its owner (one transaction, server side). */
export async function createOrganization(name: string): Promise<OrganizationsResult<string>> {
  const invalid = validateName(name, 'Name')
  if (invalid) return fail(invalid)

  const { data, error } = await supabase.rpc('create_organization', { p_name: name.trim() })

  if (error) return fail(error.message)

  return ok(data as string)
}

export async function renameOrganization(
  id: string,
  name: string,
): Promise<OrganizationsResult<Organization>> {
  const invalid = validateName(name, 'Name')
  if (invalid) return fail(invalid)

  const { data, error } = await supabase
    .from('organizations')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return fail(error.message)
  if (!data) return fail('Only admins can rename this organization')

  return ok(data as Organization)
}

export async function deleteOrganization(id: string): Promise<OrganizationsResult<null>> {
  const { data, error } = await supabase.from('organizations').delete().eq('id', id).select('id')

  if (error) return fail(error.message)
  if (!data?.length) return fail('Only the owner can delete this organization')

  return ok(null)
}

// ── Members ──────────────────────────────────────────────────────

export async function fetchMembers(
  organizationId: string,
): Promise<OrganizationsResult<OrganizationMember[]>> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  if (error) return fail(error.message)

  return ok(data as OrganizationMember[])
}

export async function updateMemberRole(
  organizationId: string,
  userId: string,
  role: AssignableRole,
): Promise<OrganizationsResult<OrganizationMember>> {
  const { data, error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .select()
    .maybeSingle()

  if (error) return fail(error.message)
  if (!data) return fail('You cannot change this member’s role')

  return ok(data as OrganizationMember)
}

/** Removes a member, or the caller themselves when leaving. The owner cannot be removed. */
export async function removeMember(
  organizationId: string,
  userId: string,
): Promise<OrganizationsResult<null>> {
  const { data, error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .select('user_id')

  if (error) return fail(error.message)
  if (!data?.length) return fail('You cannot remove this member')

  return ok(null)
}

// ── Invitations ──────────────────────────────────────────────────

export async function fetchInvitations(
  organizationId: string,
): Promise<OrganizationsResult<OrganizationInvitation[]>> {
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) return fail(error.message)

  return ok(data as OrganizationInvitation[])
}

export async function createInvitation(
  organizationId: string,
  rawEmail: string,
  role: AssignableRole,
): Promise<OrganizationsResult<OrganizationInvitation>> {
  const user = await currentUser()
  if (!user) return fail('Not authenticated')

  const email = normalizeEmail(rawEmail)
  if (!EMAIL_PATTERN.test(email) || email.length > ORGANIZATION_LIMITS.email) {
    return fail('Enter a valid email address')
  }
  if (email === user.email) return fail('You are already in this organization')

  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({ organization_id: organizationId, email, role, invited_by: user.id })
    .select()
    .single()

  if (error) {
    // 23505: unique (organization_id, email)
    if (error.code === '23505') return fail('That email already has a pending invitation')
    return fail(error.message)
  }

  return ok(data as OrganizationInvitation)
}

/** Revokes an invitation (admins) or declines it (the invitee). */
export async function deleteInvitation(id: string): Promise<OrganizationsResult<null>> {
  const { data, error } = await supabase.from('organization_invitations').delete().eq('id', id).select('id')

  if (error) return fail(error.message)
  if (!data?.length) return fail('Invitation not found')

  return ok(null)
}

interface PendingInvitationRow extends OrganizationInvitation {
  organizations: { name: string } | null
}

export async function fetchPendingInvitations(): Promise<OrganizationsResult<PendingInvitation[]>> {
  const user = await currentUser()
  if (!user) return fail('Not authenticated')

  // Admins can also read their organizations' invitations; keep only the caller's own.
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('*, organizations(name)')
    .eq('email', user.email)
    .order('created_at', { ascending: false })

  if (error) return fail(error.message)

  const rows = data as unknown as PendingInvitationRow[]
  return ok(
    rows.map(({ organizations, ...invitation }) => ({
      ...invitation,
      organization_name: organizations?.name ?? 'Organization',
    })),
  )
}

/** Joins the invitation's organization. The server checks it is addressed to the caller. */
export async function acceptInvitation(id: string): Promise<OrganizationsResult<string>> {
  const { data, error } = await supabase.rpc('accept_organization_invitation', { p_invitation_id: id })

  if (error) return fail(error.message)

  return ok(data as string)
}

// ── Clients ──────────────────────────────────────────────────────

function clientFields(
  payload: ClientPayload,
): OrganizationsResult<Pick<Client, 'name' | 'email' | 'phone' | 'notes'>> {
  const invalid = validateName(payload.name, 'Client name')
  if (invalid) return fail(invalid)

  const email = normalizeEmail(payload.email)
  if (email && (!EMAIL_PATTERN.test(email) || email.length > ORGANIZATION_LIMITS.email)) {
    return fail('Enter a valid client email or leave it empty')
  }

  const phone = payload.phone.trim()
  if (phone.length > ORGANIZATION_LIMITS.phone) {
    return fail(`Phone must be at most ${ORGANIZATION_LIMITS.phone} characters`)
  }

  const notes = payload.notes.trim()
  if (notes.length > ORGANIZATION_LIMITS.notes) {
    return fail(`Notes must be at most ${ORGANIZATION_LIMITS.notes} characters`)
  }

  return ok({
    name: payload.name.trim(),
    email: email || null,
    phone: phone || null,
    notes: notes || null,
  })
}

export async function fetchClients(organizationId: string): Promise<OrganizationsResult<Client[]>> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) return fail(error.message)

  return ok(data as Client[])
}

export async function createClient(
  organizationId: string,
  payload: ClientPayload,
): Promise<OrganizationsResult<Client>> {
  const fields = clientFields(payload)
  if (fields.error || !fields.data) return fail(fields.error?.message ?? 'Invalid client')

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...fields.data, organization_id: organizationId })
    .select()
    .single()

  if (error) return fail(error.message)

  return ok(data as Client)
}

export async function updateClient(
  id: string,
  payload: ClientPayload,
): Promise<OrganizationsResult<Client>> {
  const fields = clientFields(payload)
  if (fields.error || !fields.data) return fail(fields.error?.message ?? 'Invalid client')

  const { data, error } = await supabase.from('clients').update(fields.data).eq('id', id).select().maybeSingle()

  if (error) return fail(error.message)
  if (!data) return fail('Only admins can edit clients')

  return ok(data as Client)
}

export async function deleteClient(id: string): Promise<OrganizationsResult<null>> {
  const { data, error } = await supabase.from('clients').delete().eq('id', id).select('id')

  if (error) return fail(error.message)
  if (!data?.length) return fail('Only admins can delete clients')

  return ok(null)
}
