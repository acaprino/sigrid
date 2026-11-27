// Boxed keys (`ThemeDef.keys: 'boxed'`, `data-keys="boxed"` on the root) reach every key hint the toolkit draws: a
// `Kbd`, each key of a `Shortcut`, the keys at the foot of the window, the `shortcut` of a toolbar's button and of its
// search, a row of the command palette, a menu's shortcut, a toast's hint and a tooltip's key. Each takes the one cap
// (`KEY_CAP` in primitives/kbd.tsx) beside its own text style, and without the attribute draws nothing of it.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test } from 'vitest'
import { CommandPalette, CommandsProvider, KeyHints, PALETTE_COMMAND, useCommandKey } from '../src/assemblies'
import { Toasts } from '../src/components'
import { Toolbar, ToolbarButton, ToolbarSearch } from '../src/layout'
import { DropdownMenuShortcut, Kbd, Shortcut, Tooltip } from '../src/primitives'
import { KEY_CAP } from '../src/primitives/kbd'
import { classes, flush, settle } from './helpers'

// Tailwind also scans `test/`: a variant and its class are joined with `+`, never one literal (test/build.test.ts).
const KEYS = '[[data-keys=boxed]_&]' + ':'
const CAP = KEY_CAP.split(' ')
/** A class that draws a box, or gives it its size, its face or its line. */
const DRAWS = /(?:^|:)(?:bg-|border|rounded|shadow-|font-mono|h-\d|min-w-|px-|leading-\d|inline-block)/

/** The hint has the whole cap, every class of it under the attribute, and nothing of a box without it. */
function expectCap(el: Element | null | undefined, at: string, own: readonly string[]) {
  expect(el, at).toBeTruthy()
  const c = classes(el)
  for (const cls of CAP) expect(c, `${at}: ${cls}`).toContain(cls)
  for (const cls of c.filter((x) => DRAWS.test(x))) expect(cls.startsWith(KEYS), `${at}: ${cls} draws without the attribute`).toBe(true)
  // Its own text style is kept: the cap is added to it.
  for (const cls of own) expect(c, `${at}: ${cls}`).toContain(cls)
}

test('the cap is one: 20px, a hairline, l1 corners, monospace, an 18px line; on a fill the hairline is the text colour', () => {
  for (const cls of CAP) expect(cls.startsWith(KEYS), cls).toBe(true)
  for (const cls of ['h-5', 'min-w-5', 'rounded-sm', 'border', 'border-line', 'px-1', 'font-mono', 'leading-4.5', 'text-center']) expect(CAP).toContain(KEYS + cls)
  expect(CAP).toContain(KEYS + '[[data-slot=button]_&]' + ':' + 'border-current' + '/35')
  expect(CAP).toContain(KEYS + '[[data-slot=tooltip-content]_&]' + ':' + 'border-current' + '/35')
  // It never sets how the hint is displayed: a hint hidden on a phone, or without a fine pointer, stays hidden.
  expect(CAP.some((cls) => /:(?:hidden|inline|flex|block|inline-flex|inline-block)$/.test(cls))).toBe(false)
})

test('Kbd, each key of a Shortcut and the keys at the foot of the window', () => {
  render(
    <CommandsProvider>
      <Kbd data-testid="key">K</Kbd>
      <Shortcut keys={['Ctrl', 'Enter']} data-testid="combo" />
      <KeyHints ids={[PALETTE_COMMAND]} />
    </CommandsProvider>,
  )
  const own = ['text-2xs', 'font-medium', 'text-ink-mute']
  expectCap(screen.getByTestId('key'), 'Kbd', own)
  for (const key of screen.getByTestId('combo').querySelectorAll('kbd')) expectCap(key, 'Shortcut', own)
  expectCap(screen.getByRole('list', { name: 'Keys' }).querySelector('kbd'), 'KeyHints', own)
})

test('the shortcut of a toolbar button and of the toolbar search', () => {
  render(
    <Toolbar aria-label="Mail">
      <ToolbarButton label="Commands" shortcut="Ctrl K" icon={<svg />}>
        Commands
      </ToolbarButton>
      <ToolbarSearch closed="field" label="Search the mail" shortcut="Ctrl F" value="" onValueChange={() => {}} />
    </Toolbar>,
  )
  const button = document.querySelector('[data-slot="toolbar-button-shortcut"]')
  expect(button?.textContent).toBe('Ctrl K')
  expectCap(button, 'ToolbarButton', ['text-2xs', 'font-medium', 'opacity-70'])
  // The hint is inside the button: its hairline is the button's text colour.
  expect(button?.closest('[data-slot="button"]')).toBeTruthy()
  const search = document.querySelector('[data-slot="toolbar-search-shortcut"]')
  expect(search?.textContent).toBe('Ctrl F')
  expectCap(search, 'ToolbarSearch', ['text-2xs', 'font-medium'])
})

function Palette() {
  const [open, setOpen] = useState(false)
  useCommandKey(() => setOpen(true))
  return <CommandPalette open={open} onOpenChange={setOpen} commands={[{ id: 'find', label: 'Search in this view', shortcut: 'Ctrl F', onSelect: () => {} }]} />
}

test('a row of the command palette', async () => {
  render(<Palette />)
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  await flush()
  const hint = document.querySelector('[data-slot="command-palette-shortcut"]')
  expect(hint?.textContent).toBe('Ctrl F')
  expectCap(hint, 'CommandPalette', ['text-2xs', 'font-medium', 'text-ink-mute', 'pointer-coarse' + ':max-md:hidden'])
})

test('the shortcut of a menu', () => {
  render(<DropdownMenuShortcut>Del</DropdownMenuShortcut>)
  expectCap(document.querySelector('[data-slot="dropdown-menu-shortcut"]'), 'DropdownMenuShortcut', ['ms-auto', 'text-2xs', 'leading-none', 'font-medium', 'text-ink-mute', 'max-md' + ':pointer-coarse:hidden'])
})

test('the hint of a toast, inside its button, shown only with a fine pointer and never on a phone (R5), a pen one included', async () => {
  render(<Toasts inline items={[{ id: 'x', text: 'Moved to Home.', undo: { hint: 'Z', onClick: () => {} } }]} />)
  await settle()
  const hint = screen.getByRole('button', { name: 'Undo' }).querySelector('kbd')
  expect(hint?.textContent).toBe('Z')
  expectCap(hint, 'Toasts', ['hidden', 'pointer-fine' + ':inline', 'md:any-pointer-fine' + ':inline', 'font-sans', 'text-2xs', 'leading-none', 'font-medium'])
  // `any-pointer-fine` alone would show it on a phone that also has a pen (a fine pointer beside the finger).
  expect(hint?.className.split(/\s+/)).not.toContain('any-pointer-fine' + ':inline')
  expect(hint?.closest('[data-slot="button"]')).toBeTruthy()
})

test('the key of a tooltip, inside the inverted card', async () => {
  render(
    <Tooltip label="Search" shortcut="Ctrl K" delay={0}>
      <button type="button" aria-label="Search" />
    </Tooltip>,
  )
  act(() => screen.getByRole('button').focus())
  await settle(120)
  const hint = document.querySelector('[data-slot="tooltip-shortcut"]')
  expect(hint?.textContent).toBe('Ctrl K')
  expectCap(hint, 'Tooltip', ['ms-2', 'font-medium', 'opacity-80', KEYS + 'inline-block'])
  expect(hint?.closest('[data-slot="tooltip-content"]')).toBeTruthy()
})
