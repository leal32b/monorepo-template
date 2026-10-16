# 0003. Postgres as the database

- Status: accepted
- Date: 2026-10-16

## Context and problem statement

The template targets multi-tenant SaaS deployed from day one on free tiers. The reference
repository uses local SQLite, which fits a local-first tool, not a hosted multi-user service.

## Decision drivers

- Works on a free managed tier, with real deploys from the start.
- Handles concurrent writers, transactions and row-level tenant scoping.
- Standard tooling and an easy path to paid scale.

## Considered options

1. Postgres (managed free tier, e.g. Neon).
2. SQLite / libSQL (e.g. Turso).
3. Keep local SQLite and defer the hosted database.

## Decision outcome

Chosen option 1. Postgres is the default for SaaS: strong transactional guarantees, mature
tooling, and every host offers it. The access library and migration tool are chosen in Phase 4
(ADR to follow). Repositories sit behind ports, with in-memory fakes for unit tests and real
Postgres for integration tests.

### Consequences

- Good: production-like from the first deploy; tenant isolation can use constraints.
- Bad: integration tests need a Postgres instance; free tiers may sleep or limit connections.

## Revisit when

A free tier stops being viable or the product turns local-first.
