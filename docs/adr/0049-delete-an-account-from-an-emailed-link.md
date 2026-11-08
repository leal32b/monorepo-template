# 0049. Delete an account from an emailed link

- Status: accepted
- Date: 2026-11-08

## Context and problem statement

A user could not delete their account, and the threat model did not list it as an accepted risk.
Erasure is a right of the data subject (LGPD art. 18, VI; GDPR art. 17) and the first thing a SaaS
audit looks for. Better Auth has `deleteUser`, off by default.

Two questions: how does the user prove the request is theirs, and what happens to the organizations
they are in ([ADR 0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md))?

## Decision drivers

- A session taken over, or a browser left open, must not be enough to delete an account (T34).
- Works for every account: one made with Google alone has no password.
- No organization is left with members and no owner; nothing of the user is left behind (T35).
- The screen says what will be deleted before it happens, and what blocks it with the way out.
- A `GET` never writes, so a link scanner that opens the email's link changes nothing.

## Considered options

1. An emailed link to a web page whose button sends the token back with the session.
2. The password typed on the screen.
3. A session signed in recently (Better Auth's `freshAge`, a day by default).
4. Better Auth's own link to `/api/auth/delete-user/callback`, which deletes on `GET`.

## Decision outcome

Chosen option: 1. The link proves control of the address every account confirmed, Google-only ones
included, which neither a password nor a recent session does on its own; the page makes the last step
a press of a button, not the opening of a link.

- **Asking** (`/settings/profile`, Delete account): `POST /api/auth/delete-user` with no body. Better
  Auth stores a single-use token for 1 hour and calls `sendDeleteAccountVerification`, which emails
  `<web origin>/settings/delete-account?token=…` in the user's language. Nothing is deleted.
- **Confirming** (`/settings/delete-account`): the page reads what will go, says it once more, and its
  button sends `POST /api/auth/delete-user { token }`. Better Auth deletes only when the token's user
  is the session's user. A visitor without a session signs in first and comes back, as on every screen
  behind the session. A deleted account leaves for the sign-in, which says so.
- **Tenancy rule:** `GET /api/me/account-deletion` answers, for each organization of the user, `deleted`
  (they are its only member: it goes with them, its records by cascade), `left` (they share it and
  another owner stays, or they are not an owner: their membership goes), or `blocked` (they are its
  only owner and it has other members). The profile names each blocked organization with a link to its
  members, where they make someone else an owner, or delete it, first. The API enforces it twice: a
  `before` hook refuses the request with 403 `SOLE_OWNER_OF_SHARED_ORGANIZATION` before any email, and
  `beforeDelete` checks again with the token (someone may have left since) and deletes the
  organizations only the user is in (`KyselyAccountDeletion`).
- **What goes with the user row** (`on delete cascade`, migrations 0001 to 0003): sessions, sign-in
  methods (`account`), two-step verification, memberships and the invitations they sent. A db test
  proves each.

### Consequences

- Good: every account can be deleted from the app, with two deliberate acts and nothing left behind.
- Good: no organization loses its last owner; the user is told which and how to fix it.
- Bad: the deletion needs the email to arrive; an unreachable inbox needs support.
- Bad: deletion is immediate, with no grace period to undo it (an accepted risk in the threat model).
- Bad: Better Auth's own `GET /delete-user/callback` stays reachable; it needs the same token and the
  same session, so it adds no way in, but it is a write on `GET`.

## Revisit when

A product must keep records after an account goes (anonymize instead of delete), wants a grace period
before the data is erased, or adds data an organization shares with the user that the cascade does not
reach.
