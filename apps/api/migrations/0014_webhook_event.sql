-- The notices providers have delivered (ADR 0063): one row per provider and event id, so a repeat
-- enqueues no second job. It is the platform's table, not a tenant's: no organization, no grant to
-- `app_tenant`. The webhook route writes it on the pool, in one transaction with the job it enqueues
-- (`runAsPlatform`), and the daily purge deletes rows older than 30 days, longer than either provider
-- of ADR 0064 keeps resending a notice.
create table webhook_event (
  -- The provider's name, as in `/api/webhooks/<source>`.
  source text not null,
  event_id text not null,
  received_at timestamptz not null,
  primary key (source, event_id)
);

-- The purge reads by age.
create index webhook_event_received_at_idx on webhook_event (received_at);
