// The movements that answer a gesture in a navigation, a list and a card that hangs from a field: the mark of the
// chosen row of a `Sidebar` (and of a `NavList`) that slides to the row chosen next, the hover background of a list
// that follows the pointer (`ItemList`, and `HoverFollow` for rows of an app's own), and a `Popover` that hangs from
// something other than its button and fades as it closes. Without motion each of them is the DOM it was before.
// Tailwind also scans `test/`: a class with a variant is taken from the source's constant, never written out here.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { MotionProvider } from '../src'
import { ItemList, ItemRow, SearchField } from '../src/components'
import { preloadMotion } from '../src/internal/motion'
import { NavItem, NavList, Sidebar, SidebarGroup } from '../src/layout'
import { FIELD_QUIET, FIELD_QUIET_RADIUS } from '../src/lib/field'
import { ROW_HOVER } from '../src/lib/rows'
import { HoverFollow, Popover, PopoverAnchor, PopoverContent, Select } from '../src/primitives'
import { classes, settle, systemMotion } from './helpers'
import { themeCss } from './theme-tokens'

afterEach(() => vi.unstubAllGlobals())

/** Motion is here and the system allows it: what `animated` needs to move. */
const withMotion = () =>
  beforeEach(async () => {
    await preloadMotion()
    systemMotion(false)
  })

const marks = () => Array.from(document.querySelectorAll('[data-slot="highlight"]'))
const row = (name: string) => screen.getByRole('button', { name })

/** A whole press, as a mouse makes it: what closes a card when it lands outside it. */
async function pressOn(el: Element) {
  fireEvent.pointerDown(el, { pointerType: 'mouse', button: 0 })
  fireEvent.mouseDown(el, { button: 0 })
  fireEvent.pointerUp(el, { pointerType: 'mouse', button: 0 })
  fireEvent.mouseUp(el, { button: 0 })
  fireEvent.click(el, { button: 0, detail: 1 })
  await settle(120)
}

function Places({ animated, startCollapsed = false }: { animated?: boolean; startCollapsed?: boolean }) {
  const [at, setAt] = useState('Inbox')
  const [collapsed, setCollapsed] = useState(startCollapsed)
  const place = (name: string) => (
    <NavItem icon={<svg />} current={at === name} onClick={() => setAt(name)}>
      {name}
    </NavItem>
  )
  return (
    <Sidebar aria-label="Main" search collapsed={collapsed} onCollapsedChange={setCollapsed} {...(animated === undefined ? {} : { animated })}>
      <SidebarGroup label="Favorites">
        {place('Inbox')}
        {place('Reports')}
      </SidebarGroup>
      <SidebarGroup label="Projects" collapsible>
        {place('Website')}
      </SidebarGroup>
    </Sidebar>
  )
}

describe('the mark of the chosen row of a sidebar', () => {
  withMotion()

  test('without motion the chosen row draws its own tint: no mark, and the row is not a layer', () => {
    render(<Places />)
    expect(marks()).toEqual([])
    expect(classes(row('Inbox'))).not.toContain('isolate')
  })

  test('with the system asking for less motion, the same', () => {
    systemMotion(true)
    render(<Places animated />)
    expect(marks()).toEqual([])
    expect(classes(row('Inbox'))).not.toContain('isolate')
  })

  test('with motion there is one mark for the whole sidebar, in the chosen row, and it goes to the row chosen next, across the groups', () => {
    render(<Places animated />)
    expect(marks()).toHaveLength(1)
    expect(row('Inbox').contains(marks()[0]!)).toBe(true)
    // The row leaves its tint and its bar to the mark, which is a layer under its words.
    expect(classes(row('Inbox'))).toContain('isolate')
    expect(marks()[0]!.getAttribute('aria-hidden')).toBe('true')
    expect(classes(marks()[0]!)).toEqual(expect.arrayContaining(['absolute', 'inset-0', 'bg-sidebar-selected']))
    fireEvent.click(row('Website'))
    expect(marks()).toHaveLength(1)
    expect(row('Website').contains(marks()[0]!)).toBe(true)
    expect(classes(row('Inbox'))).not.toContain('isolate')
    expect(row('Website').getAttribute('aria-current')).toBe('page')
  })

  test('the app turns it on for every part at once with MotionProvider', () => {
    render(
      <MotionProvider animated>
        <Places />
      </MotionProvider>,
    )
    expect(marks()).toHaveLength(1)
  })

  test('a chosen row that is not shown has no mark: in a group that was shut, or hidden by the search', () => {
    render(<Places animated />)
    fireEvent.click(row('Website'))
    expect(marks()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }))
    expect(marks()).toEqual([])
    // The row is still the current one, with its own tint, for when the group opens again.
    const shut = document.querySelector('[data-slot="nav-item"][aria-current="page"]')!
    expect(shut.textContent).toBe('Website')
    expect(classes(shut)).not.toContain('isolate')
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }))
    expect(marks()).toHaveLength(1)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'inb' } })
    expect(marks()).toEqual([])
  })

  test('shrunk to its rail the chosen row still has the one mark', () => {
    render(<Places animated startCollapsed />)
    expect(marks()).toHaveLength(1)
    expect(document.querySelector('[data-slot="nav-item"][aria-current="page"]')!.contains(marks()[0]!)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Expand the sidebar' }))
    expect(marks()).toHaveLength(1)
  })

  test('a NavList on the page has the same mark, in the page\'s tint', () => {
    function List() {
      const [at, setAt] = useState('One')
      return (
        <NavList aria-label="Places" animated>
          <NavItem current={at === 'One'} onClick={() => setAt('One')}>One</NavItem>
          <NavItem current={at === 'Two'} onClick={() => setAt('Two')}>Two</NavItem>
        </NavList>
      )
    }
    render(<List />)
    expect(marks()).toHaveLength(1)
    expect(classes(marks()[0]!)).toContain('bg-selected')
    fireEvent.click(row('Two'))
    expect(marks()).toHaveLength(1)
    expect(row('Two').contains(marks()[0]!)).toBe(true)
  })
})

