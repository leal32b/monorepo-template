-- The terms and privacy notice each account accepted (ADR 0074), additional fields of Better Auth's user: the
-- version in force when the account was made and when, both stamped by the server on every creation. Accounts
-- made before stay null: no acceptance was recorded for them.
alter table auth."user" add column "legalVersion" text;
alter table auth."user" add column "legalAcceptedAt" timestamptz;
