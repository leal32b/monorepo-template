import { covers, type Permissions } from '@repo/contracts'
import { Button, Field, Select } from '@repo/ui'
import { createSignal, createUniqueId, Show } from 'solid-js'
import { type Role, useRoleLabel } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { invitationFailureKind } from '../model/invitation-failure'
import { validateInvitation } from '../model/validate-invitation'
import { InvitationFailure } from './invitation-failure'

export type InvitePeopleFormProps = {
  organizationId: string
  /** Every role the organization has, built-in and its own. */
  roles: readonly Role[]
  /** What the caller holds: a role that grants more than this cannot be given (ADR 0033). */
  held: Permissions
  /** The addresses (lower case) of people already in the organization. */
  memberEmails: ReadonlySet<string>
  /** Called with the address once the invitation is sent, to say so where the user acted. */
  onInvited: (email: string) => void
  onCancel: () => void
}

/**
 * Invites one person by email, with a role. A role that grants a permission the caller does not hold stays
 * in the list, disabled and said so, as in the member's role form; the API refuses it too. The address is
 * checked on submit, and again when the field is left after that; one already in the organization is
 * marked on the field. Inviting an address again replaces its pending invitation (D5). The button waits
 * while the request is on its way.
 */
export function InvitePeopleForm(props: InvitePeopleFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const label = useRoleLabel()
  const selectId = createUniqueId()
  const grantable = (role: Role) => covers(props.held, role.permissions)
  const first = props.roles.find((role) => role.name === 'member' && grantable(role)) ?? props.roles.find(grantable)
  const [email, setEmail] = createSignal('')
  const [role, setRole] = createSignal(first?.name ?? 'member')
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const members = new Set(props.memberEmails)
  const checks = createFormChecks(() => validateInvitation(email(), members))

  const options = () =>
    props.roles.map((candidate) => ({
      value: candidate.name,
      label: grantable(candidate)
        ? label(candidate.name)
        : t('organizationInvitations.form.locked', { role: label(candidate.name) }),
      disabled: !grantable(candidate)
    }))

  const error = () => {
    const problem = checks.problems().email
    return (
      problem &&
      (problem === 'emailInvalid' ? t('auth.errors.emailInvalid') : t('organizationInvitations.errors.alreadyMember'))
    )
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    const form = event.currentTarget
    setFailure(undefined)
    const values = checks.submit(form)
    if (values === undefined) return

    setPending(true)
    const failed = await callAuth((options) =>
      auth.organization.inviteMember(
        { organizationId: props.organizationId, email: values.email, role: role() },
        options
      )
    )
    setPending(false)

    if (failed === undefined) {
      props.onInvited(values.email)
    } else if (invitationFailureKind(failed) === 'alreadyMember') {
      members.add(values.email)
      checks.submit(form)
    } else {
      setFailure(failed)
    }
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <Field
        label={t('organizationInvitations.form.email')}
        name="email"
        type="email"
        autocomplete="off"
        value={email()}
        onChange={setEmail}
        error={error()}
      />
      <div class="flex flex-col gap-1.5">
        <label for={selectId} class="text-sm font-medium">
          {t('organizationInvitations.form.role')}
        </label>
        <Select id={selectId} options={options()} value={role()} onChange={setRole} />
        <Show when={options().some((option) => option.disabled)}>
          <p class="text-sm text-muted-foreground">{t('organizationInvitations.form.cannotGive')}</p>
        </Show>
      </div>
      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="primary" class="w-full sm:w-auto" disabled={pending()}>
          {t('organizationInvitations.form.send')}
        </Button>
        <Button variant="ghost" class="w-full sm:w-auto" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </div>
      <Show when={failure()}>{(current) => <InvitationFailure failure={current()} />}</Show>
    </form>
  )
}
