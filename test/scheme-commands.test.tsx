// Light, dark and the system's look as three commands of the registry (`useSchemeCommands`): in the palette in a group
// of their own, the one in use checked; a choice puts the app's theme in that scheme on the root at once and keeps it
// under the app's key; another provider with the same key reads it, and so does a page opened later or a tab that
// changed it; the system's choice follows `prefers-color-scheme` while the page is open; a value kept that is not a
// choice is the system's, and a storage that refuses does not stop a choice; `applyKeptScheme` puts the kept choice on
// the root before React renders.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { CommandPalette, CommandsProvider, WordsProvider, applyKeptScheme, colorTheme, themeVariables, useCommands, useSchemeCommands, type SchemeState } from '../src'

// The dialog opens and closes in a frame of its own, as in a browser.
const flush = () => act(async () => { await new Promise((done) => setTimeout(done, 30)) })
const THEME = colorTheme({ id: 'tasks', label: 'Tasks', color: '#006398', spot: 'balanced' })
const DARK = '(prefers-color-scheme: dark)'
const root = document.documentElement

// The system's setting, which a test turns while the page is open.
let systemDark = false
const changes = new Set<() => void>()
const turnSystem = (dark: boolean) =>
  act(() => {
    systemDark = dark
    for (const change of [...changes]) change()
  })

beforeEach(() => {
  systemDark = false
  changes.clear()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query === DARK && systemDark
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      if (query === DARK) changes.add(listener)
    },
    removeEventListener: (_type: string, listener: () => void) => {
      changes.delete(listener)
    },
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  for (const name of ['data-theme', 'data-scheme', 'style']) root.removeAttribute(name)
})

/** An app that gives its look and its key; `seen` is told the choice and the scheme drawn at each render. */
function App({ storageKey, seen }: { storageKey: string; seen?: (state: SchemeState) => void }) {
  const state = useSchemeCommands({ theme: THEME, storageKey })
  seen?.(state)
  return null
}

/** The names of the registry's commands that are checked now. */
function Checked({ seen }: { seen: (labels: string[]) => void }) {
  seen(useCommands().filter((command) => command.checked).map((command) => command.label))
  return null
}

const openPalette = async () => {
  fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true })
  await flush()
}
const options = () => screen.getAllByRole('option')
const checks = () => options().map((option) => option.getAttribute('aria-checked'))

test('light, dark and the system\'s are three commands of their own group, the one in use checked: the system\'s when nothing is kept', async () => {
  render(
    <CommandsProvider>
      <App storageKey="tasks.scheme" />
      <CommandPalette />
    </CommandsProvider>,
  )
  expect(root.getAttribute('data-scheme')).toBe('light')
  expect(root.getAttribute('data-theme')).toBe('tasks')
  await openPalette()
  expect(options().map((option) => option.textContent)).toEqual(['Light', 'Dark', 'Follow the system'])
  expect(checks()).toEqual(['false', 'false', 'true'])
  expect(screen.getByText('Look')).toBeTruthy()
  // Found by the words of their kind too.
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'theme' } })
  expect(options().map((option) => option.textContent)).toEqual(['Light', 'Dark', 'Follow the system'])
})

test('a choice puts the app\'s theme in that scheme on the root at once and keeps it under the app\'s key', async () => {
  render(
    <CommandsProvider>
      <App storageKey="mail.scheme" />
      <CommandPalette />
    </CommandsProvider>,
  )
  await openPalette()
  fireEvent.click(screen.getByRole('option', { name: 'Dark' }))
  expect(root.getAttribute('data-scheme')).toBe('dark')
  expect(root.getAttribute('data-theme')).toBe('tasks')
  expect(root.style.getPropertyValue('--color-paper')).toBe(themeVariables({ theme: THEME, scheme: 'dark' })['--color-paper'])
  expect(localStorage.getItem('mail.scheme')).toBe('dark')
  await flush()
  await openPalette()
  expect(checks()).toEqual(['false', 'true', 'false'])
  fireEvent.click(screen.getByRole('option', { name: 'Follow the system' }))
  expect(root.getAttribute('data-scheme')).toBe('light')
  expect(localStorage.getItem('mail.scheme')).toBe('system')
})

