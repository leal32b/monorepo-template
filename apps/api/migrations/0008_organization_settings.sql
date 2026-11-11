-- The organization's time zone and currency (ADR 0053), additional fields of Better Auth's organization plugin, as
-- `pnpm --filter @repo/api auth:schema` prints them. The API requires both on every creation; the defaults only fill
-- organizations made before, and rows written outside Better Auth, such as a seed or a test.
alter table auth."organization" add column "timeZone" text not null default 'UTC';
alter table auth."organization" add column "currency" text not null default 'USD';
