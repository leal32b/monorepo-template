import * as i18n from '@solid-primitives/i18n'
import { createContext, createEffect, createMemo, createSignal, type ParentProps, useContext } from 'solid-js'
import { store } from '../device/device-storage'
import { localeKey } from './device-locale'
import { getMessages, type Locale, loadMessages } from './messages'

function createI18n(initial: Locale) {
  const [locale, setLocale] = createSignal(initial)
  const dictionary = createMemo(() => i18n.flatten(getMessages(locale())))
  const t = i18n.translator(dictionary, i18n.resolveTemplate)
  // Screen readers, hyphenation and browser translation all read <html lang>.
  createEffect(() => {
    document.documentElement.lang = locale()
  })
  /**
   * Fetches the language first, so the screen never shows text that is not there yet, and keeps it
   * on this device for the next visit.
   */
  const changeLocale = async (next: Locale) => {
    await loadMessages(next)
    setLocale(next)
    store(localeKey, next)
  }
  return { locale, setLocale: changeLocale, t }
}

type I18n = ReturnType<typeof createI18n>

const I18nContext = createContext<I18n>()

/** `locale` is the initial language and must be loaded (`loadMessages`); change it later with `setLocale` from `useI18n()`. */
export function I18nProvider(props: ParentProps<{ locale: Locale }>) {
  return <I18nContext.Provider value={createI18n(props.locale)}>{props.children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside an I18nProvider')
  return value
}
