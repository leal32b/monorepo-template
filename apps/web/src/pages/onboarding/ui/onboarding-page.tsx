import { Avatar, Button, buttonVariants, Link, SettingsRow, SettingsSection } from '@repo/ui'
import { A, useNavigate } from '@solidjs/router'
import { createResource, For, Match, Show, Switch } from 'solid-js'
import { listInvitations, rememberOrganization, useOrganizations } from '#entities/organizations'
import { CreateOrganizationForm } from '#features/organizations/create-organization'
import { useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'
import { EntryLayout, EntrySkeleton } from '#widgets/entry-layout'

/**
 * `/onboarding`: where a signed-in user without an organization lands (ADR 0033, D4), and where one
 * who has some creates another (the switcher's "Create organization"), with the way back to the app.
 * Invitations come first, the expired ones left out, because an invited user who names an organization
 * here ends up with a stray empty one; each opens its own page, `/invitations/:id`, the one place an
 * invitation is answered. The one-field form is always below them. Nothing is said until the
 * invitations are read, and if they cannot be, the screen offers to try again rather than a form.
 * Creating goes to the start (`/`), which opens the new organization once the list is read again.
 */
export function OnboardingPage() {
  const auth = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const organizations = useOrganizations()
  const [invitations, { refetch }] = createResource(() => listInvitations(auth, new Date()))

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
    <Switch fallback={<EntrySkeleton />}>
      <Match when={invitations.error}>
        <EntryLayout title={t('onboarding.unavailable.title')} description={t('onboarding.unavailable.description')}>
          <Button variant="primary" class="w-full" onClick={() => void refetch()}>
            {t('actions.retry')}
          </Button>
        </EntryLayout>
      </Match>
      <Match when={invitations.state === 'ready' && invitations()}>
        {(open) => (
          <Show
            when={open().length > 0}
            fallback={
              <EntryLayout
                title={t(another() ? 'onboarding.another.title' : 'onboarding.title')}
                description={t(another() ? 'onboarding.another.description' : 'onboarding.description')}
                footer={back()}
              >
                {form}
              </EntryLayout>
            }
          >
            <EntryLayout
              title={t('onboarding.invited.title')}
              description={t('onboarding.invited.description')}
              footer={back()}
            >
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
              <section class="flex flex-col gap-4">
                <h2 class="text-base font-semibold">{t('onboarding.invited.own')}</h2>
                {form}
              </section>
            </EntryLayout>
          </Show>
        )}
      </Match>
    </Switch>
  )
}
