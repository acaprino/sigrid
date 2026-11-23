// Light, dark and the system's look as three commands of the registry (`useSchemeCommands`): in the palette in a group
// of their own, each with its icon and a name that stands alone without the heading, the one in use checked; a choice
// puts the app's theme in that scheme on the root at once and keeps it under the app's key; another provider with the
// same key reads it, and so does a page opened later or a tab that changed it; the system's choice follows
// `prefers-color-scheme` while the page is open; a value kept that is not a choice is the system's; the storage is read
// first, and a choice holds in the page only where the storage cannot be read at all; on a server nothing reads the
// storage; `applyKeptScheme` puts the kept choice on the root before React renders.
// The hook keeps the readers of a key and the choices no storage took in its module, for the whole run: each test keeps
// its choice under a key of its own (`key()`), so no test meets what another left there.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { CommandPalette, CommandsProvider, WordsProvider, applyKeptScheme, colorTheme, themeVariables, useCommands, useSchemeCommands, type SchemeState } from '../src'
import { flush } from './helpers'

// `flush()`: the dialog opens and closes in a frame of its own, as in a browser.
const THEME = colorTheme({ id: 'tasks', label: 'Tasks', color: '#006398', spot: 'balanced' })
const DARK = '(prefers-color-scheme: dark)'
const NAMES = ['Light theme', 'Dark theme', 'System theme']
const root = document.documentElement
/** The key of the running test: the same within a test, another in each test. */
const key = () => `scheme:${expect.getState().currentTestName ?? ''}`

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

test('light, dark and the system\'s are three commands of their own group, each with its icon and a name that stands alone, the one in use checked: the system\'s when nothing is kept', async () => {
  render(
    <CommandsProvider>
      <App storageKey={key()} />
      <CommandPalette />
    </CommandsProvider>,
  )
  expect(root.getAttribute('data-scheme')).toBe('light')
  expect(root.getAttribute('data-theme')).toBe('tasks')
  await openPalette()
  expect(options().map((option) => option.textContent)).toEqual(NAMES)
  expect(checks()).toEqual(['false', 'false', 'true'])
  // A screen reader says the row and its state, not the group's heading: the name alone says what it is.
  expect(screen.getByRole('option', { name: 'System theme' }).getAttribute('aria-checked')).toBe('true')
  expect(screen.getByText('Look')).toBeTruthy()
  // R6: each has its icon, by its meaning in Sigrid's set.
  expect(options().map((option) => option.querySelector('[data-icon]')?.getAttribute('data-icon'))).toEqual(['sun', 'moon', 'appearance'])
  // Found by the words of their kind too.
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mode' } })
  expect(options().map((option) => option.textContent)).toEqual(NAMES)
})

test('a choice puts the app\'s theme in that scheme on the root at once and keeps it under the app\'s key', async () => {
  render(
    <CommandsProvider>
      <App storageKey={key()} />
      <CommandPalette />
    </CommandsProvider>,
  )
  await openPalette()
  fireEvent.click(screen.getByRole('option', { name: 'Dark theme' }))
  expect(root.getAttribute('data-scheme')).toBe('dark')
  expect(root.getAttribute('data-theme')).toBe('tasks')
  expect(root.style.getPropertyValue('--color-paper')).toBe(themeVariables({ theme: THEME, scheme: 'dark' })['--color-paper'])
  expect(localStorage.getItem(key())).toBe('dark')
  await flush()
  await openPalette()
  expect(checks()).toEqual(['false', 'true', 'false'])
  fireEvent.click(screen.getByRole('option', { name: 'System theme' }))
  expect(root.getAttribute('data-scheme')).toBe('light')
  expect(localStorage.getItem(key())).toBe('system')
})

test('a second provider with the same key reads the same choice, as does a page opened later and one changed in another tab', async () => {
  let other: SchemeState | undefined
  let checked: string[] = []
  render(
    <>
      <CommandsProvider>
        <App storageKey={key()} />
        <CommandPalette />
      </CommandsProvider>
      <CommandsProvider palette={false}>
        <App storageKey={key()} seen={(state) => (other = state)} />
        <Checked seen={(labels) => (checked = labels)} />
      </CommandsProvider>
    </>,
  )
  expect(checked).toEqual(['System theme'])
  await openPalette()
  fireEvent.click(screen.getByRole('option', { name: 'Dark theme' }))
  expect(other).toEqual({ choice: 'dark', scheme: 'dark' })
  expect(checked).toEqual(['Dark theme'])
  // Another tab of the app keeps light: the storage tells this page.
  act(() => {
    localStorage.setItem(key(), 'light')
    window.dispatchEvent(new StorageEvent('storage', { key: key(), newValue: 'light' }))
  })
  expect(other).toEqual({ choice: 'light', scheme: 'light' })
  expect(checked).toEqual(['Light theme'])
  expect(root.getAttribute('data-scheme')).toBe('light')
  // A page opened later reads it at its first render.
  let later: SchemeState | undefined
  render(
    <CommandsProvider palette={false}>
      <App storageKey={key()} seen={(state) => (later ??= state)} />
    </CommandsProvider>,
  )
  expect(later).toEqual({ choice: 'light', scheme: 'light' })
})

