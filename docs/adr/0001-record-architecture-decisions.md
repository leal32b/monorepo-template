# 0001. Record architecture decisions as MADR files

- Status: accepted
- Date: 2026-10-16

## Context and problem statement

A template is copied and adapted by people (and agents) who were not in the room. Choices such as
"no Express" or "no task runner" look like defects unless the rationale is written next to the
code. Rationale kept in chat logs is lost and unversioned.

## Decision drivers

- A reader can tell a deliberate trade-off from an oversight.
- The record lives in the repository and changes through the same review as the code.
- Low ceremony: a record takes minutes.

## Considered options

1. Markdown ADRs in `docs/adr/` using MADR (short form).
2. A single `DECISIONS.md` log.
3. Wiki or issue tracker.

## Decision outcome

Chosen option 1: numbered files, one decision each, indexed in [`README.md`](README.md). A single
log grows into a wall of text; a wiki is not versioned with the code it explains.

### Consequences

- Good: config files and comments can link the exact record that justifies them.
- Good: superseding a decision leaves the history readable.
- Bad: records can drift from reality; the index and links from config are the guard.

## Revisit when

Records are routinely skipped or contradict the code.