const hoverFill = ROW_HOVER.split(' ').find((c) => c.includes('bg-'))!
const followers = () => Array.from(document.querySelectorAll('[data-slot="hover-highlight"]'))

function Things({ animated, names = ['Kitchen quote', 'Receipt', 'Invoice'] }: { animated?: boolean; names?: string[] }) {
  return (
    <ItemList aria-label="Messages" {...(animated === undefined ? {} : { animated })}>
      {names.map((name) => (
        <ItemRow key={name} title={name} current={name === 'Receipt'} />
      ))}
    </ItemList>
  )
}

describe('the hover background that follows the pointer over a list', () => {
  withMotion()

  test('without motion each row has its own hover fill and the list holds its rows alone', () => {
    render(<Things />)
    const list = screen.getByRole('list', { name: 'Messages' })
    expect(list.hasAttribute('data-hover-follow')).toBe(false)
    expect(list.getAttribute('style')).toBeNull()
    expect(Array.from(list.children).map((child) => child.tagName)).toEqual(['LI', 'LI', 'LI'])
    expect(classes(row('Kitchen quote'))).toContain(hoverFill)
  })

  test('with motion the rows leave the fill to one background, which is under the row the mouse is on and goes to the next', async () => {
    render(<Things animated />)
    const list = screen.getByRole('list', { name: 'Messages' })
    expect(list.hasAttribute('data-hover-follow')).toBe(true)
    // The list is what the background is placed in, and a layer of its own, so the background is under its rows.
    expect(list.style.position).toBe('relative')
    expect(list.style.isolation).toBe('isolate')
    expect(classes(row('Kitchen quote'))).not.toContain(hoverFill)
    expect(followers()).toEqual([])
    fireEvent.pointerOver(row('Kitchen quote'), { pointerType: 'mouse' })
    await settle(0)
    expect(followers()).toHaveLength(1)
    const mark = followers()[0] as HTMLElement
    // A list holds list items alone: the background is one, kept from screen readers, and takes no pointer.
    expect(mark.tagName).toBe('LI')
    expect(mark.parentElement).toBe(list)
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.getAttribute('role')).toBe('presentation')
    expect(mark.style.pointerEvents).toBe('none')
    fireEvent.pointerOver(row('Invoice'), { pointerType: 'mouse' })
    await settle(0)
    expect(followers()).toHaveLength(1)
    // The rows are still the buttons they were: the chosen one is current, each takes the focus and a press.
    expect(row('Receipt').getAttribute('aria-current')).toBe('true')
    act(() => row('Invoice').focus())
    expect(document.activeElement).toBe(row('Invoice'))
  })

  test('a finger has no hover: no background for a touch', async () => {
    render(<Things animated />)
    fireEvent.pointerOver(row('Kitchen quote'), { pointerType: 'touch' })
    await settle(0)
    expect(followers()).toEqual([])
  })

  test('it leaves with the pointer, and with the row it was under', async () => {
    const { rerender } = render(<Things animated />)
    fireEvent.pointerOver(row('Kitchen quote'), { pointerType: 'mouse' })
    await settle(0)
    expect(followers()).toHaveLength(1)
    fireEvent.pointerLeave(screen.getByRole('list', { name: 'Messages' }))
    await waitFor(() => expect(followers()).toEqual([]))
    fireEvent.pointerOver(row('Invoice'), { pointerType: 'mouse' })
    await settle(0)
    expect(followers()).toHaveLength(1)
    rerender(<Things animated names={['Kitchen quote', 'Receipt']} />)
    await waitFor(() => expect(followers()).toEqual([]))
  })

  test('HoverFollow does the same for rows of an app\'s own, found by a selector inside the element that holds them', async () => {
    function Own({ animated }: { animated: boolean }) {
      const [holder, setHolder] = useState<HTMLDivElement | null>(null)
      return (
        <div ref={setHolder} data-testid="holder">
          <button type="button" data-row="">First</button>
          <button type="button" data-row="">Second</button>
          <p>Not a row</p>
          <HoverFollow container={holder} rows="[data-row]" animated={animated} />
        </div>
      )
    }
    const { rerender } = render(<Own animated={false} />)
    const holder = screen.getByTestId('holder')
    expect(holder.hasAttribute('data-hover-follow')).toBe(false)
    expect(holder.getAttribute('style')).toBeNull()
    rerender(<Own animated />)
    expect(holder.hasAttribute('data-hover-follow')).toBe(true)
    expect(holder.style.position).toBe('relative')
    fireEvent.pointerOver(row('Second'), { pointerType: 'mouse' })
    await settle(0)
    expect(followers()).toHaveLength(1)
    expect(followers()[0]!.tagName).toBe('DIV')
    expect(followers()[0]!.parentElement).toBe(holder)
    // Over what is not a row, the background goes.
    fireEvent.pointerOver(screen.getByText('Not a row'), { pointerType: 'mouse' })
    await waitFor(() => expect(followers()).toEqual([]))
    // Motion off again: the holder is as it was.
    rerender(<Own animated={false} />)
    expect(holder.hasAttribute('data-hover-follow')).toBe(false)
    expect(holder.style.position).toBe('')
    expect(holder.style.isolation).toBe('')
  })
})

