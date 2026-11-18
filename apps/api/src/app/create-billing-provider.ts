import type { BillingConfig } from '#config/env'
import { AsaasBillingProvider } from '#libs/adapters/asaas-billing-provider'
import { FakeBillingProvider } from '#libs/adapters/fake-billing-provider'
import type { BillingProvider, NoticeSource } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { Timer } from '#libs/ports/timer.port'

export type BillingProviderDeps = {
  clock: Clock
  ids: IdGenerator
  /** `pnpm dev` only: the fake completes each checkout by itself, so the screens can be tried by hand. */
  autoComplete?: { afterMs: number; timer: Timer } | undefined
}

/**
 * The adapter the configuration picks (ADR 0063), as email's is picked (ADR 0021): the provider whose
 * key is set, or the fake when none is, which env validation refuses behind https. The API's process
 * and the job worker's must share one instance: the fake keeps its state in memory.
 */
export function createBillingProvider(
  config: BillingConfig,
  { clock, ids, autoComplete }: BillingProviderDeps
): BillingProvider & Partial<NoticeSource> {
  if (config.kind === 'asaas') return new AsaasBillingProvider({ ...config, clock })
  return new FakeBillingProvider({ clock, ids, token: config.token, autoComplete })
}
