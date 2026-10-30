---
name: minimize-support
description: >-
  Designs out avoidable support contacts: runs the 8 failure categories over a flow and answers
  each relevant failure with the response hierarchy (eliminate, prevent, detect early, recover,
  self-diagnose, self-serve, support with context). Use whenever a change, new or adjusted,
  creates or alters something the end user sees or triggers: screens, forms, error messages,
  authentication, billing, invitations, import, deletion or permissions.
---

# Minimize support

Every support contact is a product defect (Price and Jaffe, *The Best Service is No Service*).
The goal is zero **avoidable** contacts, not zero contacts: some contacts are product signal.

## Checklist

Run it on the flow the change touches, before writing the screens or the endpoint.

1. **Failure categories.** Walk each step of the changed flow through the 8 categories below and
   list what can go wrong. When it is unclear which failures matter, score severity, occurrence and
   detectability from 1 to 10 and multiply them (FMEA's RPN).
2. **Response hierarchy.** For each relevant failure, try the responses from the top and stop at the
   first that works. Prefer the primitives the template already has. Put heavy defenses where
   severity is high (money, data, access) and keep the rest light.
3. **Report.** In a few lines, say what was handled (failure → response) and what was left out and
   why: low severity, a primitive that comes in a later phase, or more friction than it saves.

## The 8 failure categories

| Category | Ask | Examples |
| --- | --- | --- |
| Input | What can the user type or paste wrong? | Invalid data, wrong format, pasted spaces |
| State | What if the thing changed or disappeared meanwhile? | Acting on a deleted item, a used link |
| Permission | Will they understand why they cannot see or do it? | "Why can't I see this?" |
| Concurrency and timing | What if it happens twice, or too late? | Double click, two tabs, expired session or link |
| External dependency | What if a provider fails or is slow? | Email not arriving, payment gateway down |
| Understanding | Do they know what will happen, and what happened? | Unclear outcome, no feedback |
| Irreversibility | Can it be undone? | Delete, cancel, overwrite |
| Account and billing | What about money and limits? | Declined card, plan change, quota reached |

Two kinds of error need different defenses (Don Norman): **slips** (they knew what to do and did it
wrong) call for constraints and forcing functions; **mistakes** (wrong mental model) call for
feedback, visible state and a clear mapping between action and result.

## The response hierarchy

1. **Eliminate**: the failure cannot exist (no step, no field, no choice to get wrong).
2. **Prevent**: a constraint makes it impossible: a disabled submit until the form is valid, a
   schema, a state the data model cannot represent. Prefer preventing (Shingo's control) to warning.
3. **Detect early**: inline validation, preview, dry run.
4. **Make recoverable**: undo, trash, soft delete, versions. Better than a confirmation dialog,
   which becomes an automatic click.
5. **Self-diagnosis**: an error with its cause, the next action and a code; activity history the
   user can see ("who changed this?").
6. **Self-service**: contextual help, empty states that teach, a status page.
7. **Support with context**: the ticket arrives with the request id, the error code, the last
   action and the plan.

## Primitives in this template

Use these first; a missing one is added where it belongs, with tests, not improvised in a screen.

| Need | Already here | Not yet (comes with its phase) |
| --- | --- | --- |
| Validation | Zod contracts shared by API and web (`@repo/contracts`); `validation_failed` lists each field; `Field` shows an error read by screen readers | |
| Errors | RFC 9457 problems with a stable `code` and the `requestId` (also `X-Request-Id`); web `ApiError` by kind; texts per code in the i18n dictionaries; `/login?error=<code>` for OAuth flows | A standard error component with code, explanation and action |
| Auth | Confirmed email, reset links that expire in 1 hour and work once, MFA with backup codes, the same answer for known and unknown emails, rate limits (429), `requireActor` → 401 | |
| Email | Localized templates; a failed send is logged and never blocks the flow | |
| Repetition | Rate limits | Idempotency keys, double-submit protection |
| Recovery | | Soft delete with trash; an activity log the user can see |
| Billing | | Self-service billing portal |
| Invitations | | Pending, expired and resend states (Phase 6.5) |
| Import | | Preview and a report of rejected rows |
| Operation | Health routes | Status page; admin impersonation |

## Guardrails

- **Security first.** A response that changes authentication or authorization (for example magic
  links or passkeys to eliminate "forgot password") goes through the threat model and an ADR:
  ADR 0020 left those plugins out.
- **Over-guarding is a failure too.** Extra confirmations, locks and steps generate complaints.
  Match the defense to the severity.
- **Measure when there is support.** The main metric is the contact rate (tickets per active user,
  per journey). Tag each ticket with its journey and failure mode, and feed the top modes back into
  step 2.
