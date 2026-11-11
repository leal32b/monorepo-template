# 0054. Name the row family for lists, not for settings

- Status: accepted
- Date: 2026-11-11

## Context and problem statement

`@repo/ui` drew every list of things you act on with `SettingsSection`, `SettingsRow`, `SettingsPanel` and
`SettingsSkeleton`. The customers screen ([ADR 0044](0044-build-customers-as-the-reference-vertical-module.md)),
the members, invitations and roles screens already use them for records, not for settings. The names say
"settings", so the next module of a product would either copy them under a doubt about whether they fit, or
write a second family of its own. Is a list of records the same idea as a settings list?

## Decision drivers

- One idea has one presentation ([`design-system` skill](../../.claude/skills/design-system/SKILL.md)).
- A row of a record and a row of a setting carry the same things: a mark, a title with a state, a line, a
  note, a status, actions at the end, and a form that opens inline below.
- The rename should cost nothing at runtime and be mechanical to review.

## Considered options

1. Keep `Settings*` and use it for records too: no work, but the name misleads and invites a second family.
2. Add a data list component beside it for records: two components that share every behaviour (inline
   panels, one open at a time, status that takes focus, container-driven layout) and differ in a word.
3. Rename the family to `List*` and keep one set of components for both.

## Decision outcome

Chosen option: "3", because a list of records and a list of settings are the same idea: a titled, bordered
group of rows, each with its own actions and inline forms. `SettingsSection`, `SettingsRow`, `SettingsPanel`
and `SettingsSkeleton` become `ListSection`, `ListRow`, `ListPanel` and `ListSkeleton`, in `packages/ui/src/list/`.
`PanelButton` and `createPanels` keep their names. Where a screen needs the same idea with a difference, the
difference is a prop, as the skill already says.

A table (columns, sorting) is a different idea and arrives with a screen that needs one; it is not this
family.

### Consequences

- Good: the next module has one obvious list; `AGENTS.md`'s "markup copied between screens" no longer
  applies to the customers page.
- Good: nothing changes at runtime; only names and the folder.
- Bad: the accepted ADRs that mention `Settings*` (for example [0035](0035-show-the-server-working-with-one-progress-bar.md))
  keep the old names; read them with this record.

## Revisit when

A screen needs columns, sorting or selection across rows: that is a table, and this family should not grow
into one.
