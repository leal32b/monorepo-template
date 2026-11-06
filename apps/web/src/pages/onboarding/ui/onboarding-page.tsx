import { Avatar, Button, buttonVariants, SettingsRow, SettingsSection } from '@repo/ui'
import { A, useNavigate } from '@solidjs/router'
import { For, Match, Show, Suspense, Switch } from 'solid-js'
import { type Invitation, rememberOrganization, useOrganizations, userInvitationsQuery } from '#entities/organizations'
import { CreateOrganizationForm } from '#features/organizations/create-organization'
import { createRead, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'
import { ReadFailure } from '#shared/ui'
import { AppShell, ShellSkeleton } from '#widgets/app-shell'
import { EntryLayout, EntrySkeleton } from '#widgets/entry-layout'

/**
 * `/onboarding`: where a signed-in user without an organization lands (ADR 0033, D4), and where one
 * who has some creates another (the switcher's "Create organization").
 *
 * For someone who has an organization it is an app screen, in the frame (ADR 0039): "Create an
 * organization", the form at once and any invitations after it once read, a failure to read them said
 * in their place; the side menu is the way back. For someone who has none it is an entry screen, as the
 * first steps are: invitations come first, the expired ones left out, because an invited user who names
 * an organization here ends up with a stray empty one; each opens its own page, `/invitations/:id`, the
 * one place an invitation is answered, and the one-field form below them. Nothing is said until the
 * invitations are read, and if they cannot be, the screen offers to try again rather than a form. Until
 * the organizations are known, the session's skeleton holds the place.
 *
 * Creating goes to the start (`/`), which opens the new organization once the list is read again. The
 * invitations are read through their query, which the route starts (ADR 0038).
 */
export function OnboardingPage() {
  const { hasOrganization } = useOrganizations()

  return (
    <Switch fallback={<ShellSkeleton />}>
      <Match when={hasOrganization() === true}>
        <Another />
      </Match>
      <Match when={hasOrganization() === false}>
        <First />
      </Match>
    </Switch>
  )
}

/** The open invitations sent to the user, read through their query. */
function useInvitations() {
  const read = userInvitationsQuery(useAuth())
  return createRead(() => read(), read.keyFor())
}

/** The form, which goes to the start once the organization is created. */
function CreateForm() {
  const navigate = useNavigate()
  const organizations = useOrganizations()

  return (
    <CreateOrganizationForm
      onCreated={(slug) => {
        rememberOrganization(slug)
        organizations.refetch()
        navigate('/', { replace: true })
      }}
    />
  )
}

/** The open invitations, each a link to its own page. */
function Invitations(props: { open: Invitation[] }) {
  const { t, locale } = useI18n()

  return (
    <SettingsSection title={t('onboarding.invited.invitations')}>
      <For each={props.open}>
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
}

/**
 * Another organization, asked for from the switcher: the screen is what was asked for, the invitations
 * after the form. They come below it, where nothing moves, with no placeholder: most people have none.
 */
function Another() {
  const { t } = useI18n()

  /** The invitations once read, when there are any. */
  function Open() {
    const invitations = useInvitations()
    return (
      <Show when={invitations()?.length}>
        <Invitations open={invitations() as Invitation[]} />
      </Show>
    )
  }

  return (
    <AppShell title={t('onboarding.another.title')} description={t('onboarding.another.description')}>
      <CreateForm />
      <ReadFailure message={t('onboarding.another.unavailable')}>
        <Suspense>
          <Open />
        </Suspense>
      </ReadFailure>
    </AppShell>
  )
}

/** The first organization: the invitations first, if any, and nothing said until they are read. */
function First() {
  const { t } = useI18n()

  /** The screen once the invitations are read. */
  function Screen() {
    const invitations = useInvitations()
    return (
      <Show when={invitations()}>
        {(open) => (
          <Show
            when={open().length > 0}
            fallback={
              <EntryLayout title={t('onboarding.title')} description={t('onboarding.description')}>
                <CreateForm />
              </EntryLayout>
            }
          >
            <EntryLayout title={t('onboarding.invited.title')} description={t('onboarding.invited.description')}>
              <Invitations open={open()} />
              <section class="flex flex-col gap-4">
                <h2 class="text-base font-semibold">{t('onboarding.invited.own')}</h2>
                <CreateForm />
              </section>
            </EntryLayout>
          </Show>
        )}
      </Show>
    )
  }

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
        <Screen />
      </Suspense>
    </ReadFailure>
  )
}