describe('a popover that hangs from something other than its button', () => {
  const OPTS = [
    { value: 'any', label: 'Any time' },
    { value: 'week', label: 'This week' },
  ]

  /** The filters under a search field: the field is outside the popover, and the app opens and closes the card. */
  function Filters({ onOpenChange, inside = false }: { onOpenChange: (open: boolean) => void; inside?: boolean }) {
    const [open, setOpen] = useState(true)
    const [field, setField] = useState<HTMLDivElement | null>(null)
    const [query, setQuery] = useState('')
    const [when, setWhen] = useState('any')
    const change = (next: boolean) => {
      onOpenChange(next)
      setOpen(next)
    }
    const search = <SearchField aria-label="Search the mail" value={query} onValueChange={setQuery} />
    return (
      <>
        {inside ? null : <div ref={setField}>{search}</div>}
        <Popover open={open} onOpenChange={change} {...(inside ? {} : { anchor: field })}>
          {inside ? <PopoverAnchor>{search}</PopoverAnchor> : null}
          <PopoverContent initialFocus={false} width="xl" aria-label="Search filters">
            <Select aria-label="When" options={OPTS} value={when} onValueChange={setWhen} />
            <button type="button">Apply</button>
          </PopoverContent>
        </Popover>
        <button type="button">Elsewhere</button>
      </>
    )
  }
  const card = () => document.querySelector('[data-slot="popover-content"]')

  test.each<[string, boolean]>([
    ['given with `anchor`', false],
    ['wrapped in PopoverAnchor', true],
  ])('the anchor %s: the focus stays in the field, a press on the field keeps the card, a press elsewhere closes it', async (_name, inside) => {
    const onOpenChange = vi.fn()
    render(<Filters onOpenChange={onOpenChange} inside={inside} />)
    const box = screen.getByRole('searchbox', { name: 'Search the mail' })
    act(() => box.focus())
    await settle(120)
    expect(card()).not.toBeNull()
    // Open, the card does not take the focus from the field the user is typing in.
    expect(document.activeElement).toBe(box)
    fireEvent.change(box, { target: { value: 'invoice' } })
    await pressOn(box)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(card()).not.toBeNull()
    await pressOn(screen.getByRole('button', { name: 'Apply' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    await pressOn(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  test('Esc closes it', async () => {
    const onOpenChange = vi.fn()
    render(<Filters onOpenChange={onOpenChange} />)
    const box = screen.getByRole('searchbox', { name: 'Search the mail' })
    act(() => box.focus())
    await settle(120)
    fireEvent.keyDown(box, { key: 'Escape' })
    await settle(120)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  test('a list a control of the card opens is part of the card: choosing in it does not close the card', async () => {
    const onOpenChange = vi.fn()
    render(<Filters onOpenChange={onOpenChange} />)
    await settle(120)
    fireEvent.click(screen.getByRole('combobox', { name: 'When' }))
    await settle(0)
    await pressOn(await screen.findByRole('option', { name: 'This week' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(card()).not.toBeNull()
    expect(screen.getByRole('combobox', { name: 'When' }).textContent).toContain('This week')
  })

  test('the card is as wide as the step asked for, and never wider than the room the window leaves', async () => {
    render(<Filters onOpenChange={() => {}} />)
    await settle(120)
    expect(classes(card())).toEqual(expect.arrayContaining(['w-xl', 'max-w-(--available-width)']))
    expect(classes(card())).not.toContain('w-80')
  })

  test('closing, a card fades where motion is on: the stylesheet has its exit, under the gate of motion', () => {
    const gate = themeCss.indexOf('@media (prefers-reduced-motion: no-preference)', themeCss.indexOf('@keyframes surface-leave'))
    const leaving = themeCss.indexOf('[data-ending-style] {', gate)
    expect(gate).toBeGreaterThan(-1)
    expect(leaving).toBeGreaterThan(gate)
    const rule = themeCss.slice(themeCss.lastIndexOf(':where(:root[data-motion])', leaving), themeCss.indexOf('}', leaving) + 1)
    for (const slot of ['popover-content', 'dropdown-menu-content', 'select-content', 'tooltip-content', 'dialog-content', 'sheet-content']) expect(rule, slot).toContain(`[data-slot="${slot}"]`)
    expect(rule).toMatch(/opacity:\s*0/)
  })
})

describe('the quiet search field of a bar', () => {
  const quiet = FIELD_QUIET.split(' ')
  const box = () => screen.getByRole('searchbox', { name: 'Search' })

  test('by default it is the field of every form: its border, no fill, the corners of a control', () => {
    render(<SearchField aria-label="Search" value="" onValueChange={() => {}} />)
    expect(document.querySelector('[data-slot="search-field"]')!.hasAttribute('data-variant')).toBe(false)
    expect(classes(box())).toEqual(expect.arrayContaining(['rounded-md', 'border', 'border-line', 'bg-transparent']))
    for (const c of quiet) expect(classes(box()), c).not.toContain(c)
  })

  test('quiet, it has a fill, a clear border and the rounder corners, is as tall as every field and has the same focus ring', () => {
    render(<SearchField aria-label="Search" variant="quiet" value="invoice" onValueChange={() => {}} />)
    expect(document.querySelector('[data-slot="search-field"]')!.getAttribute('data-variant')).toBe('quiet')
    expect(classes(box())).toEqual(expect.arrayContaining(quiet))
    // What it replaces is gone, each on its own chain: the corners, the divider at rest and under a strong theme, the darker border under the pointer.
    for (const c of ['rounded-md', 'border-line', 'bg-transparent']) expect(classes(box()), c).not.toContain(c)
    expect(classes(box()).filter((c) => c.endsWith('border-input'))).toEqual([])
    // The border is still drawn, clear: the field keeps its size, and forced colours show it.
    expect(classes(box())).toEqual(expect.arrayContaining(['border', 'border-transparent', FIELD_QUIET_RADIUS]))
    // The corners are a step of the toolkit's radii, said in one place.
    expect(FIELD_QUIET_RADIUS).toMatch(/^rounded-(sm|md|lg)$/)
    // The height, the ring and the invalid colour are the field's own.
    const plain = render(<SearchField aria-label="Plain" value="" onValueChange={() => {}} />)
    const kept = classes(plain.getByRole('searchbox', { name: 'Plain' })).filter((c) => /control-md|outline|aria-invalid:border-destructive|min-h-11/.test(c) && !c.includes('hover'))
    expect(kept.length).toBeGreaterThan(4)
    expect(classes(box())).toEqual(expect.arrayContaining(kept))
  })
})
