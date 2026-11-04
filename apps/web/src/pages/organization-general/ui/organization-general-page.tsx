import { Button, SettingsRow, SettingsSection } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { batch, createSignal, Show } from 'solid-js'
import { useOrganization, useOrganizations } from '#entities/organizations'
import { DeleteOrganizationForm } from '#features/organizations/delete-organization'
import { ChangeAddressForm, RenameOrganizationForm } from '#features/organizations/edit-organization'
import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'
import { Panel, type PanelName } from './panel'

/**
 * `/:orgSlug/settings/general`: the organization's name and address, and deleting it. What each role
 * may do comes from the permissions the API resolved (ADR 0033): whoever may update sees the buttons to
 * rename and to change the address, whoever may delete sees the deletion, and anyone else sees the
 * details and why they cannot change them. A form opens inline below its row, one at a time. A new
 * address moves the page to it; a deleted organization leaves for `/`, which opens another or onboarding.
 */
export function OrganizationGeneralPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const current = useOrganization()
  const { update, refetch } = useOrganizations()
  const [open, setOpen] = createSignal<PanelName>()
  const [nameStatus, setNameStatus] = createSignal<string>()
  const [addressStatus, setAddressStatus] = createSignal<string>()
  let rename: HTMLButtonElement | undefined
  let address: HTMLButtonElement | undefined
  let removal: HTMLButtonElement | undefined

  const organization = () => current.organization
  const canUpdate = () => current.can('organization', 'update')
  /** Closes the form and hands focus back to the button that opened it. */
  const close = (opener: () => HTMLButtonElement | undefined) => {
    setOpen(undefined)
    queueMicrotask(() => opener()?.focus())
  }

  return (
    <AppShell title={t('organizationGeneral.title')}>
      <SettingsSection
        title={t('organizationGeneral.details.title')}
        description={t(
          canUpdate() ? 'organizationGeneral.details.description' : 'organizationGeneral.details.readOnly'
        )}
      >
        <SettingsRow
          icon="users"
          title={t('organizationGeneral.details.name.title')}
          description={organization().name}
          status={nameStatus()}
          action={
            <Show when={canUpdate() && open() !== 'name'}>
              <Button
                ref={(button) => {
                  rename = button
                }}
                disabled={open() !== undefined}
                onClick={() => {
                  setNameStatus(undefined)
                  setOpen('name')
                }}
              >
                {t('organizationGeneral.details.name.change')}
              </Button>
            </Show>
          }
          panel={
            <Show when={open() === 'name'}>
              <Panel label={t('organizationGeneral.details.name.change')}>
                <RenameOrganizationForm
                  organization={organization()}
                  onSaved={(name) => {
                    update({ ...organization(), name })
                    setNameStatus(t('organizationGeneral.details.name.saved'))
                    close(() => rename)
                  }}
                  onCancel={() => close(() => rename)}
                />
              </Panel>
            </Show>
          }
        />
        <SettingsRow
          icon="globe"
          title={t('organizationGeneral.details.address.title')}
          description={`/${organization().slug}`}
          status={addressStatus()}
          action={
            <Show when={canUpdate() && open() !== 'address'}>
              <Button
                ref={(button) => {
                  address = button
                }}
                disabled={open() !== undefined}
                onClick={() => {
                  setAddressStatus(undefined)
                  setOpen('address')
                }}
              >
                {t('organizationGeneral.details.address.change')}
              </Button>
            </Show>
          }
          panel={
            <Show when={open() === 'address'}>
              <Panel label={t('organizationGeneral.details.address.change')}>
                <ChangeAddressForm
                  organization={organization()}
                  onSaved={(slug) => {
                    // Together, so no screen sees the new list under the old address, or the reverse.
                    batch(() => {
                      update({ ...organization(), slug })
                      navigate(`/${slug}/settings/general`, { replace: true })
                    })
                    setAddressStatus(t('organizationGeneral.details.address.saved'))
                    close(() => address)
                  }}
                  onCancel={() => close(() => address)}
                />
              </Panel>
            </Show>
          }
        />
      </SettingsSection>
      <Show when={current.can('organization', 'delete')}>
        <SettingsSection
          title={t('organizationGeneral.delete.title')}
          description={t('organizationGeneral.delete.description')}
        >
          <SettingsRow
            icon="warning"
            title={t('organizationGeneral.delete.row')}
            description={t('organizationGeneral.delete.rowDescription')}
            action={
              <Show when={open() !== 'delete'}>
                <Button
                  variant="outline"
                  ref={(button) => {
                    removal = button
                  }}
                  disabled={open() !== undefined}
                  onClick={() => setOpen('delete')}
                >
                  {t('organizationGeneral.delete.open')}
                </Button>
              </Show>
            }
            panel={
              <Show when={open() === 'delete'}>
                <Panel label={t('organizationGeneral.delete.open')}>
                  <DeleteOrganizationForm
                    organization={organization()}
                    onDeleted={() => {
                      // Leave first, then read the list again: it no longer has this organization, so
                      // `/` opens another or onboarding. The shell waits (a skeleton) in between.
                      navigate('/', { replace: true })
                      refetch()
                    }}
                    onCancel={() => close(() => removal)}
                  />
                </Panel>
              </Show>
            }
          />
        </SettingsSection>
      </Show>
    </AppShell>
  )
}
