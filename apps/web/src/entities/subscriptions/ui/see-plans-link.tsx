import { buttonVariants } from '@repo/ui'
import { A } from '@solidjs/router'
import { useI18n } from '#shared/config'
import { plansPath } from '../model/plans-path'

/** "See plans": the way from a refusal by the plan to the plan page, for the owner (ADR 0063). */
export function SeePlansLink(props: { slug: string }) {
  const { t } = useI18n()
  return (
    <A href={plansPath(props.slug)} class={buttonVariants({ variant: 'secondary' })}>
      {t('subscription.actions.plans')}
    </A>
  )
}
