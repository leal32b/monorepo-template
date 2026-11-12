import { Button } from '@repo/ui'
import { useParams } from '@solidjs/router'
import { Show, Suspense } from 'solid-js'
import { publicOrganizationQuery } from '#entities/public-organizations'
import { RegistrationForm } from '#features/customers/register-as-customer'
import { createRead, failureOf, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert, ReadFailure } from '#shared/ui'
import { EntryLayout, EntrySkeleton } from '#widgets/entry-layout'

/**
 * `/p/:orgSlug`, a tenant's public page, for a visitor with no account (ADR 0060): the organization's name
 * where the app's name usually is, and the form to become its customer. It never asks for the session.
 * The organization is read through its query, which the route starts as it opens (ADR 0038); while it
 * comes, the entry skeleton holds the frame, with a place for the name. An address no organization has
 * says so, with nothing of the app to go to; any other failure says why, with the way to read again.
 */
export function PublicOrganizationPage() {
  const params = useParams<{ orgSlug: string }>()

  return (
    <Show when={params.orgSlug} keyed>
      {(slug) => <PublicOrganizationScreen slug={slug} />}
    </Show>
  )
}

/** The public page of one organization. */
function PublicOrganizationScreen(props: { slug: string }) {
  const api = useApi()
  const { t } = useI18n()
  const read = publicOrganizationQuery(api)

  /** The page once the organization is read. */
  function Profile() {
    const organization = createRead(() => read(props.slug), read.keyFor(props.slug))
    return (
      <Show when={organization()}>
        {(current) => (
          <EntryLayout brand={current().name} title={t('publicPage.title')} description={t('publicPage.description')}>
            <RegistrationForm organization={current()} />
          </EntryLayout>
        )}
      </Show>
    )
  }

  /** What the API would not say about the organization: no such address, or why it could not answer. */
  const refused = (error: unknown, retry: () => void) => {
    const failure = failureOf(error)
    return (
      <Show
        when={failure.status !== 404}
        fallback={
          <EntryLayout
            brand={t('app.name')}
            title={t('publicPage.notFound.title')}
            description={t('publicPage.notFound.description')}
          />
        }
      >
        <EntryLayout brand={t('app.name')} title={t('publicPage.unavailable')}>
          <AuthFailureAlert failure={failure} action={<Button onClick={retry}>{t('actions.retry')}</Button>} />
        </EntryLayout>
      </Show>
    )
  }

  return (
    <ReadFailure fallback={refused}>
      <Suspense fallback={<EntrySkeleton brand="pending" />}>
        <Profile />
      </Suspense>
    </ReadFailure>
  )
}
