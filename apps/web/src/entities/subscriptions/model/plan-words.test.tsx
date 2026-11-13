import type { Subscription } from '@repo/contracts'
import { render } from '@solidjs/testing-library'
import { I18nProvider, type Locale } from '#shared/config'
import { usePlanWords } from './plan-words'

/** The words of a plan, read in a language the way a screen reads them. */
function wordsIn(locale: Locale): ReturnType<typeof usePlanWords> {
  let words: ReturnType<typeof usePlanWords> | undefined
  render(() => (
    <I18nProvider locale={locale}>
      {(() => {
        words = usePlanWords()
        return null
      })()}
    </I18nProvider>
  ))
  return words as ReturnType<typeof usePlanWords>
}

const active: Subscription = {
  status: 'active',
  access: 'full',
  plan: 'pro',
  nextPlan: null,
  trialEndsAt: '2026-10-01T00:00:00.000Z',
  periodStartsAt: '2026-11-10T15:00:00.000Z',
  paidThrough: '2026-12-10T15:00:00.000Z',
  pastDueSince: null,
  cancelAtPeriodEnd: false,
  checkout: null
}

describe('usePlanWords', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T12:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('names a plan, and the trial while none is paid for', () => {
    const words = wordsIn('pt-BR')

    expect(words.name('basic')).toBe('Básico')
    expect(words.name(null)).toBe('Teste')
  })

  it('says a plan’s price a month in the plans’ currency', () => {
    expect(wordsIn('en').price('pro')).toBe('R$99.00 a month')
  })

  it('says what a plan includes in words, a limit with its number or none', () => {
    const words = wordsIn('en')

    expect(words.includes('basic')).toEqual(['Up to 100 active customers'])
    expect(words.includes('pro')).toEqual(['Unlimited customers', 'Activity log'])
  })

  it('names the plans that come with a capability', () => {
    expect(wordsIn('es').plansWith('activity-log')).toBe('Pro')
  })

  it('says where the subscription stands, its dates in the organization’s time zone', () => {
    const words = wordsIn('en')

    expect(words.standing(active, 'America/Sao_Paulo')).toBe('R$99.00 a month. Paid until Dec 10, 2026.')
    expect(
      words.standing(
        { ...active, status: 'trialing', plan: null, trialEndsAt: '2026-12-01T00:00:00.000Z' },
        'Asia/Tokyo'
      )
    ).toBe('Free trial until Dec 1, 2026 (11 days left).')
    expect(words.standing({ ...active, status: 'past_due', pastDueSince: '2026-11-18T12:00:00.000Z' }, 'UTC')).toBe(
      'R$99.00 a month. The payment due on Nov 18, 2026 was not received.'
    )
    expect(words.standing({ ...active, status: 'cancelled', access: 'read-only' }, 'UTC')).toBe('The plan has ended.')
  })
})
