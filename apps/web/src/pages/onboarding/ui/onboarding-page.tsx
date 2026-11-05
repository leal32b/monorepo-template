import { Avatar, Button, buttonVariants, Link, SettingsRow, SettingsSection } from '@repo/ui'
import { A, useNavigate } from '@solidjs/router'
import { For, Match, Show, Suspense, Switch } from 'solid-js'
import { rememberOrganization, useOrganizations, userInvitationsQuery } from '#entities/organizations'
import { CreateOrganizationForm } from '#features/organizations/create-organization'
import { createRead, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'
import { ReadFailure } from '#shared/ui'
import { EntryLayout, EntrySkeleton } from '#widgets/entry-layout'

/**
 * `/onboarding`: where a signed-in user without an organization lands (ADR 0033, D4), and where one
 * who has some creates another (the switcher's "Create organization"), with the way back to the app.
 * Invitations come first, the expired ones left out, because an invited user who names an organization
 * here ends up with a stray empty one; each opens its own page, `/invitations/:id`, the one place an
 * invitation is answered, and the one-field form below them. Asked for from the switcher, the screen
 * is "Create an organization", the form first and any invitations after it. Nothing is said until the
 * invitations are read, and if they cannot be, the screen offers to try again rather than a form.
 * Creating goes to the start (`/`), which opens the new organization once the list is read again.
 * The invitations are read through their query, which the route starts (ADR 0038).
 */
export function OnboardingPage() {
  const { t } = useI18n()

  return (
    <ReadFailure
      fallback={(_, retry) => (
        <EntryLayout title={t('onboarding.unavailable.title')} description={t('onboarding.unavailable.description')}>
          <Button variant="primary" class="w-full" onClick={retry}>
            {t('actions.retry')}
          </Button>
        </EntryLayout>
      )}
    >
      <Suspense fallback={<EntrySkeleton />}>
        <Onboarding />
      </Suspense>
    </ReadFailure>
  )
}

/** The screen once the invitations are read. */
function Onboarding() {
  const auth = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const organizations = useOrganizations()
  const read = userInvitationsQuery(auth)
  const invitations = createRead(() => read(), read.keyFor())

  /** Whether the user already has an organization: this is then a second one, not the first. */
  const another = () => organizations.list.state === 'ready' && organizations.list().length > 0
  const back = () => (
    <Show when={another()}>
      <Link href="/">{t('appShell.nav.back')}</Link>
    </Show>
  )

  const form = (
    <CreateOrganizationForm
      onCreated={(slug) => {
        rememberOrganization(slug)
        organizations.refetch()
        navigate('/', { replace: true })
      }}
    />
  )

  return (
    <Show when={invitations()}>
      {(open) => {
        const list = (
          <SettingsSection title={t('onboarding.invited.invitations')}>
            <For each={open()}>
              {(invitation) => (
                <SettingsRow
                  avatar={<Avatar name={invitation.organizationName} shape="square" />}
                  title={invitation.organizationName}
                  description={t('invitations.expires', { date: formatDate(invitation.expiresAt, locale()) })}
                  action={
                    <A href={`/invitations/${encodeURIComponent(invitation.id)}`} class={buttonVariants()}>
                      {t('invitations.open')}
                    </A>
                  }
                />
              )}
            </For>
          </SettingsSection>
        )
        return (
          <Switch>
            {/* Asked for from the switcher: the screen is what was asked for, the invitations after it. */}
            <Match when={another()}>
              <EntryLayout
                title={t('onboarding.another.title')}
                description={t('onboarding.another.description')}
                footer={back()}
              >
                {form}
                <Show when={open().length > 0}>{list}</Show>
              </EntryLayout>
            </Match>
            <Match when={open().length > 0}>
              <EntryLayout title={t('onboarding.invited.title')} description={t('onboarding.invited.description')}>
                {list}
                <section class="flex flex-col gap-4">
                  <h2 class="text-base font-semibold">{t('onboarding.invited.own')}</h2>
                  {form}
                </section>
              </EntryLayout>
            </Match>
            <Match when={true}>
              <EntryLayout title={t('onboarding.title')} description={t('onboarding.description')}>
                {form}
              </EntryLayout>
            </Match>
          </Switch>
        )
      }}
    </Show>
  )
}
