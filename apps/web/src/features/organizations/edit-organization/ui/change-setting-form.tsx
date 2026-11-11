import { Button, FormActions, SelectField } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { currencyOptions, type Organization, timeZoneOptions } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

/** The settings of ADR 0053 this form changes, one at a time. */
export type Setting = 'timeZone' | 'currency'

export type ChangeSettingFormProps = {
  organization: Organization
  setting: Setting
  /** Called with the new value once it is saved, to say so where the user acted. */
  onSaved: (value: string) => void
  /** Closes the form: from its Cancel button, or when the value was not changed. */
  onCancel: () => void
}

/** What the API answers when the role no longer allows it, or it refuses a value, and the text for each. */
const refusals = {
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION: 'organizations.errors.notAllowed',
  INVALID_TIME_ZONE: 'organizations.errors.invalidTimeZone',
  INVALID_CURRENCY: 'organizations.errors.invalidCurrency'
} as const

/**
 * Changes the organization's time zone or currency (ADR 0053), one select from the list with a line on
 * what the change does to what is already saved. The button waits while the request is on its way; the
 * value it already has just closes the form, since there is nothing to save.
 */
export function ChangeSettingForm(props: ChangeSettingFormProps) {
  const auth = useAuth()
  const { t, locale } = useI18n()
  const [value, setValue] = createSignal<string>(props.organization[props.setting])
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)

  const options = () =>
    props.setting === 'timeZone' ? timeZoneOptions(props.organization.timeZone) : currencyOptions(locale())

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    setFailure(undefined)
    if (value() === props.organization[props.setting]) return props.onCancel()

    setPending(true)
    const failed = await callAuth((options) =>
      auth.organization.update({ organizationId: props.organization.id, data: { [props.setting]: value() } }, options)
    )
    setPending(false)
    if (failed === undefined) props.onSaved(value())
    else setFailure(failed)
  }

  const message = (code: string | undefined) =>
    code !== undefined && Object.hasOwn(refusals, code) ? t(refusals[code as keyof typeof refusals]) : undefined

  return (
    <form noValidate onSubmit={submit} class="flex flex-col gap-4">
      <SelectField
        label={t(`organizationGeneral.regional.${props.setting}.label`)}
        name={props.setting}
        description={t(`organizationGeneral.regional.${props.setting}.hint`)}
        options={options()}
        value={value()}
        onChange={setValue}
      />
      <FormActions>
        <Button type="submit" variant="primary" disabled={pending()}>
          {t(`organizationGeneral.regional.${props.setting}.save`)}
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </FormActions>
      <Show when={failure()}>
        {(current) => <AuthFailureAlert failure={current()} message={message(current().code)} />}
      </Show>
    </form>
  )
}
