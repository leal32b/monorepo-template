-- Counters of the API's own rate limiter (ADR 0059): one row per limit and subject, a fixed window
-- started by the first request. Written by one upsert per request, on the pool. It is the platform's
-- table, not a tenant's: `app_tenant` is granted nothing on it. Better Auth keeps its own counters in
-- auth."rateLimit".
create table rate_limit (
  -- The limit's name and the subject it counts: `public-read:203.0.113.7`.
  key text not null primary key,
  window_start timestamptz not null,
  count integer not null
);

-- The purge: counters whose window started long ago.
create index rate_limit_window_start_idx on rate_limit (window_start);

-- A customer's history also says who created it when a visitor did, through the public surface
-- (ADR 0059). A visitor has no id: `actor_kind` tells a member from a visitor, and `actor_id` is the
-- member's id or null. Rows written before are members' deletions.
alter table customer_change add column actor_kind text not null default 'member' check (actor_kind in ('member', 'visitor'));
alter table customer_change alter column actor_kind drop default;
alter table customer_change alter column actor_id drop not null;
alter table customer_change add constraint customer_change_actor_check check ((actor_kind = 'member') = (actor_id is not null));
alter table customer_change drop constraint customer_change_action_check;
alter table customer_change add constraint customer_change_action_check check (action in ('created', 'deleted'));
