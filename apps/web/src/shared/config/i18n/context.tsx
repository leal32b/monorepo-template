import * as i18n from '@solid-primitives/i18n'
import { createContext, createMemo, createSignal, type ParentProps, useContext } from 'solid-js'
import { type Locale, messages } from './messages'

function createI18n(initial: Locale) {
  const [locale, setLocale] = createSignal(initial)
  const dictionary = createMemo(() => i18n.flatten(messages[locale()]))
  const t = i18n.translator(dictionary, i18n.resolveTemplate)
  return { locale, setLocale, t }
}

type I18n = ReturnType<typeof createI18n>

const I18nContext = createContext<I18n>()

/** `locale` is the initial language; change it later with `setLocale` from `useI18n()`. */
export function I18nProvider(props: ParentProps<{ locale: Locale }>) {
  return <I18nContext.Provider value={createI18n(props.locale)}>{props.children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside an I18nProvider')
  return value
}
