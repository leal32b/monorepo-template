import { logoLimits, type OrganizationLogo } from '@repo/contracts'
import { Avatar, Button, FileButton, ListRow, useRowNote } from '@repo/ui'
import { createSignal, type JSX, Show } from 'solid-js'
import { removeLogo, useOrganization } from '#entities/organizations'
import { usePlanRefusal } from '#entities/subscriptions'
import { callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatSize } from '#shared/lib'
import { uploadLogo } from '../model/upload-logo'

export type LogoRowProps = {
  organizationId: string
  /** Its first letter stands in for a logo, as everywhere the organization is drawn. */
  name: string
  logo: OrganizationLogo | null
  /** Whoever may update the organization may change its logo; anyone else sees it. */
  canUpdate: boolean
  /** While the organization is read only, a new logo waits, with the reason in the row; removing stays open. */
  readOnly: boolean
  /** While another panel of the screen is open, the row's actions wait. */
  disabled?: boolean | undefined
}

/**
 * The organization's logo (ADR 0076), one row of its details: the logo as the side menu draws it, what a
 * logo may be, and the buttons to upload, replace and remove it. A file of the wrong type or size is refused
 * at once, before anything is sent; the API's word on the bytes, a failed upload and success each say so in
 * the row. The membership read carries the logo: it is asked for again behind the screen, as after a change
 * of plan, and the row and the side menu draw the answer.
 */
export function LogoRow(props: LogoRowProps) {
  const api = useApi()
  const { t, locale } = useI18n()
  const refusal = usePlanRefusal()
  const [pending, setPending] = createSignal(false)
  const [status, setStatus] = createSignal<string>()
  const current = useOrganization()
  const waits = () => pending() || props.disabled === true

  const choose = async (file: File) => {
    const replacing = props.logo !== null
    setStatus(undefined)
    setPending(true)
    const result = await uploadLogo(api, props.organizationId, file)
    setPending(false)
    if ('logo' in result) {
      void current.refresh()
      return setStatus(
        t(replacing ? 'organizationGeneral.details.logo.replaced' : 'organizationGeneral.details.logo.saved')
      )
    }
    setStatus(
      result.failure === 'readOnly'
        ? refusal.readOnlyNote()
        : t(`organizationGeneral.details.logo.${result.failure}`, { size: formatSize(file.size, locale()) })
    )
  }

  const remove = async () => {
    setStatus(undefined)
    setPending(true)
    const failed = await callApi(() => removeLogo(api, props.organizationId))
    setPending(false)
    if (failed !== undefined) return setStatus(t('organizationGeneral.details.logo.removeFailed'))
    void current.refresh()
    setStatus(t('organizationGeneral.details.logo.removed'))
  }

  return (
    <ListRow
      avatar={<Avatar name={props.name} src={props.logo?.url} shape="square" />}
      title={t('organizationGeneral.details.logo.title')}
      description={t(
        props.logo === null ? 'organizationGeneral.details.logo.none' : 'organizationGeneral.details.logo.set'
      )}
      note={props.canUpdate && props.readOnly ? refusal.readOnlyNote() : undefined}
      status={status()}
      action={
        <Show when={props.canUpdate}>
          <ChooseButton waiting={waits()} readOnly={props.readOnly} onSelect={choose}>
            {t(
              props.logo === null
                ? 'organizationGeneral.details.logo.upload'
                : 'organizationGeneral.details.logo.replace'
            )}
          </ChooseButton>
          <Show when={props.logo !== null}>
            <Button variant="outline" disabled={waits()} onClick={remove}>
              {t('organizationGeneral.details.logo.remove')}
            </Button>
          </Show>
        </Show>
      }
    />
  )
}

/** The button that picks a file: disabled while it waits and, read only, pointing to the row's note, which says why. */
function ChooseButton(props: {
  waiting: boolean
  readOnly: boolean
  onSelect: (file: File) => void
  children: JSX.Element
}) {
  const note = useRowNote()
  return (
    <FileButton
      variant="secondary"
      accept={logoLimits.types.join(',')}
      disabled={props.waiting || props.readOnly}
      aria-describedby={props.readOnly ? note() : undefined}
      onSelect={props.onSelect}
    >
      {props.children}
    </FileButton>
  )
}
