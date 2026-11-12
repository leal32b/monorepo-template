-- One audit trail for every module of an organization (ADR 0061): who did what to which record, and
-- when. Ids, codes and field names only, never a value, so a record deleted for good leaves no personal
-- data here. `actor_id` has no foreign key: the entry outlives an account deleted later. It goes with
-- its organization, and the daily purge deletes it after its retention.
create table audit_entry (
  id text not null primary key,
  organization_id text not null references auth."organization" ("id") on delete cascade,
  at timestamptz not null,
  actor_kind text not null check (actor_kind in ('member', 'visitor', 'system')),
  -- The member's user id; a visitor and the system have none.
  actor_id text,
  -- Stable codes the web translates (`customer`, `deleted`), listed by the contract, not here.
  resource_type text not null,
  resource_id text not null,
  action text not null,
  -- The names of the fields the change set, never their values.
  fields text[] not null default '{}',
  constraint audit_entry_actor_check check ((actor_kind = 'member') = (actor_id is not null))
);

-- An organization's trail, newest first, paged by keyset; the purge reads `at` through it too.
create index audit_entry_organization_at_idx on audit_entry (organization_id, at desc, id collate "C" desc);
create index audit_entry_at_idx on audit_entry (at);

-- Append only in fact (ADR 0061): the tenant role reads and adds its organization's entries, and is
-- granted nothing that changes or removes one. The purge and the cascade run as the owner.
alter table audit_entry enable row level security;
create policy tenant_read on audit_entry for select to app_tenant
  using (organization_id = current_setting('app.organization_id', true));
create policy tenant_append on audit_entry for insert to app_tenant
  with check (organization_id = current_setting('app.organization_id', true));
grant select, insert on audit_entry to app_tenant;

-- The customers' history becomes part of the trail: its rows are ids, an actor and an instant, and
-- they are the answers to "who deleted this" the trail exists to keep.
insert into audit_entry (id, organization_id, at, actor_kind, actor_id, resource_type, resource_id, action, fields)
  select id, organization_id, at, actor_kind, actor_id, 'customer', customer_id, action, '{}'
  from customer_change;

drop table customer_change;
