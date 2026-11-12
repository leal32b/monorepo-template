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
