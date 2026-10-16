---
name: write-adr
description: >-
  Writes a new architecture decision record in docs/adr/ from the template and updates the index.
  Use when a technology, boundary or convention is chosen or changed.
---

# Write an ADR

1. Find the next number in `docs/adr/README.md`.
2. Copy `docs/adr/template.md` to `docs/adr/NNNN-kebab-title.md`. Title in the imperative.
3. Fill every section: real options (at least two), decision drivers, consequences both good and
   bad, and a concrete "Revisit when" signal.
4. Add the row to the index in `docs/adr/README.md`.
5. Never edit an accepted ADR; supersede it with a new one and link both ways.
6. Link the ADR from the config or code it justifies.

Flag in chat when the decision deserves Opus before writing it (auth, tenancy, database, deploy).
