-- Better Auth's twoFactor plugin (ADR 0020): TOTP and backup codes. From `pnpm --filter @repo/api auth:schema`.
alter table auth."user" add column "twoFactorEnabled" boolean default false;

create table auth."twoFactor" (
  "id" text not null primary key,
  "secret" text not null,
  "backupCodes" text not null,
  "userId" text not null references auth."user" ("id") on delete cascade,
  "verified" boolean,
  "failedVerificationCount" integer,
  "lockedUntil" timestamptz
);

create index "twoFactor_secret_idx" on auth."twoFactor" ("secret");
create index "twoFactor_userId_idx" on auth."twoFactor" ("userId");
