-- Optimistic concurrency for the reference module (ADR 0048): every save states the version it read
-- and raises it by one, so two people editing at once cannot overwrite each other in silence.
alter table customer add column version integer not null default 1;
alter table customer add column updated_at timestamptz;
update customer set updated_at = coalesce(archived_at, created_at);
alter table customer alter column updated_at set not null;
alter table customer alter column version drop default;
