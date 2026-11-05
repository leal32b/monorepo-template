-- Better Auth's organization plugin with dynamic access control (ADR 0033). From `pnpm --filter @repo/api auth:schema`,
-- plus the two unique indexes at the end, which the plugin checks only with a read.
alter table auth."session" add column "activeOrganizationId" text;

create table auth."organization" (
  "id" text not null primary key,
  "name" text not null,
  "slug" text not null unique,
  "logo" text,
  "createdAt" timestamptz not null,
  "metadata" text
);

create table auth."organizationRole" (
  "id" text not null primary key,
  "organizationId" text not null references auth."organization" ("id") on delete cascade,
  "role" text not null,
  "permission" text not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz
);

create table auth."member" (
  "id" text not null primary key,
  "organizationId" text not null references auth."organization" ("id") on delete cascade,
  "userId" text not null references auth."user" ("id") on delete cascade,
  "role" text not null,
  "createdAt" timestamptz not null
);

create table auth."invitation" (
  "id" text not null primary key,
  "organizationId" text not null references auth."organization" ("id") on delete cascade,
  "email" text not null,
  "role" text,
  "status" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "inviterId" text not null references auth."user" ("id") on delete cascade
);

create index "organizationRole_organizationId_idx" on auth."organizationRole" ("organizationId");
create index "organizationRole_role_idx" on auth."organizationRole" ("role");
create index "member_organizationId_idx" on auth."member" ("organizationId");
create index "member_userId_idx" on auth."member" ("userId");
create index "invitation_organizationId_idx" on auth."invitation" ("organizationId");
create index "invitation_email_idx" on auth."invitation" ("email");

-- One membership per user and one role name per organization, even when two requests race.
create unique index "member_organizationId_userId_key" on auth."member" ("organizationId", "userId");
create unique index "organizationRole_organizationId_role_key" on auth."organizationRole" ("organizationId", "role");

-- The per-inviter limit of ADR 0033 counts an inviter's recent invitations.
create index "invitation_inviterId_createdAt_idx" on auth."invitation" ("inviterId", "createdAt");
