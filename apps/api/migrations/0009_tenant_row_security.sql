-- Tenant isolation enforced by the database (ADR 0055). The unit of work switches to `app_tenant` and
-- names the organization, both for its transaction only; the policies below then show and accept only
-- that organization's rows, whatever the query says. The tables' owner (migrations, the cascade of a
-- deleted organization, the purge job) is not subject to them.

-- A role is a name in the cluster, not in the database, so it may already be there.
do $$
begin
  if not exists (select from pg_roles where rolname = 'app_tenant') then
    create role app_tenant nologin;
  end if;
end
$$;

-- The role the API connects as may switch to it.
grant app_tenant to current_user;
grant usage on schema public to app_tenant;

-- A tenant table joins with these three lines (the test `tenant-row-security.db.test.ts` fails without them).
alter table customer enable row level security;
create policy tenant_isolation on customer to app_tenant
  using (organization_id = current_setting('app.organization_id', true));
grant select, insert, update, delete on customer to app_tenant;

alter table customer_change enable row level security;
create policy tenant_isolation on customer_change to app_tenant
  using (organization_id = current_setting('app.organization_id', true));
grant select, insert, update, delete on customer_change to app_tenant;
