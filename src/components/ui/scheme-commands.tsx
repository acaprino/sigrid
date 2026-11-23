// Light, dark and the system's look as three commands of the registry, the same in every app of the suite (owner,
// 2026-11-23): the person chooses the scheme from the palette, and no app writes commands or theme code for it. The app
// calls `useSchemeCommands` inside its `CommandsProvider` with its look (its theme, and the user's tone or own colours
// when it has them) and the key of the browser's storage the choice is kept under. The three commands sit in a group of
// their own («Look», `useWords().scheme`), the one in use checked; choosing one puts the theme in that scheme on the
// document's root at once (`applyTheme`) and keeps it. The pages and the tabs that keep the choice under the same key
// follow it, and the system's choice, the default, follows `prefers-color-scheme` while the page is open. A value kept
// that is not light, dark or the system's is the system's; where the storage refuses (a private window), the choice
// holds until the page is closed. `applyKeptScheme`, called in the app's entry before React renders, puts the kept
// choice on the root before the first paint. After Imago's `mountApp`, whose palette had the same commands.
import * as React from "react"
import { useMedia } from "../../internal/media"
import type { ThemeScheme } from "../../theme-engine"
import { applyTheme, type ThemePick } from "../../themes"
import { useWords } from "../../words"
import { useCommand } from "./commands"

/** What the person chose: one of the two schemes, or the system's, which follows `prefers-color-scheme`. */
export type SchemeChoice = ThemeScheme | "system"

/** The app's look and where the choice is kept. */
export type SchemeCommandsOptions = Omit<ThemePick, "scheme"> & {
  /** The key of the browser's storage (`localStorage`) the choice is kept under: one for the app, the same in each of its pages. */
  storageKey: string
}

/** The choice, and the scheme drawn now (for the system's choice, the one the system says). */
export type SchemeState = { choice: SchemeChoice; scheme: ThemeScheme }

const DARK = "(prefers-color-scheme: dark)"
const CHOICES: readonly SchemeChoice[] = ["light", "dark", "system"]
const isChoice = (value: unknown): value is SchemeChoice => (CHOICES as readonly unknown[]).includes(value)

// A choice the storage refused (a private window, storage turned off): it holds until the page is closed.
const unstored = new Map<string, SchemeChoice>()
// The hooks of this document that read a key: a choice made here reaches them at once (the `storage` event reaches only
// the other documents).
const readers = new Map<string, Set<() => void>>()

/** The choice kept under the key: nothing, or a value that is not light, dark or the system's, is the system's. */
function keptChoice(key: string): SchemeChoice {
  const refused = unstored.get(key)
  if (refused) return refused
  let value: string | null = null
  try {
    if (typeof window !== "undefined") value = window.localStorage.getItem(key)
  } catch {
    // No storage here: nothing is kept.
  }
  return isChoice(value) ? value : "system"
}

function keep(key: string, choice: SchemeChoice): void {
  try {
    window.localStorage.setItem(key, choice)
    unstored.delete(key)
  } catch {
    unstored.set(key, choice)
  }
  for (const reader of [...(readers.get(key) ?? [])]) reader()
}

function listen(key: string, reader: () => void): () => void {
  const own = readers.get(key) ?? new Set<() => void>()
  readers.set(key, own)
  own.add(reader)
  // Another page or tab of the app kept a choice, or the storage was cleared.
  const stored = (event: StorageEvent) => {
    if (event.key === key || event.key === null) reader()
  }
  window.addEventListener("storage", stored)
  return () => {
    own.delete(reader)
    if (own.size === 0) readers.delete(key)
    window.removeEventListener("storage", stored)
  }
}

const drawn = (choice: SchemeChoice, systemDark: boolean): ThemeScheme => (choice === "system" ? (systemDark ? "dark" : "light") : choice)

const pickOf = (look: SchemeCommandsOptions, scheme: ThemeScheme): ThemePick => ({ theme: look.theme, own: look.own ?? null, tone: look.tone ?? null, palette: look.palette ?? null, scheme })

/**
 * Puts the kept choice on the document's root (`applyTheme`) and says it: for the app's entry file, before React
 * renders, so the first paint is already in the scheme kept. Without `matchMedia` the system's choice is light.
 */
export function applyKeptScheme(options: SchemeCommandsOptions): SchemeState {
  const choice = keptChoice(options.storageKey)
  const systemDark = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DARK).matches
  const scheme = drawn(choice, systemDark)
  applyTheme(document.documentElement, pickOf(options, scheme))
  return { choice, scheme }
}

/**
 * Declares light, dark and the system's look in the registry (`CommandsProvider`), in a group of their own where the
 * hook is called, the one in use checked, and keeps the app's look on the document's root in the scheme chosen. Give
 * the theme, the tone and the own colours as the same objects at every render (a constant, or `useMemo`): a new one
 * puts the theme again. It says the choice and the scheme drawn, for a part that draws in the scheme (a preview).
 */
export function useSchemeCommands(options: SchemeCommandsOptions): SchemeState {
  const { storageKey, theme, own, tone, palette } = options
  const words = useWords().scheme
  const subscribe = React.useCallback((reader: () => void) => listen(storageKey, reader), [storageKey])
  const read = () => keptChoice(storageKey)
  const choice = React.useSyncExternalStore(subscribe, read, read)
  const scheme = drawn(choice, useMedia(DARK))
  React.useLayoutEffect(() => {
    applyTheme(document.documentElement, pickOf({ storageKey, theme, own, tone, palette }, scheme))
  }, [storageKey, theme, own, tone, palette, scheme])
  const command = (id: SchemeChoice) => ({ id: `sigrid.scheme.${id}`, label: words[id], group: words.group, keywords: words.keywords, checked: choice === id, run: () => keep(storageKey, id) })
  useCommand(command("light"))
  useCommand(command("dark"))
  useCommand(command("system"))
  return { choice, scheme }
}
