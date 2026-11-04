import { covers, type Permissions } from '@repo/contracts'
import { Button, Select } from '@repo/ui'
import { createSignal, createUniqueId, Show } from 'solid-js'
import { type Member, memberFailureKind, type Role, useRoleLabel } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

export type ChangeMemberRoleFormProps = {
  organizationId: string
  member: Member
  /** Every role the organization has, built-in and its own. */
  roles: readonly Role[]
  /** What the caller holds: a role that grants more than this cannot be given (ADR 0033). */
  held: Permissions
  /** Called with the role given, once it is saved. */
  onChanged: (role: string) => void
  /** Called when the person is no longer a member, so the list can be read again. */
  onGone: () => void
  onCancel: () => void
}

/**
 * Gives a member a role. A role that grants a permission the caller does not hold stays in the list,
 * disabled and said so, so nobody wonders where it went; the API refuses it too. A member holds one role
 * here: the choice replaces what they had. Choosing the role they already have just closes the form.
 */
export function ChangeMemberRoleForm(props: ChangeMemberRoleFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const label = useRoleLabel()
  const selectId = createUniqueId()
  const [role, setRole] = createSignal(props.member.roles[0] as string)
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)

  const options = () =>
    props.roles.map((candidate) => {
      const grantable = covers(props.held, candidate.permissions)
      return {
        value: candidate.name,
        label: grantable
          ? label(candidate.name)
          : t('organizationMembers.changeRole.locked', { role: label(candidate.name) }),
        disabled: !grantable
      }
    })

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    setFailure(undefined)
    if (props.member.roles.length === 1 && role() === props.member.roles[0]) return props.onCancel()

    setPending(true)
    const failed = await callAuth((options) =>
      auth.organization.updateMemberRole(
        { organizationId: props.organizationId, memberId: props.member.id, role: role() },
        options
      )
    )
    setPending(false)
    if (failed === undefined) props.onChanged(role())
    else if (memberFailureKind(failed) === 'gone') props.onGone()
    else setFailure(failed)
  }

  const message = (failed: AuthFailure) => {
    const kind = memberFailureKind(failed)
    return kind === undefined ? undefined : t(`organizationMembers.errors.${kind as 'notAllowed'}`)
  }

  return (
    <form noValidate onSubmit={submit} class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label for={selectId} class="text-sm font-medium">
          {t('organizationMembers.changeRole.label')}
        </label>
        <Select id={selectId} options={options()} value={role()} onChange={setRole} />
        <Show when={options().some((option) => option.disabled)}>
          <p class="text-sm text-muted-foreground">{t('organizationMembers.changeRole.cannotGive')}</p>
        </Show>
      </div>
      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="primary" class="w-full sm:w-auto" disabled={pending()}>
          {t('organizationMembers.changeRole.save')}
        </Button>
        <Button variant="ghost" class="w-full sm:w-auto" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </div>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} message={message(current())} />}</Show>
    </form>
  )
}
