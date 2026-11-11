-- The reference module's second table (ADR 0052): one row per deleted customer, written in the same
-- transaction as the delete. Ids only: no name or email survives the customer. `actor_id` has no
-- foreign key, so the row outlives an account deleted later; it goes with its organization.
create table customer_change (
  id text not null primary key,
  organization_id text not null references auth."organization" ("id") on delete cascade,
  customer_id text not null,
  action text not null check (action in ('deleted')),
  actor_id text not null,
  at timestamptz not null
);

-- An organization's changes in the order they happened.
create index customer_change_organization_at_idx on customer_change (organization_id, at, id collate "C");