test('a second provider with the same key reads the same choice, as does a page opened later and one changed in another tab', async () => {
  let other: SchemeState | undefined
  let checked: string[] = []
  render(
    <>
      <CommandsProvider>
        <App storageKey="viewer.scheme" />
        <CommandPalette />
      </CommandsProvider>
      <CommandsProvider palette={false}>
        <App storageKey="viewer.scheme" seen={(state) => (other = state)} />
        <Checked seen={(labels) => (checked = labels)} />
      </CommandsProvider>
    </>,
  )
  expect(checked).toEqual(['Follow the system'])
  await openPalette()
  fireEvent.click(screen.getByRole('option', { name: 'Dark' }))
  expect(other).toEqual({ choice: 'dark', scheme: 'dark' })
  expect(checked).toEqual(['Dark'])
  // Another tab of the app keeps light: the storage tells this page.
  act(() => {
    localStorage.setItem('viewer.scheme', 'light')
    window.dispatchEvent(new StorageEvent('storage', { key: 'viewer.scheme', newValue: 'light' }))
  })
  expect(other).toEqual({ choice: 'light', scheme: 'light' })
  expect(checked).toEqual(['Light'])
  expect(root.getAttribute('data-scheme')).toBe('light')
  // A page opened later reads it at its first render.
  let later: SchemeState | undefined
  render(
    <CommandsProvider palette={false}>
      <App storageKey="viewer.scheme" seen={(state) => (later ??= state)} />
    </CommandsProvider>,
  )
  expect(later).toEqual({ choice: 'light', scheme: 'light' })
})

test('the system\'s choice follows prefers-color-scheme while the page is open; light or dark chosen does not', async () => {
  let state: SchemeState | undefined
  render(
    <CommandsProvider>
      <App storageKey="notes.scheme" seen={(seen) => (state = seen)} />
      <CommandPalette />
    </CommandsProvider>,
  )
  expect(state).toEqual({ choice: 'system', scheme: 'light' })
  turnSystem(true)
  expect(state).toEqual({ choice: 'system', scheme: 'dark' })
  expect(root.getAttribute('data-scheme')).toBe('dark')
  turnSystem(false)
  expect(root.getAttribute('data-scheme')).toBe('light')
  await openPalette()
  fireEvent.click(screen.getByRole('option', { name: 'Light' }))
  turnSystem(true)
  expect(state).toEqual({ choice: 'light', scheme: 'light' })
  expect(root.getAttribute('data-scheme')).toBe('light')
})

test('a value kept that is not light, dark or the system\'s is the system\'s; where the storage refuses, a choice still holds', async () => {
  localStorage.setItem('old.scheme', 'sepia')
  systemDark = true
  let state: SchemeState | undefined
  const { unmount } = render(
    <CommandsProvider>
      <App storageKey="old.scheme" seen={(seen) => (state = seen)} />
      <CommandPalette />
    </CommandsProvider>,
  )
  expect(state).toEqual({ choice: 'system', scheme: 'dark' })
  expect(root.getAttribute('data-scheme')).toBe('dark')
  await openPalette()
  expect(checks()).toEqual(['false', 'false', 'true'])
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
  await flush()
  unmount()
  // A private window: the storage refuses to read and to write.
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('The storage is not available.', 'SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
  })
  render(
    <CommandsProvider>
      <App storageKey="private.scheme" seen={(seen) => (state = seen)} />
      <CommandPalette />
    </CommandsProvider>,
  )
  expect(state).toEqual({ choice: 'system', scheme: 'dark' })
  await openPalette()
  fireEvent.click(screen.getByRole('option', { name: 'Light' }))
  expect(state).toEqual({ choice: 'light', scheme: 'light' })
  expect(root.getAttribute('data-scheme')).toBe('light')
})

test('applyKeptScheme puts the kept choice on the root before React renders: the system\'s when nothing is kept', () => {
  systemDark = true
  expect(applyKeptScheme({ theme: THEME, storageKey: 'early.scheme' })).toEqual({ choice: 'system', scheme: 'dark' })
  expect(root.getAttribute('data-scheme')).toBe('dark')
  expect(root.getAttribute('data-theme')).toBe('tasks')
  localStorage.setItem('early.scheme', 'light')
  expect(applyKeptScheme({ theme: THEME, storageKey: 'early.scheme' })).toEqual({ choice: 'light', scheme: 'light' })
  expect(root.getAttribute('data-scheme')).toBe('light')
  expect(root.style.getPropertyValue('--color-paper')).toBe(themeVariables({ theme: THEME, scheme: 'light' })['--color-paper'])
})

test('the words are the app\'s: the group and the three names through WordsProvider', async () => {
  render(
    <WordsProvider words={{ scheme: { group: 'Aspetto', light: 'Chiaro', dark: 'Scuro', system: 'Come il sistema', keywords: 'tema' } }}>
      <CommandsProvider>
        <App storageKey="words.scheme" />
        <CommandPalette />
      </CommandsProvider>
    </WordsProvider>,
  )
  await openPalette()
  expect(options().map((option) => option.textContent)).toEqual(['Chiaro', 'Scuro', 'Come il sistema'])
  expect(screen.getByText('Aspetto')).toBeTruthy()
})
