// The parts an app composes a screen of with no class of its own, added when the examples were made to obey that rule:
// a card, a heading, a dot, a line, the facts of one thing, a choice of a settings page, a row of the sidebar's head or
// foot, the button that opens the sidebar's drawer; and the props that spared a class elsewhere (`Empty fill`,
// `ToggleGroup fill`, `Progress inline`, `Checkbox label`, `Column width`, `Cluster wrap`, the new `Text` variants,
// `CommandsProvider keysIn`, the icon `back`). Each draws from the tokens, and a class or a style passed in spite of the
// types never reaches the page.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import {
  AppShellContext,
  Card,
  Checkbox,
  Cluster,
  Column,
  CommandsProvider,
  DescriptionList,
  Dot,
  DrawerButton,
  Empty,
  Heading,
  ICON_NAMES,
  Icon,
  Progress,
  Separator,
  SettingRow,
  SidebarRow,
  Switch,
  Text,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  WordsProvider,
  useCommand,
} from '../src'
import { classes } from './helpers'

const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`)

describe('a card', () => {
  test('raised with the smallest shadow and no border, or on the quiet fill with no shadow; its inside is a pile', () => {
    const { rerender } = render(
      <Card as="section" aria-label="Now">
        a
      </Card>,
    )
    const card = screen.getByRole('region', { name: 'Now' })
    expect(classes(card)).toEqual(expect.arrayContaining(['flex', 'flex-col', 'rounded-lg', 'bg-raised', 'shadow-xs', 'p-4', 'gap-3']))
    expect(classes(card).some((c) => c.startsWith('border'))).toBe(false)
    rerender(
      <Card as="section" aria-label="Now" variant="quiet" pad="sm" gap="xs">
        a
      </Card>,
    )
    expect(classes(card)).toEqual(expect.arrayContaining(['bg-paper-2', 'p-2', 'gap-1']))
    expect(classes(card).some((c) => c.startsWith('shadow') || c.startsWith('border'))).toBe(false)
  })

  test('a class or a style passed in spite of the types is dropped', () => {
    const sneaky = { className: 'bg-red-500', style: { color: 'red' } } as unknown as object
    render(<Card {...sneaky}>a</Card>)
    expect(classes(slot('card'))).not.toContain('bg-red-500')
    expect(slot('card')?.getAttribute('style')).toBeNull()
  })
})

describe('a heading', () => {
  test('one size for a page, a section, a card, a small title and a group label, each at its level', () => {
    render(
      <>
        <Heading size="page">P</Heading>
        <Heading>S</Heading>
        <Heading size="card">C</Heading>
        <Heading size="small" level={4}>
          M
        </Heading>
        <Heading size="label" icon={<Icon name="now" />}>
          L
        </Heading>
      </>,
    )
    expect(screen.getByRole('heading', { name: 'P', level: 1 }).className).toContain('text-2xl')
    expect(screen.getByRole('heading', { name: 'S', level: 2 }).className).toContain('text-xl')
    expect(screen.getByRole('heading', { name: 'C', level: 3 }).className).toContain('text-lg')
    expect(screen.getByRole('heading', { name: 'M', level: 4 }).className).toContain('text-base')
    const label = screen.getByRole('heading', { name: 'L', level: 3 })
    expect(classes(label)).toEqual(expect.arrayContaining(['text-2xs', 'font-medium', 'text-ink-mute']))
    // The icon sits in a muted slot, hidden from screen readers.
    expect(label.querySelector('[data-slot="heading-icon"]')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('a dot', () => {
  test('a colour of the palette in the theme\'s shade of it, or the colour of a state; never read aloud', () => {
    const { container } = render(
      <>
        <Dot color="#297abc" />
        <Dot tone="success" />
        <Dot />
      </>,
    )
    const [given, state, plain] = [...container.querySelectorAll('[data-slot="dot"]')] as [Element, Element, Element]
    expect(classes(given)).toEqual(expect.arrayContaining(['size-2', 'rounded-full', 'bg-(--mark-dot)']))
    expect(given?.getAttribute('data-mark-hue')).not.toBeNull()
    expect(classes(state)).toContain('bg-success')
    expect(classes(plain)).toContain('bg-ink-mute')
    for (const dot of [given, state, plain]) expect(dot?.getAttribute('aria-hidden')).toBe('true')
  })
})

test('a separator is a hairline in the divider\'s colour, a separator for screen readers unless it is only drawn', () => {
  const { rerender } = render(<Separator />)
  expect(screen.getByRole('separator').className).toContain('border-line')
  rerender(<Separator decorative />)
  expect(screen.queryByRole('separator')).toBeNull()
})

test('the facts of one thing: names and values in a list of definitions, a value that is code in the monospace face', () => {
  render(<DescriptionList aria-label="Item" items={[{ name: 'Level', value: 'Recommended' }, null, { name: 'Path', value: 'C:\\cache', code: true }]} />)
  const list = screen.getByLabelText('Item')
  expect(list.tagName).toBe('DL')
  expect([...list.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(['Level', 'Path'])
  const path = [...list.querySelectorAll('dd')][1]!
  expect(classes(path)).toEqual(expect.arrayContaining(['font-mono', 'break-all']))
  expect(classes(list.querySelector('dt'))).toContain('text-ink-mute')
})

test('a choice of a settings page: the name at the start, the control at the end; a row that opens more is a button', () => {
  const open = vi.fn()
  render(
    <>
      <SettingRow label="Reminders" description="A notice at 9:00" control={<Switch aria-label="Reminders" />} />
      <SettingRow label="Advanced" onClick={open} />
    </>,
  )
  const row = screen.getByRole('switch', { name: 'Reminders' }).closest('[data-slot="setting-row"]')!
  expect(row.textContent).toContain('A notice at 9:00')
  expect(classes(row)).toEqual(expect.arrayContaining(['justify-between', 'border-b', 'border-line', 'min-h-12']))
  fireEvent.click(screen.getByRole('button', { name: 'Advanced' }))
  expect(open).toHaveBeenCalledOnce()
})

test('a row of the sidebar\'s head or foot lines up with the rows, cuts its words, and keeps its actions at the end', () => {
  render(
    <SidebarRow leading={<span data-testid="avatar" />} end={<button type="button">Close all</button>}>
      Giulia Conti
    </SidebarRow>,
  )
  const row = slot('sidebar-row')!
  expect(classes(row)).toEqual(expect.arrayContaining(['px-(--row-pad)', 'text-sidebar-ink', 'pointer-coarse:min-h-11']))
  expect(screen.getByText('Giulia Conti').className).toContain('truncate')
  expect(row.lastElementChild?.textContent).toBe('Close all')
})

test('the button that opens the drawer is there only where the sidebar is a drawer, with the toolkit\'s words or the app\'s', () => {
  const open = vi.fn()
  const { rerender } = render(
    <AppShellContext.Provider value={{ sidebar: 'full', inspector: 'docked' }}>
      <Toolbar aria-label="Bar">
        <DrawerButton onOpen={open} />
      </Toolbar>
    </AppShellContext.Provider>,
  )
  expect(screen.queryByRole('button')).toBeNull()
  rerender(
    <WordsProvider words={{ sidebar: { open: 'Apri il menu' } }}>
      <AppShellContext.Provider value={{ sidebar: 'drawer', inspector: 'drawer' }}>
        <Toolbar aria-label="Bar">
          <Toolbar aria-label="Bar">
        <DrawerButton onOpen={open} />
      </Toolbar>
        </Toolbar>
      </AppShellContext.Provider>
    </WordsProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Apri il menu' }))
  expect(open).toHaveBeenCalledOnce()
})

describe('the props that spare a class', () => {
  test('an empty state fills its region with a page\'s margins', () => {
    render(<Empty fill title="Nothing here" />)
    expect(classes(slot('empty'))).toEqual(expect.arrayContaining(['h-full', 'p-6']))
  })

  test('a segment control is as wide as its items, or fills its place with items of one width', () => {
    const Group = ({ fill }: { fill?: boolean }) => {
      const [value, setValue] = useState('a')
      return (
        <ToggleGroup aria-label="When" value={value} onValueChange={setValue} fill={fill}>
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>
      )
    }
    const { rerender } = render(<Group />)
    expect(classes(slot('toggle-group'))).toContain('w-fit')
    rerender(<Group fill />)
    expect(classes(slot('toggle-group'))).toContain('w-full')
    for (const item of document.querySelectorAll('[data-slot="toggle-group-item"]')) expect(classes(item)).toContain('flex-1')
  })

  test('a bar in a line of words keeps a fixed width', () => {
    render(<Progress aria-label="Analysis" value={40} inline />)
    expect(classes(slot('progress'))).toEqual(expect.arrayContaining(['w-48', 'shrink-0']))
  })

  test('a check box with its words: one label, so a press on the words checks it', () => {
    const change = vi.fn()
    render(<Checkbox label="Print the contract" onCheckedChange={change} />)
    fireEvent.click(screen.getByText('Print the contract'))
    expect(change).toHaveBeenCalledWith(true)
    expect(screen.getByRole('checkbox', { name: 'Print the contract' })).toBeTruthy()
  })

  test('a pile kept to the width of a column, a row kept on one line, and the words of a line', () => {
    render(
      <>
        <Column width="prose">a</Column>
        <Cluster wrap={false}>b</Cluster>
        <Text variant="soft">s</Text>
        <Text variant="strong">t</Text>
        <Text variant="note">n</Text>
      </>,
    )
    expect(classes(slot('column'))).toEqual(expect.arrayContaining(['mx-auto', 'w-full', 'max-w-prose']))
    expect(classes(slot('cluster'))).toContain('flex-nowrap')
    expect(screen.getByText('s').className).toBe('text-ink-soft')
    expect(screen.getByText('t').className).toBe('font-medium')
    expect(classes(screen.getByText('n'))).toEqual(['text-xs', 'text-ink-mute'])
  })

  test('Sigrid names the way back', () => {
    expect(ICON_NAMES).toContain('back')
    const { container } = render(<Icon name="back" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

test('the keys of an app that is one part of a page run only while the focus is in it', () => {
  const run = vi.fn()
  function App() {
    useCommand({ id: 'stack', label: 'Stack', keys: 'B', run })
    return null
  }
  render(
    <>
      <div data-app="mine">
        <button type="button">Inside</button>
      </div>
      <button type="button">Outside</button>
      <CommandsProvider keysIn='[data-app="mine"]' palette={false}>
        <App />
      </CommandsProvider>
    </>,
  )
  fireEvent.keyDown(screen.getByRole('button', { name: 'Outside' }), { key: 'b' })
  expect(run).not.toHaveBeenCalled()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Inside' }), { key: 'b' })
  expect(run).toHaveBeenCalledOnce()
})
