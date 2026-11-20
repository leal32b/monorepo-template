import { backOfficeProblems, type PlanKey } from '@repo/contracts'
import { Avatar, Button, ListRow, ListSection } from '@repo/ui'
import { useNavigate, useParams } from '@solidjs/router'
import { createSignal, For, Show } from 'solid-js'
import { startImpersonation, useImpersonation } from '#entities/impersonations'
import { backOfficeOrganizationQuery, StatusBadge } from '#entities/operators'
import { useRoleLabel } from '#entities/organizations'
import { ApiError, createRead, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'
import { BackOfficeScreen } from '#widgets/back-office-frame'

/**
 * `/admin/organizations/:organizationId`: one organization's state and members, and the way in, as its owner
 * sees it, read only (ADR 0077). Entering opens the organization's start; its activity log records it.
 */
export function BackOfficeOrganizationPage() {
  const { t } = useI18n()
  return (
    <BackOfficeScreen
      title={t('backOffice.organization.title')}
      unavailable={t('backOffice.organization.unavailable')}
      failure={(error) =>
        error instanceof ApiError && error.status === 404 ? (
          <p class="text-muted-foreground">{t('backOffice.organization.notFound')}</p>
        ) : undefined
      }
    >
      <Organization />
    </BackOfficeScreen>
  )
}

function Organization() {
  const { t, locale } = useI18n()
  const api = useApi()
  const navigate = useNavigate()
  const params = useParams<{ organizationId: string }>()
  const query = backOfficeOrganizationQuery(api)
  const organization = createRead(
    () => query(params.organizationId),
    () => query.keyFor(params.organizationId)
  )
  const impersonation = useImpersonation()
  const roleLabel = useRoleLabel()
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<string>()

  const enter = (organizationId: string) => {
    setPending(true)
    setError(undefined)
    startImpersonation(api, organizationId).then(
      (visit) => {
        impersonation.set(visit)
        navigate(`/${visit.organization.slug}`)
      },
      (failure: unknown) => {
        setPending(false)
        const active = failure instanceof ApiError && failure.problem?.code === backOfficeProblems.impersonationActive
        setError(t(active ? 'backOffice.organization.enter.active' : 'backOffice.organization.enter.failed'))
      }
    )
  }

  return (
    <Show when={organization()}>
      {(found) => (
        <div class="flex flex-col gap-6">
          <ListSection title={found().name} description={t('backOffice.organization.state.description')}>
            <ListRow
              avatar={<Avatar name={found().name} shape="square" />}
              title={t('backOffice.organization.state.plan')}
              badge={<StatusBadge subscription={found().subscription} />}
              description={
                found().subscription.plan === null
                  ? t('backOffice.organization.state.noPlan')
                  : t(`billing.plans.${found().subscription.plan as PlanKey}`)
              }
            />
            <ListRow icon="globe" title={t('backOffice.organization.state.address')} description={`/${found().slug}`} />
            <ListRow
              icon="clock"
              title={t('backOffice.organization.state.created')}
              description={formatDate(new Date(found().createdAt), locale())}
            />
            <ListRow
              icon="preferences"
              title={t('backOffice.organization.state.settings')}
              description={`${found().timeZone.replaceAll('_', ' ')} · ${found().currency}`}
            />
          </ListSection>
          <ListSection title={t('backOffice.organization.enter.section')}>
            <ListRow
              icon="key"
              title={t('backOffice.organization.enter.title')}
              description={t('backOffice.organization.enter.description')}
              error={error()}
              action={
                <Button variant="primary" disabled={pending()} onClick={() => enter(found().id)}>
                  {t('backOffice.organization.enter.go')}
                </Button>
              }
            />
          </ListSection>
          <ListSection
            title={t('backOffice.organization.members.title')}
            description={t('backOffice.organization.members.description')}
          >
            <For each={found().members}>
              {(member) => (
                <ListRow
                  avatar={<Avatar name={member.name} />}
                  title={member.name}
                  description={`${member.email} · ${t('backOffice.organization.members.joined', {
                    role: member.role
                      .split(',')
                      .map((role) => roleLabel(role.trim()))
                      .join(', '),
                    date: formatDate(new Date(member.joinedAt), locale())
                  })}`}
                />
              )}
            </For>
          </ListSection>
        </div>
      )}
    </Show>
  )
}
