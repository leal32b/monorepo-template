# 0057. Send identity emails through the job queue

- Status: accepted
- Date: 2026-11-11

## Context and problem statement

Identity sends five emails from Better Auth's callbacks: the confirmation of an address, a password
reset, the notice to an address someone tried to register again, an invitation, and the link that
confirms an account deletion ([ADR 0049](0049-delete-an-account-from-an-emailed-link.md)).
[ADR 0021](0021-send-email-through-a-provider-neutral-port.md) sent each one without waiting and
only logged a failure (`email not sent`), so the response never waited for the provider. A provider
that failed once lost the email: the user waited for nothing, then had to ask again.

[ADR 0056](0056-run-background-work-from-a-job-table-in-postgres.md) gave the API a job queue in
Postgres with retries (30 s, 2 min, 8 min, 32 min; five attempts), at-least-once delivery, and done
and failed rows kept 7 and 30 days. Four of the five emails carry a link that acts as a credential:
a reset or deletion token, a confirmation token, an invitation's id. Every one of those links expires
1 hour after it is made, except the invitation (7 days).

What does a job hold, how long does a link stay in the table, what happens when every attempt
fails, and what does a repeat cost? The answer supersedes the "Failures" paragraph of ADR 0021;
the rest of it stands.

## Decision drivers

- An email whose provider fails once is still delivered.
- The response still does not wait for the provider.
- A link with a token stays at rest no longer than it can be used, and never reaches a log.
- A link that arrives must still work.
- Nothing new for the user to learn, and no new screen.
- Better Auth stays inside `modules/identity/infrastructure/` (ADR 0020).

## Considered options

What a job holds:

1. The rendered message: recipient, subject, text and HTML.
2. What the email is made from: its kind, recipient, language, link and values; the handler writes
   the text when it sends.

How long the link stays:

A. As ADR 0056 keeps every payload: until the purge, 7 days after done, 30 after failed.
B. Blanked by the statement that ends the job, done or failed, for a kind that says its payload is
   secret.
C. Encrypted in the table with `BETTER_AUTH_SECRET`.

How long to keep trying:

i. The queue's schedule and five attempts.
ii. Fewer attempts, or a shorter schedule set per kind.

## Decision outcome

Chosen options: 2, B and i.

**The kind.** `identity.send-email` (`modules/identity/jobs/send-email.ts`), registered by
`registerIdentityJobs(registrar, { emailSender })` from `app/create-jobs.ts`. Its payload is
`{ email, to, locale, url, values? }`, each checked by the schema: `email` one of the five kinds,
`locale` one of the languages emails are written in. The handler writes the message with
`writeEmail` and hands it to the `EmailSender` port; a provider's refusal throws and the queue
retries. Option 1 would keep HTML in the table, three times the size, for nothing: the texts change
only with a deploy, and a retry 40 minutes later in the same language is the same email.

**Enqueue, not send.** `createApp` takes the queue on the pool and hands it to `createAuth`; `send`
awaits `queue.enqueue(...)`, one insert. Better Auth's callbacks run outside our unit of work, so it
is the pool's queue, not one bound to a transaction. The response waits for that insert, never for
the provider; the enqueue wakes the worker in the same process, which sends a few milliseconds
later. When the insert fails the request fails with it (503 when the database is out of reach,
ADR 0047), and the user can try again at once, instead of a sign-up that answers well and sends
nothing.

**A secret payload is forgotten when the job ends.** A `JobDefinition` may say `secretPayload: true`.
The store then sets the payload to JSON `null` in the same statement that marks the job `done` or
`failed`; a retry keeps it, since the next attempt needs it. A link is therefore at rest only while
its email waits: under a second in the usual case, about 48 minutes at most (below), never the 7 or
30 days of ADR 0056. The row stays, with its kind, attempts, times and `last_error`, so "did it run?"
is still answered. The log lines of ADR 0056 never carry a payload; `last_error` keeps only the
provider's message (the Resend adapter's names a status and an error code, never the recipient or
the text). Option C would leave a token in the table for the full keep, readable by anyone with the
secret and the database; forgetting it costs one column in one statement. A failed identity email
cannot be put back (its payload is gone, and its link has expired or nearly): the user asks again.

**The schedule stays.** Every link with a token lives 1 hour (`EMAIL_LINK_SECONDS`, now set
explicitly on Better Auth's confirmation, reset and deletion tokens). Five attempts span 42.5
minutes of backoff plus at most 60 s per attempt, about 48 minutes, so a link delivered on the last
attempt still works for 12 minutes or more; a test keeps the schedule shorter than the link. Most
provider incidents end within that span, and fewer attempts would lose those emails to save a
late one. So the queue does not gain a per-kind schedule: `maxAttempts` per kind already exists, and
a kind that needed a shorter span would add it then.

**When every attempt fails.** The user sees what they see today when an email does not arrive: the
"check your email" screen says to look in spam or send it again, the reset screen says the link
works for 1 hour, and an inviter sees the invitation still pending with its Resend button. Asking
again enqueues a new email with a new link. The operator sees `job failed` at error level with
`kind: identity.send-email` ([operations.md](../operations.md)), and the row stays `failed` for 30
days. Telling the user on screen that their email failed would need a read of the job by the person
who asked, which an anonymous reset cannot have without saying whether the address has an account
(T08).

**Repeats.** Delivery is at least once (ADR 0056): a worker that sent the email and then crashed, or
could not mark the row, sends it again once its lease ends. The repeat is a second copy of the same
email with the same link, which works once: annoying, never harmful. Nothing guards against it. A
provider idempotency key (Resend's `Idempotency-Key`, from the job's id) would, and is the place to
start if repeats are ever seen.

The threat model gains T37, a link read from the job table.

### Consequences

- Good: a provider that fails for up to about 40 minutes delays an email instead of losing it.
- Good: a failure is visible as a `failed` row and an error line, with the attempts it took.
- Good: a link with a token is in the table only while it waits, and in no log.
- Good: the response no longer depends on a provider call started beside it; a sign-up that cannot
  store its email fails visibly.
- Bad: the response waits for one insert more than before.
- Bad: an email can arrive up to about 48 minutes late, after the user has asked again; both links
  work, which may confuse.
- Bad: a repeat after a crash sends a second copy; nothing prevents it.
- Bad: a failed identity email cannot be requeued by an operator; the user must ask again.
- Bad: the user is not told on screen that their email failed for good.

## Revisit when

Users receive repeated emails (add the provider's idempotency key); a link shorter than an hour is
emailed (shorten `maxAttempts` for the kind, as the test will demand); the provider's incidents last
longer than the schedule (a longer span needs longer links); or a product wants to show the
delivery state of an invitation to the inviter.
