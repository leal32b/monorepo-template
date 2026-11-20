-- The operator back office (ADR 0077): who may run it, the organizations they entered, and the role its reads
-- and writes run as. The tenant role `app_tenant` gains nothing here.

-- Who is an operator: written only by `operator grant` and `operator revoke`, run with the owner's credentials.
-- No role of the API may write it. Revoked rows stay, as the record of who was an operator and on whose word.
create table operator (
  id text not null primary key,
  user_id text not null references auth."user" ("id") on delete cascade,
  granted_at timestamptz not null,
  -- Who ran the command, as they typed it: a name or an address.
  granted_by text not null,
  revoked_at timestamptz,
  revoked_by text,
  constraint operator_revoked_check check ((revoked_at is null) = (revoked_by is null))
);

create unique index operator_active_idx on operator (user_id) where revoked_at is null;

-- An operator's read-only visit to an organization, as its owner sees it, for a limited time.
create table impersonation (
  id text not null primary key,
  -- No foreign key: the record outlives the operator's account.
  operator_id text not null,
  organization_id text not null references auth."organization" ("id") on delete cascade,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  ended_at timestamptz,
  end_reason text check (end_reason in ('left', 'expired', 'revoked')),
  constraint impersonation_end_check check ((ended_at is null) = (end_reason is null))
);

-- One at a time per operator; the membership read looks for the active one by operator and organization.
create unique index impersonation_active_idx on impersonation (operator_id) where ended_at is null;

-- The trail names an operator as it names a member, by user id (ADR 0061, amended by ADR 0077).
alter table audit_entry drop constraint audit_entry_actor_kind_check;
alter table audit_entry add constraint audit_entry_actor_kind_check
  check (actor_kind in ('member', 'visitor', 'system', 'operator'));
alter table audit_entry drop constraint audit_entry_actor_check;
alter table audit_entry add constraint audit_entry_actor_check
  check ((actor_kind in ('member', 'operator')) = (actor_id is not null));

-- The back office's role, switched to inside its transactions as `app_tenant` is in a tenant's (ADR 0055). A
-- role is a name in the cluster, not in the database, so it may already be there.
do $$
begin
  if not exists (select from pg_roles where rolname = 'app_operator') then
    create role app_operator nologin;
  end if;
end
$$;

grant app_operator to current_user;
grant usage on schema public, auth to app_operator;

-- What its screens show, column by column: never a token, a password, a secret or a product record.
grant select (id, name, slug, "createdAt", "timeZone", currency) on auth."organization" to app_operator;
grant select ("organizationId", "userId", role, "createdAt") on auth."member" to app_operator;
grant select (id, name, email, "emailVerified", "createdAt", "twoFactorEnabled") on auth."user" to app_operator;
grant select ("userId", "createdAt") on auth."session" to app_operator;
grant select ("userId", "providerId") on auth."account" to app_operator;
grant select on operator to app_operator;

create policy operator_read on subscription for select to app_operator using (true);
grant select on subscription to app_operator;

-- Entering and leaving an organization: the visit's row, its two entries in that organization's trail, and the
-- job that ends it at its time limit. Row security is on, so the tenant role, which holds nothing here, sees none.
alter table impersonation enable row level security;
create policy operator_visits on impersonation to app_operator using (true);
grant select, insert on impersonation to app_operator;
grant update (ended_at, end_reason) on impersonation to app_operator;

create policy operator_append on audit_entry for insert to app_operator
  with check (
    actor_kind = 'operator'
    and resource_type = 'organization'
    and resource_id = organization_id
    and action in ('impersonation-started', 'impersonation-ended')
  );
grant insert on audit_entry to app_operator;

create policy operator_enqueue on job for insert to app_operator
  with check (kind = 'back-office.end-impersonation');
grant insert on job to app_operator;
