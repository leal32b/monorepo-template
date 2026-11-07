-- The reference module's table (ADR 0044). Every row belongs to an organization and goes with it.
create table customer (
  id text not null primary key,
  organization_id text not null references auth."organization" ("id") on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  notes text,
  created_at timestamptz not null,
  archived_at timestamptz
);

-- One email per organization, in any case, archived customers included; no email never collides.
create unique index customer_organization_email_key on customer (organization_id, lower(email)) where email is not null;

-- The list's order, so a page is read from the index.
create index customer_organization_name_idx on customer (organization_id, (lower(name) collate "C"), id collate "C");
