# 0006. API architecture: use-case slices, ports and a composition root

- Status: accepted
- Date: 2026-10-17

## Context and problem statement

The API will grow module by module (identity, tenants, product features). Without a shared shape,
business rules leak into controllers, tests need a database and a clock, and every module invents
its own way to fail. Which architecture, and how strictly?

## Decision drivers

- A reviewer finds any use case, its HTTP edge and its dependencies by folder name alone.
- Business rules are deterministic and testable without a database, a clock or a network.
- Reading never changes state; every write is an explicit command.
- Boundaries are enforced by gates ([ADR 0008](0008-architecture-boundaries-with-dependency-cruiser.md)),
  not by convention.
- No ceremony without a payoff.

## Considered options

1. Follow the full domain-driven-hexagon reference: command/query buses, `Entity` and
   `AggregateRoot` base classes, a DI container.
2. Adopt its structure and dependency rules with plain classes wired by hand and a functional
   domain.
3. One service per module, no layering.

## Decision outcome

Chosen option 2.

**Layout** (`apps/api/src/`):

| Folder | Holds | May depend on |
| --- | --- | --- |
| `modules/<name>/domain/` | Rules as pure functions, errors, event types | other modules' `index.ts`, `libs/exceptions` |
| `modules/<name>/{queries,commands}/<use-case>/` | `<uc>.service.ts` (`execute()`), `<uc>.http-controller.ts` | domain, ports (`*.port.ts`) |
| `modules/<name>/{database,infrastructure}/` | Adapters behind a port | domain, `libs` |
| `modules/<name>/index.ts` | The module's public surface (rules and port types) | domain, `*.port.ts` |
| `libs/` | Generic infrastructure: `ports`, `adapters`, `http`, `exceptions` | nothing from `modules/` or `app/` |
| `config/` | Environment validated with Zod | |
| `app/` | Composition root, route registration, shutdown | everything |
| `main.ts` | Entry point: side effects only, outside coverage | `app/`, `config/` |

Rules:

- **Composition root.** `app/create-app.ts` is the only place that instantiates concrete
  classes. It receives `Clock` and `Logger` from outside (`main.ts` picks the real ones, tests
  inject fakes). There is no container and no object a controller can pull dependencies from.
- **CQS.** `GET` handlers run queries, which never write.
- **Ports for time and ids.** `Clock` and `IdGenerator` are injected; the domain receives "now"
  and new ids as values.
- **Expected failures** are `libs/exceptions` classes in three families (`NotFound` 404,
  `ArgumentInvalid` 400, `Conflict` 409) with a stable `code`; the HTTP pipeline maps them
  ([ADR 0007](0007-http-pipeline-on-node-http.md)). Anything else is a bug and a 500.
- **No `Entity`/`AggregateRoot` base classes**: functions over plain data are what unit and
  property tests exercise directly.
- **Build for production** (how workspace packages and TypeScript reach `node`) is decided in the
  deploy phase.

### Consequences

- Good: each use case is a folder with its service, its HTTP edge and its tests; services are
  unit-testable with fakes of their ports.
- Good: a wrong dependency direction fails CI with the name of the rule.
- Bad: more files per use case than a small app needs; hand wiring grows with the use cases.

## Revisit when

The composition root passes ~50 use cases or needs scoped lifetimes (per request, per tenant):
then a small DI container earns its place.
