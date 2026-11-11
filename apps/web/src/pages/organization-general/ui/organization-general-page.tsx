import { createPanels, PanelButton, SettingsPanel, SettingsRow, SettingsSection } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { batch, createSignal, Show } from 'solid-js'
import { currencyName, timeZoneLabel, useOrganization, useOrganizations } from '#entities/organizations'
import { DeleteOrganizationForm } from '#features/organizations/delete-organization'
import {
  ChangeAddressForm,
  ChangeSettingForm,
  RenameOrganizationForm,
  type Setting
} from '#features/organizations/edit-organization'
import { useI18n } from '#shared/config'
import { formatDateTime, formatMoney } from '#shared/lib'
import { AppShell } from '#widgets/app-shell'

/** The amount the currency row writes, so the reader sees its symbol and its minor digits. */
const EXAMPLE_AMOUNT = 123456

/**
 * `/:orgSlug/settings/general`: the organization's name and address, its time zone and currency (ADR
 * 0053, each shown as it reads: the time there now, an amount in it), and deleting it. What each role
 * may do comes from the permissions the API resolved (ADR 0033): whoever may update sees the buttons to
 * rename and to change the address, whoever may delete sees the deletion, and anyone else sees the
 * details and why they cannot change them. A form opens inline below its row, one at a time. A new
 * address moves the page to it; a deleted organization leaves for `/`, which opens another or onboarding.
 */
export function OrganizationGeneralPage() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const current = useOrganization()
  const { update, refetch } = useOrganizations()
  const panels = createPanels<'name' | 'address' | Setting | 'delete'>()
  const [nameStatus, setNameStatus] = createSignal<string>()
  const [addressStatus, setAddressStatus] = createSignal<string>()
  const [settingStatus, setSettingStatus] = createSignal<{ setting: Setting; text: string }>()

  const organization = () => current.organization
  const canUpdate = () => current.can('organization', 'update')

  const settingDescription = (setting: Setting) => {
    const { timeZone, currency } = organization()
    return setting === 'timeZone'
      ? t('organizationGeneral.regional.timeZone.now', {
          zone: timeZoneLabel(timeZone),
          time: formatDateTime(new Date(), timeZone, locale())
        })
      : t('organizationGeneral.regional.currency.example', {
          currency: currencyName(currency, locale()),
          amount: formatMoney({ amount: EXAMPLE_AMOUNT, currency }, locale())
        })
  }

  /** A row of the time and money section: its value as it reads, and the form that changes it. */
  const SettingRow = (props: { setting: Setting; icon: 'clock' | 'coins' }) => (
    <SettingsRow
      icon={props.icon}
      title={t(`organizationGeneral.regional.${props.setting}.title`)}
      description={settingDescription(props.setting)}
      status={settingStatus()?.setting === props.setting ? settingStatus()?.text : undefined}
      action={
        <Show when={canUpdate()}>
          <PanelButton panels={panels} panel={props.setting} onOpen={() => setSettingStatus(undefined)}>
            {t(`organizationGeneral.regional.${props.setting}.change`)}
          </PanelButton>
        </Show>
      }
      panel={
        <Show when={panels.isOpen(props.setting)}>
          <SettingsPanel label={t(`organizationGeneral.regional.${props.setting}.change`)}>
            <ChangeSettingForm
              organization={organization()}
              setting={props.setting}
              onSaved={(value) => {
                update({ ...organization(), [props.setting]: value })
                setSettingStatus({
                  setting: props.setting,
                  text: t(`organizationGeneral.regional.${props.setting}.saved`)
                })
                panels.close()
              }}
              onCancel={panels.close}
            />
          </SettingsPanel>
        </Show>
      }
    />
  )

  return (
    <AppShell title={t('organizationGeneral.title')}>
      <SettingsSection
        title={t('organizationGeneral.details.title')}
        description={t(
          canUpdate() ? 'organizationGeneral.details.description' : 'organizationGeneral.details.readOnly'
        )}
      >
        <SettingsRow
          icon="organization"
          title={t('organizationGeneral.details.name.title')}
          description={organization().name}
          status={nameStatus()}
          action={
            <Show when={canUpdate()}>
              <PanelButton panels={panels} panel="name" onOpen={() => setNameStatus(undefined)}>
                {t('organizationGeneral.details.name.change')}
              </PanelButton>
            </Show>
          }
          panel={
            <Show when={panels.isOpen('name')}>
              <SettingsPanel label={t('organizationGeneral.details.name.change')}>
                <RenameOrganizationForm
                  organization={organization()}
                  onSaved={(name) => {
                    update({ ...organization(), name })
                    setNameStatus(t('organizationGeneral.details.name.saved'))
                    panels.close()
                  }}
                  onCancel={panels.close}
                />
              </SettingsPanel>
            </Show>
          }
        />
        <SettingsRow
          icon="globe"
          title={t('organizationGeneral.details.address.title')}
          description={`/${organization().slug}`}
          status={addressStatus()}
          action={
            <Show when={canUpdate()}>
              <PanelButton panels={panels} panel="address" onOpen={() => setAddressStatus(undefined)}>
                {t('organizationGeneral.details.address.change')}
              </PanelButton>
            </Show>
          }
          panel={
            <Show when={panels.isOpen('address')}>
              <SettingsPanel label={t('organizationGeneral.details.address.change')}>
                <ChangeAddressForm
                  organization={organization()}
                  onSaved={(slug) => {
                    // Together, so no screen sees the new list under the old address, or the reverse.
                    batch(() => {
                      update({ ...organization(), slug })
                      navigate(`/${slug}/settings/general`, { replace: true })
                    })
                    setAddressStatus(t('organizationGeneral.details.address.saved'))
                    panels.close()
                  }}
                  onCancel={panels.close}
                />
              </SettingsPanel>
            </Show>
          }
        />
      </SettingsSection>
      <SettingsSection
        title={t('organizationGeneral.regional.title')}
        description={t(
          canUpdate() ? 'organizationGeneral.regional.description' : 'organizationGeneral.regional.readOnly'
        )}
      >
        <SettingRow setting="timeZone" icon="clock" />
        <SettingRow setting="currency" icon="coins" />
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
              <PanelButton panels={panels} panel="delete">
                {t('organizationGeneral.delete.open')}
              </PanelButton>
            }
            panel={
              <Show when={panels.isOpen('delete')}>
                <SettingsPanel label={t('organizationGeneral.delete.open')}>
                  <DeleteOrganizationForm
                    organization={organization()}
                    onDeleted={() => {
                      // Leave first, then read the list again: it no longer has this organization, so
                      // `/` opens another or onboarding. The shell waits (a skeleton) in between.
                      navigate('/', { replace: true })
                      refetch()
                    }}
                    onCancel={panels.close}
                  />
                </SettingsPanel>
              </Show>
            }
          />
        </SettingsSection>
      </Show>
    </AppShell>
  )
}
