// The direction of writing handed to Ark UI, which reads it from its locale and never from the page: by default the
// page's own (the direction the browser computes for `<html>`, so `dir="auto"` and a stylesheet count as well as
// `dir`), followed while the app is open, or the one given to a subtree. It draws nothing. `AppShell` mounts one around
// everything it renders, so an app written from the right sets `<html dir="rtl">` and nothing else.
import { LocaleProvider } from '@ark-ui/react/locale'
import { useSyncExternalStore, type ReactNode } from 'react'

/** Ark's own default: a page written from the left gives Ark exactly what it had before the bridge. */
const LTR_LOCALE = 'en-US'
// shortcut: Ark takes a direction only with a locale (`LocaleProvider`; the provider of its context is not exported),
// so a page written from the right whose `lang` is not a language written from the right gives Ark `ar`, a tag it reads
// as right to left. Limit: an Ark part that formats with the locale of the context would format in Arabic; none of
// Sigrid's does (the date fields pass their own `locale`, which wins). Upgrade when Ark gives the direction on its own,
// or before a part that formats with the context's locale comes in.
const RTL_STAND_IN = 'ar'
/** The scripts written from the right, as Ark 5.39.3 (zag's `isRTL`) reads them: a tag taken here is never left to right for Ark. */
const RTL_SCRIPTS = new Set(['Arab', 'Hebr', 'Thaa', 'Syrc', 'Nkoo', 'Adlm', 'Rohg', 'Mend', 'Samr', 'Mand', 'Armi', 'Avst'])

/** The page's language when it is written from the right, else the stand-in (also for no language, or a tag that is not one). */
function rtlLocale(lang: string): string {
  try {
    return RTL_SCRIPTS.has(new Intl.Locale(lang).maximize().script ?? '') ? lang : RTL_STAND_IN
  } catch {
    return RTL_STAND_IN
  }
}

/** The locale that gives Ark the page's direction now. */
function pageLocale(): string {
  const root = document.documentElement
  return getComputedStyle(root).direction === 'rtl' ? rtlLocale(root.lang) : LTR_LOCALE
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

/**
 * The direction of writing of the Ark-based parts under it (their keys, where they open, how they slide): with no
 * `dir`, the page's, followed as `<html dir>` and `lang` change; with `dir`, that one. `AppShell` already mounts one
 * that follows the page: this is for the parts outside a frame, and for a subtree written the other way from its
 * page, whose element also carries that `dir` (for its text and its logical sides: this sets no attribute).
 */
export function DirectionProvider({ dir, children }: { dir?: 'ltr' | 'rtl' | undefined; children: ReactNode }) {
  const page = useSyncExternalStore(subscribe, pageLocale, () => LTR_LOCALE)
  const pageDir = page === LTR_LOCALE ? 'ltr' : 'rtl'
  const locale = (dir ?? pageDir) === pageDir ? page : dir === 'rtl' ? RTL_STAND_IN : LTR_LOCALE
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>
}
