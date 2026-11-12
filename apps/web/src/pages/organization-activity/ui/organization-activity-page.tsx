import type { AuditEntry, AuditEntryPage } from '@repo/contracts'
import { Avatar, EmptyState, ListRow, ListSection, Pager } from '@repo/ui'
import { createSignal, For, Show } from 'solid-js'
import { auditEntriesQuery } from '#entities/audit-entries'
import { useOrganization } from '#entities/organizations'
import { createRead, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDateTime } from '#shared/lib'
import { ReadFailure } from '#shared/ui'
import { AppShell } from '#widgets/app-shell'

/**
 * `/:orgSlug/settings/activity`: the organization's audit trail (ADR 0061), read only, for whoever holds
 * `audit:read`. Newest first, a page at a time; each row says who, what and when, in the organization's
 * time zone. An entry keeps no value, so a row names the kind of record and the fields, never the record.
 */
export function OrganizationActivityPage() {
  const { t } = useI18n()
  const current = useOrganization()

  return (
    <AppShell title={t('activity.title')}>
      <Show
        when={current.can('audit', 'read')}
        fallback={
          <EmptyState
            icon="activity"
            title={t('activity.noAccess.title')}
            description={t('activity.noAccess.description', { name: current.organization.name })}
          />
        }
      >
        <ReadFailure message={t('activity.unavailable')}>
          <Activity />
        </ReadFailure>
      </Show>
    </AppShell>
  )
}

/** The fields each kind of record has words for; another field is shown by its code. */
const fieldsWithWords = { customer: ['name', 'email', 'phone', 'company', 'notes'] } as const

function Activity() {
  const { t, locale } = useI18n()
  const api = useApi()
  const current = useOrganization()
  const id = current.organization.id
  const entries = auditEntriesQuery(api)
  /** Where each page seen so far starts: `''` for the newest, then each page's `next`. */
  const [starts, setStarts] = createSignal([''])
  const before = () => starts().at(-1) as string

  const key = () => entries.keyFor(id, before())
  const page = createRead(() => entries(id, before()), key)

  const who = (entry: AuditEntry) => {
    const { actor } = entry
    if (actor.kind === 'member') return actor.name ?? t('activity.actors.formerMember')
    return t(`activity.actors.${actor.kind}`)
  }
  const avatarOf = (entry: AuditEntry) => {
    const { actor } = entry
    if (actor.kind === 'member') return actor.name === null ? <Avatar icon="profile" /> : <Avatar name={actor.name} />
    return <Avatar icon={actor.kind === 'visitor' ? 'globe' : 'clock'} />
  }
  const fieldName = (entry: AuditEntry, field: string) => {
    const known = fieldsWithWords[entry.resource.type] as readonly string[]
    return known.includes(field)
      ? t(`activity.fields.${entry.resource.type}.${field as (typeof fieldsWithWords)['customer'][number]}`)
      : field
  }
  const what = (entry: AuditEntry) => {
    const done = t(`activity.entries.${entry.resource.type}.${entry.action}`)
    if (entry.fields.length === 0) return done
    return t('activity.changed', {
      what: done,
      fields: entry.fields.map((field) => fieldName(entry, field)).join(', ')
    })
  }
  const when = (entry: AuditEntry) => formatDateTime(new Date(entry.at), current.organization.timeZone, locale())

  return (
    <Show when={page()}>
      {(loaded: () => AuditEntryPage) => (
        <div class="flex flex-col gap-6">
          <ListSection
            title={t('activity.section.title')}
            description={t('activity.section.description', { name: current.organization.name })}
          >
            <Show
              when={loaded().items.length > 0}
              fallback={
                <EmptyState
                  icon="activity"
                  title={t('activity.empty.title')}
                  description={t('activity.empty.description')}
                />
              }
            >
              <For each={loaded().items}>
                {(entry) => (
                  <ListRow
                    avatar={avatarOf(entry)}
                    title={who(entry)}
                    description={`${what(entry)} · ${when(entry)}`}
                  />
                )}
              </For>
            </Show>
          </ListSection>
          <Show when={starts().length > 1 || loaded().next !== null}>
            <Pager
              label={t('activity.pager.label')}
              previousLabel={t('activity.pager.previous')}
              nextLabel={t('activity.pager.next')}
              summary={t('activity.pager.page', { page: starts().length })}
              hasPrevious={starts().length > 1}
              // While the next page comes, the one drawn is the page before it: its `next` is where we are.
              hasNext={loaded().next !== null && loaded().next !== before()}
              onPrevious={() => setStarts(starts().slice(0, -1))}
              onNext={() => setStarts([...starts(), loaded().next as string])}
            />
          </Show>
        </div>
      )}
    </Show>
  )
}