test('the system\'s choice follows prefers-color-scheme while the page is open; light or dark chosen does not', async () => {
  let state: SchemeState | undefined
  render(
    <CommandsProvider>
      <App storageKey={key()} seen={(seen) => (state = seen)} />
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
  fireEvent.click(screen.getByRole('option', { name: 'Light theme' }))
  turnSystem(true)
  expect(state).toEqual({ choice: 'light', scheme: 'light' })
  expect(root.getAttribute('data-scheme')).toBe('light')
})

test('a value kept that is not light, dark or the system\'s is the system\'s', async () => {
  localStorage.setItem(key(), 'sepia')
  systemDark = true
  let state: SchemeState | undefined
  render(
    <CommandsProvider>
      <App storageKey={key()} seen={(seen) => (state = seen)} />
      <CommandPalette />
    </CommandsProvider>,
  )
  expect(state).toEqual({ choice: 'system', scheme: 'dark' })
  expect(root.getAttribute('data-scheme')).toBe('dark')
  await openPalette()
  expect(checks()).toEqual(['false', 'false', 'true'])
})

test('the storage is read first: a write it refused (its quota full) does not hold, and what another page or a clear keeps is followed', async () => {
  localStorage.setItem(key(), 'dark')
  let state: SchemeState | undefined
  render(
    <CommandsProvider>
      <App storageKey={key()} seen={(seen) => (state = seen)} />
      <CommandPalette />
    </CommandsProvider>,
  )
  expect(state).toEqual({ choice: 'dark', scheme: 'dark' })
  await openPalette()
  // The storage is full: it refuses this one write, and it can still be read, so its choice stands.
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
  })
  fireEvent.click(screen.getByRole('option', { name: 'Light theme' }))
  expect(localStorage.getItem(key())).toBe('dark')
  expect(state).toEqual({ choice: 'dark', scheme: 'dark' })
  expect(root.getAttribute('data-scheme')).toBe('dark')
  // Another page of the app keeps light: this page follows it.
  act(() => {
    localStorage.setItem(key(), 'light')
    window.dispatchEvent(new StorageEvent('storage', { key: key(), newValue: 'light' }))
  })
  expect(state).toEqual({ choice: 'light', scheme: 'light' })
  expect(root.getAttribute('data-scheme')).toBe('light')
  // The storage is cleared: nothing kept is the system's.
  act(() => {
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
  })
  expect(state).toEqual({ choice: 'system', scheme: 'light' })
})

test('where the storage cannot be read or written at all (a private mode), a choice holds in the page', async () => {
  systemDark = true
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('The storage is not available.', 'SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
  })
  let state: SchemeState | undefined
  render(
    <CommandsProvider>
      <App storageKey={key()} seen={(seen) => (state = seen)} />
      <CommandPalette />
    </CommandsProvider>,
  )
  expect(state).toEqual({ choice: 'system', scheme: 'dark' })
  await openPalette()
  fireEvent.click(screen.getByRole('option', { name: 'Light theme' }))
  expect(state).toEqual({ choice: 'light', scheme: 'light' })
  expect(root.getAttribute('data-scheme')).toBe('light')
})

test('on a server the choice is the system\'s, drawn light, whatever the browser keeps: the storage is not read', () => {
  localStorage.setItem(key(), 'dark')
  systemDark = true
  const read = vi.spyOn(Storage.prototype, 'getItem')
  let state: SchemeState | undefined
  renderToStaticMarkup(
    <CommandsProvider palette={false}>
      <App storageKey={key()} seen={(seen) => (state = seen)} />
    </CommandsProvider>,
  )
  expect(state).toEqual({ choice: 'system', scheme: 'light' })
  expect(read).not.toHaveBeenCalled()
})

test('applyKeptScheme puts the kept choice on the root before React renders: the system\'s when nothing is kept', () => {
  systemDark = true
  expect(applyKeptScheme({ theme: THEME, storageKey: key() })).toEqual({ choice: 'system', scheme: 'dark' })
  expect(root.getAttribute('data-scheme')).toBe('dark')
  expect(root.getAttribute('data-theme')).toBe('tasks')
  localStorage.setItem(key(), 'light')
  expect(applyKeptScheme({ theme: THEME, storageKey: key() })).toEqual({ choice: 'light', scheme: 'light' })
  expect(root.getAttribute('data-scheme')).toBe('light')
  expect(root.style.getPropertyValue('--color-paper')).toBe(themeVariables({ theme: THEME, scheme: 'light' })['--color-paper'])
})

test('applyKeptScheme without a document (a server) puts nothing and says the system\'s choice, drawn light', () => {
  const storageKey = key()
  localStorage.setItem(storageKey, 'dark')
  vi.stubGlobal('document', undefined)
  const state = applyKeptScheme({ theme: THEME, storageKey })
  vi.unstubAllGlobals()
  expect(state).toEqual({ choice: 'system', scheme: 'light' })
  expect(root.getAttribute('data-scheme')).toBeNull()
})

test('the words are the app\'s: the group and the three names through WordsProvider', async () => {
  render(
    <WordsProvider words={{ scheme: { group: 'Aspetto', light: 'Tema chiaro', dark: 'Tema scuro', system: 'Tema del sistema', keywords: 'modo' } }}>
      <CommandsProvider>
        <App storageKey={key()} />
        <CommandPalette />
      </CommandsProvider>
    </WordsProvider>,
  )
  await openPalette()
  expect(options().map((option) => option.textContent)).toEqual(['Tema chiaro', 'Tema scuro', 'Tema del sistema'])
  expect(screen.getByText('Aspetto')).toBeTruthy()
})
