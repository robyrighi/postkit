import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DICTS, LOCALES, type Key, type Lang } from './strings'

export type { Key, Lang }
export { LANGS, LOCALES } from './strings'

const STORE = 'pk_lang'

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORE)
    if (saved && saved in DICTS) return saved as Lang
  } catch {
    /* ignora */
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const c = l.slice(0, 2).toLowerCase()
    if (c in DICTS) return c as Lang
  }
  return 'it'
}

type T = (key: Key, vars?: Record<string, string | number>) => string
interface Ctx {
  lang: Lang
  locale: string
  setLang: (l: Lang) => void
  t: T
}

const I18n = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORE, l)
    } catch {
      /* ignora */
    }
  }, [])

  const t = useCallback<T>(
    (key, vars) => {
      let s = DICTS[lang][key] ?? DICTS.it[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
      return s
    },
    [lang],
  )

  return <I18n.Provider value={{ lang, locale: LOCALES[lang], setLang, t }}>{children}</I18n.Provider>
}

export function useI18n(): Ctx {
  const c = useContext(I18n)
  if (!c) throw new Error('I18nProvider mancante')
  return c
}
