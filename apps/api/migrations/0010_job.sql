-- Background work (ADR 0056): one row per job, enqueued in the transaction of the change that causes
-- it and taken by a worker with `for update skip locked`. It is the platform's table, not a tenant's:
-- a job for an organization carries the organization's id in its payload.
create table job (
  id text not null primary key,
  -- The name a handler is registered under, `module.what-it-does`.
  kind text not null,
  payload jsonb not null,
  -- `failed` is the end of a job that used every attempt: it stays for someone to see.
  state text not null default 'pending' check (state in ('pending', 'done', 'failed')),
  -- Not before this instant: now, a time asked for, or the next retry.
  run_at timestamptz not null,
  attempts integer not null default 0,
  -- While a worker holds the job: the end of its lease. Past it, another worker may take the job.
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null,
  finished_at timestamptz
);

-- The worker's claim: the pending job due the longest. Only pending rows, so it stays the size of the backlog.
create index job_pending_run_at_idx on job (run_at, id collate "C") where state = 'pending';

-- The purge: finished jobs past their keep.
create index job_finished_at_idx on job (finished_at) where state <> 'pending';

-- A tenant transaction may enqueue, and never read or change the queue (ADR 0055): inside a unit of
-- work statements run as `app_tenant`, so the job goes in with the change that causes it. The worker
-- runs on the pool as the owner, which the policy does not bind.
alter table job enable row level security;
create policy tenant_enqueue on job for insert to app_tenant with check (true);
grant insert on job to app_tenant;
