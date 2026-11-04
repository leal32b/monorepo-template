import { Button, SettingsSection } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { createResource, For, Match, Show, Switch } from 'solid-js'
import { listInvitations, rememberOrganization, useOrganizations } from '#entities/organizations'
import { InvitationRow } from '#features/organizations/answer-invitation'
import { CreateOrganizationForm } from '#features/organizations/create-organization'
import { useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { ShellSkeleton } from '#widgets/app-shell'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * `/onboarding`: where a signed-in user without an organization lands (ADR 0033, D4). Invitations come
 * first, the expired ones left out, because an invited user who names an organization here ends up
 * with a stray empty one; the one-field form is always below them, for someone who wants their own.
 * Nothing is said until the invitations are read, and if they cannot be, the screen offers to try
 * again rather than a form. Accepting or creating goes to the start (`/`), which opens the new
 * organization once the list is read again.
 */
export function OnboardingPage() {
  const auth = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const organizations = useOrganizations()
  const [invitations, { refetch, mutate }] = createResource(() => listInvitations(auth, new Date()))

  const start = () => {
    organizations.refetch()
    navigate('/', { replace: true })
  }
  const withdraw = (id: string) => mutate((open) => open?.filter((invitation) => invitation.id !== id))

  const form = (
    <CreateOrganizationForm
      onCreated={(slug) => {
        rememberOrganization(slug)
        start()
      }}
    />
  )

  return (
    <Switch fallback={<ShellSkeleton />}>
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
              <EntryLayout title={t('onboarding.title')} description={t('onboarding.description')}>
                {form}
              </EntryLayout>
            }
          >
            <EntryLayout title={t('onboarding.invited.title')} description={t('onboarding.invited.description')}>
              <SettingsSection title={t('onboarding.invited.invitations')}>
                <For each={open()}>
                  {(invitation) => (
                    <InvitationRow
                      invitation={invitation}
                      onAnswered={(answer) => (answer === 'accepted' ? start() : withdraw(invitation.id))}
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
