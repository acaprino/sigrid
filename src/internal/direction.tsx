// The direction of writing handed to Ark UI, which reads it from its locale and never from the page: by default the
// page's own (the direction the browser computes for `<html>`, so `dir="auto"` and a stylesheet count as well as
// `dir`), followed while the app is open, or the one given to a subtree. It draws nothing. `AppShell` mounts one around
// everything it renders, so an app written from the right sets `<html dir="rtl">` and nothing else.
import { LocaleProvider } from '@ark-ui/react/locale'
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'

/** Ark's own default: a page written from the left gives Ark exactly what it had before the bridge. */
const LTR_LOCALE = 'en-US'
// shortcut: Ark takes a direction only with a locale (`LocaleProvider`; the provider of its context is not exported),
// so a page written from the right whose `lang` is not a language written from the right gives Ark `ar`, a tag it reads
// as right to left. Limit: an Ark part that formats with the locale of the context would format in Arabic; none of
// Sigrid's does (the date fields pass their own `locale`, which wins). Upgrade when Ark gives the direction on its own,
// or before a part that formats with the context's locale comes in.
const RTL_STAND_IN = 'ar'
/** The scripts written from the right, as Ark 5.39.3 (zag's `isRTL`) reads them: a tag taken here is never left to right for Ark. */
// shortcut: a copy of the list in `@zag-js/i18n-utils` (`isRTL`), which Ark does not export and the package may not
// import (test/provenance.test.ts). Limit: a script Ark adds or drops later is not followed here; test/direction.test.tsx
// checks that each one listed is still read right to left through Ark. Upgrade: when Ark exports `isRTL` or its
// `LocaleContextProvider`, read the direction from it or give it directly.
export const RTL_SCRIPTS: ReadonlySet<string> = new Set(['Arab', 'Hebr', 'Thaa', 'Syrc', 'Nkoo', 'Adlm', 'Rohg', 'Mend', 'Samr', 'Mand', 'Armi', 'Avst'])

/** The page's language when it is written from the right, else the stand-in (also for no language, or a tag that is not one). */
function rtlLocale(lang: string): string {
  try {
    return RTL_SCRIPTS.has(new Intl.Locale(lang).maximize().script ?? '') ? lang : RTL_STAND_IN
  } catch {
    return RTL_STAND_IN
  }
}

/** The page's direction now, as the browser computes it for `<html>`. */
function readPageDir(): 'ltr' | 'rtl' {
  return getComputedStyle(document.documentElement).direction === 'rtl' ? 'rtl' : 'ltr'
}

/** The locale that gives Ark the page's direction now. */
function readPageLocale(): string {
  return readPageDir() === 'rtl' ? rtlLocale(document.documentElement.lang) : LTR_LOCALE
}

const listeners = new Set<() => void>()
let observer: MutationObserver | null = null

/** One observer for every bridge, on all the attributes of `<html>`: its `dir`, its `lang`, a class a stylesheet reads. */
function subscribe(notify: () => void): () => void {
  listeners.add(notify)
  if (!observer && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => listeners.forEach((listener) => listener()))
    observer.observe(document.documentElement, { attributes: true })
  }
  return () => {
    listeners.delete(notify)
    if (listeners.size > 0) return
    observer?.disconnect()
    observer = null
  }
}

/** The `dir` of the nearest `DirectionProvider` above that was given one: what a provider without `dir` follows first. */
const GivenDir = createContext<'ltr' | 'rtl' | null>(null)

/**
 * The direction of writing of the Ark-based parts under it (their keys, where they open, how they slide): with `dir`,
 * that one; with no `dir`, the one of the nearest `DirectionProvider` above that has a `dir`, else the page's, followed
 * as `<html dir>` and `lang` change. `AppShell` already mounts one without `dir`, so `<DirectionProvider dir="rtl">`
 * around an `AppShell` turns the frame too. This is for the parts outside a frame, and for a subtree written the other
 * way from its page, whose element also carries that `dir` (for its text and its logical sides: this sets no attribute).
 */
export function DirectionProvider({ dir, children }: { dir?: 'ltr' | 'rtl' | undefined; children: ReactNode }) {
  const given = useContext(GivenDir)
  const pageDir = useSyncExternalStore(subscribe, readPageDir, () => 'ltr' as const)
  const pageLocale = useSyncExternalStore(subscribe, readPageLocale, () => LTR_LOCALE)
  const wanted = dir ?? given ?? pageDir
  const locale = wanted === pageDir ? pageLocale : wanted === 'rtl' ? RTL_STAND_IN : LTR_LOCALE
  return (
    <GivenDir.Provider value={dir ?? given}>
      <LocaleProvider locale={locale}>{children}</LocaleProvider>
    </GivenDir.Provider>
  )
}
