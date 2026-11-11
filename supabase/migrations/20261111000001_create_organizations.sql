-- ============================================================
-- Organizations with members, invitations and clients (#107, phase 1 of #106).
--
-- Roles: owner (creator, deletes the organization), admin (manages members,
-- invitations and clients), member (reads the organization and its clients).
-- Organizations and memberships are only created through the security-definer
-- functions below, so a user can never insert themselves into someone else's
-- organization. Every rule lives in RLS, not only in the UI.
-- ============================================================

create type organization_role as enum ('owner', 'admin', 'member');

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 120),
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references profiles (id) on delete cascade,
  -- Copied at join time so members can see each other without reading profiles.
  email           text not null check (length(email) <= 254),
  role            organization_role not null default 'member',
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Exactly one owner per organization.
create unique index organization_members_one_owner
  on organization_members (organization_id) where role = 'owner';

create index organization_members_user_id_idx on organization_members (user_id);

create table organization_invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  email           text not null check (length(email) between 3 and 254 and email = lower(email)),
  role            organization_role not null default 'member' check (role <> 'owner'),
  invited_by      uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (organization_id, email)
);

create index organization_invitations_email_idx on organization_invitations (email);

create table clients (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name            text not null check (length(btrim(name)) between 1 and 120),
  email           text check (email is null or length(email) <= 254),
  phone           text check (phone is null or length(phone) <= 40),
  notes           text check (notes is null or length(notes) <= 5000),
  created_at      timestamptz not null default now()
);

create index clients_organization_id_idx on clients (organization_id);

-- ============================================================
-- Membership helpers. security definer so policies on organization_members
-- can ask about membership without recursing into their own RLS.
-- ============================================================

create or replace function public.organization_role_of(org uuid)
returns organization_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = org and m.user_id = auth.uid()
$$;

create or replace function public.is_organization_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.organization_role_of(org) is not null
$$;

create or replace function public.is_organization_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.organization_role_of(org) in ('owner', 'admin'), false)
$$;

-- The signed-in user's email, lower-cased, from the verified JWT.
create or replace function public.current_user_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(auth.jwt() ->> 'email')
$$;

create or replace function public.is_organization_invitee(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_invitations i
    where i.organization_id = org and i.email = public.current_user_email()
  )
$$;

-- ============================================================
-- Actions
-- ============================================================

-- Creates an organization and makes the caller its owner in one transaction.
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  org_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  insert into public.organizations (name, created_by)
  values (btrim(p_name), uid)
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, email, role)
  select org_id, uid, p.email, 'owner'
  from public.profiles p
  where p.id = uid;

  return org_id;
end;
$$;

-- Joins the organization of an invitation addressed to the caller's email.
create or replace function public.accept_organization_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.organization_invitations;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select * into inv
  from public.organization_invitations
  where id = p_invitation_id and email = public.current_user_email();

  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  insert into public.organization_members (organization_id, user_id, email, role)
  select inv.organization_id, uid, p.email, inv.role
  from public.profiles p
  where p.id = uid
  on conflict (organization_id, user_id) do nothing;

  delete from public.organization_invitations where id = inv.id;

  return inv.organization_id;
end;
$$;

revoke execute on function
  public.organization_role_of(uuid),
  public.is_organization_member(uuid),
  public.is_organization_admin(uuid),
  public.is_organization_invitee(uuid),
  public.current_user_email(),
  public.create_organization(text),
  public.accept_organization_invitation(uuid)
from public, anon;

grant execute on function
  public.organization_role_of(uuid),
  public.is_organization_member(uuid),
  public.is_organization_admin(uuid),
  public.is_organization_invitee(uuid),
  public.current_user_email(),
  public.create_organization(text),
  public.accept_organization_invitation(uuid)
to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_invitations enable row level security;
alter table clients enable row level security;

-- organizations: no insert policy, creation goes through create_organization().
create policy "Members and invitees can view an organization"
  on organizations for select
  to authenticated
  using (is_organization_member(id) or is_organization_invitee(id));

create policy "Admins can rename an organization"
  on organizations for update
  to authenticated
  using (is_organization_admin(id))
  with check (is_organization_admin(id));

create policy "The owner can delete an organization"
  on organizations for delete
  to authenticated
  using (organization_role_of(id) = 'owner');

-- organization_members: no insert policy, joining goes through the functions above.
create policy "Members can view the members of their organizations"
  on organization_members for select
  to authenticated
  using (is_organization_member(organization_id));

-- Admins change roles between admin and member; the owner row is never edited here.
create policy "Admins can change member roles"
  on organization_members for update
  to authenticated
  using (is_organization_admin(organization_id) and role <> 'owner')
  with check (is_organization_admin(organization_id) and role <> 'owner');

-- Admins remove members; anyone but the owner can leave.
create policy "Admins can remove members and members can leave"
  on organization_members for delete
  to authenticated
  using (
    role <> 'owner'
    and (is_organization_admin(organization_id) or user_id = auth.uid())
  );

-- organization_invitations
create policy "Admins and the invitee can view an invitation"
  on organization_invitations for select
  to authenticated
  using (is_organization_admin(organization_id) or email = current_user_email());

create policy "Admins can invite"
  on organization_invitations for insert
  to authenticated
  with check (is_organization_admin(organization_id) and invited_by = auth.uid());

create policy "Admins can revoke and the invitee can decline"
  on organization_invitations for delete
  to authenticated
  using (is_organization_admin(organization_id) or email = current_user_email());

-- clients
create policy "Members can view clients"
  on clients for select
  to authenticated
  using (is_organization_member(organization_id));

create policy "Admins can create clients"
  on clients for insert
  to authenticated
  with check (is_organization_admin(organization_id));

create policy "Admins can update clients"
  on clients for update
  to authenticated
  using (is_organization_admin(organization_id))
  with check (is_organization_admin(organization_id));

create policy "Admins can delete clients"
  on clients for delete
  to authenticated
  using (is_organization_admin(organization_id));

-- Only the role of a membership can change, never which user or organization it belongs to.
revoke update on organization_members from authenticated, anon;
grant update (role) on organization_members to authenticated;
