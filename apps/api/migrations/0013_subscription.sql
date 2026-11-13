-- An organization's subscription (ADR 0063): one row per organization, written from the first checkout
-- its owner opens. No row means the trial, counted from `auth.organization."createdAt"` by the
-- membership read. The plan is ours, set only by the billing use cases; the payment state (`status`,
-- the period, `past_due_since`, `cancel_at_period_end`) comes only from the provider.
create table subscription (
  organization_id text not null primary key references auth."organization" ("id") on delete cascade,
  status text not null check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  -- Keys of the catalogue in `@repo/contracts`, which is code, so no check here. Null until a checkout is confirmed.
  plan text,
  -- A downgrade scheduled for `paid_through`.
  next_plan text,
  trial_ends_at timestamptz not null,
  period_starts_at timestamptz,
  paid_through timestamptz,
  -- The due date of the oldest unpaid charge; null when nothing is overdue.
  past_due_since timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Who holds the customer, and its ids there.
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  -- The checkout that is open, if any: a first subscription or an upgrade's payment, for which plan
  -- and how much, in the plans' minor units. The membership read reads the first three together.
  checkout_kind text check (checkout_kind in ('subscription', 'upgrade')),
  checkout_plan text,
  checkout_amount integer check (checkout_amount >= 0),
  checkout_id text,
  checkout_url text,
  checkout_expires_at timestamptz,
  -- Optimistic concurrency (ADR 0048).
  version integer not null default 1,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint subscription_checkout_check check (
    (checkout_kind is null) = (checkout_plan is null) and (checkout_kind is null) = (checkout_amount is null)
  ),
  constraint subscription_provider_customer_key unique (provider, provider_customer_id),
  constraint subscription_provider_subscription_key unique (provider, provider_subscription_id)
);

-- A tenant table (ADR 0055), with no `delete` grant: the row goes only with its organization. Its writes
-- happen in the billing module's unit of work, with their audit entry.
alter table subscription enable row level security;
create policy tenant_isolation on subscription to app_tenant
  using (organization_id = current_setting('app.organization_id', true));
grant select, insert, update on subscription to app_tenant;

-- The organizations that exist now start their trial today (`trial.days` of the contracts), so a deployed
-- template does not put them straight into read only.
insert into subscription (organization_id, status, trial_ends_at, created_at, updated_at)
  select id, 'trialing', now() + interval '14 days', now(), now() from auth."organization";
