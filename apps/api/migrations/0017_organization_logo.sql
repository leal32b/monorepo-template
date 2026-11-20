-- An organization's logo: one row per organization, the image at `logos/<organization_id>/<id>` in the store,
-- written by the API once its bytes were checked. Not Better Auth's `organization.logo`, which any member who
-- may update the organization can set to any string through the plugin.
create table organization_logo (
  organization_id text not null primary key references auth."organization" ("id") on delete cascade,
  -- A new logo is a new id, so a new key and a new address: a browser never shows an old one from its cache.
  id text not null unique,
  type text not null check (type in ('image/png', 'image/jpeg', 'image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  -- In bytes.
  size integer not null check (size > 0),
  -- Who set it, by user id, with no foreign key: the row outlives an account deleted later.
  updated_by text not null,
  updated_at timestamptz not null
);

-- A tenant table (ADR 0055): changing, removing and reading the logo run in a unit of work.
alter table organization_logo enable row level security;
create policy tenant_isolation on organization_logo to app_tenant
  using (organization_id = current_setting('app.organization_id', true));
grant select, insert, update, delete on organization_logo to app_tenant;
