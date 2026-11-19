-- An organization's last export (ADR 0074): one row per organization, replaced by each new request. The zip
-- rests in `file` from when the job builds it until the daily purge empties it, 7 days later; the row stays,
-- so the page can say the export expired. It goes with its organization. When the file store lands (P1-5),
-- the zip moves there and `file` gives way to the store's key.
create table organization_export (
  organization_id text not null primary key references auth."organization" ("id") on delete cascade,
  id text not null unique,
  -- The owner who asked, by user id, with no foreign key: the row outlives an account deleted later.
  requested_by text not null,
  requested_at timestamptz not null,
  ready_at timestamptz,
  expires_at timestamptz,
  -- In bytes, kept when the purge empties the file.
  size integer check (size >= 0),
  file bytea,
  constraint organization_export_ready_check check (
    (ready_at is null) = (expires_at is null) and (ready_at is null) = (size is null)
  )
);

-- The purge empties files past their expiry.
create index organization_export_expires_at_idx on organization_export (expires_at) where file is not null;

-- A tenant table (ADR 0055): the request, the job and the download all run in a unit of work.
alter table organization_export enable row level security;
create policy tenant_isolation on organization_export to app_tenant
  using (organization_id = current_setting('app.organization_id', true));
grant select, insert, update, delete on organization_export to app_tenant;
