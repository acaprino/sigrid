// The strip of open documents (`DocumentTabs`, `DocumentTab`) and the arrows of a row of tabs too long for its room
// (`TabsList overflow="buttons"`). First the look inside the unified sheet: the chosen tab is cut from the sheet, with
// its accent bar and its corners into the sheet. Then a tab closed by its ×, a middle press and Delete, with the focus
// handed on. Then the arrows: their slot is kept when nothing overflows, and they step toward the end of the line in
// both directions of writing. Last the person's colour, the touch size and the rules of glass. jsdom does no layout:
// the sizes the arrows read are given by hand.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { MotionProvider } from '../src'
import { ContextMenu } from '../src/components'
import { HUE_NAMES } from '../src/hues'
import { UnifiedShellContext } from '../src/internal/frame'
import { preloadMotion } from '../src/internal/motion'
import { DocumentTab, DocumentTabs } from '../src/layout/document-tabs'
import { Tabs, TabsList, TabsTrigger } from '../src/primitives/tabs'
import { classes, systemMotion } from './helpers'
import { themeCss } from './theme-tokens'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Gives the row the sizes a browser would measure, and a `scrollBy` to watch. */
function overflowing(list: HTMLElement, scrollLeft = 0) {
  const scrollBy = vi.fn()
  Object.defineProperties(list, { scrollWidth: { value: 600, configurable: true }, clientWidth: { value: 200, configurable: true }, scrollLeft: { value: scrollLeft, configurable: true } })
  list.scrollBy = scrollBy
  fireEvent(window, new Event('resize'))
  fireEvent.scroll(list)
  return scrollBy
}

test('renders active tab with attached-sheet treatment, 2px top accent bar, and concave fillets inside unified sheet context', () => {
  const { container } = render(
    <UnifiedShellContext.Provider value={{ unifiedTop: true, collapsed: false, attachedTabs: true }}>
      <DocumentTabs value="trip" onValueChange={vi.fn()} onAdd={vi.fn()}>
        <DocumentTab value="trip" onClose={vi.fn()}>Trip</DocumentTab>
        <DocumentTab value="ideas" onClose={vi.fn()}>Ideas</DocumentTab>
      </DocumentTabs>
    </UnifiedShellContext.Provider>,
  )
  expect(container.querySelector('[data-slot="document-tabs"]')?.getAttribute('data-appearance')).toBe('attached')
  const active = container.querySelector('[data-slot="document-tab"][data-selected]')!
  expect(active.querySelector('[data-slot="document-tab-accent"]')).not.toBeNull()
  expect(active.querySelectorAll('[data-slot="document-tab-fillet"]').length).toBeGreaterThan(0)
  // One tab is chosen, and the tab's name is its title: the × is beside the tab, never inside it.
  expect(container.querySelectorAll('[data-slot="document-tab"][data-selected]')).toHaveLength(1)
  expect(screen.getByRole('tab', { name: 'Trip' }).querySelector('button')).toBeNull()
  expect(active.querySelector('[data-slot="tabs-trigger"]')?.parentElement).toBe(active)
  // Outside the unified sheet the strip is the plain row of pills.
  const plain = render(
    <DocumentTabs value="trip" onValueChange={vi.fn()}>
      <DocumentTab value="trip">Trip</DocumentTab>
    </DocumentTabs>,
  )
  expect(plain.container.querySelector('[data-slot="document-tabs"]')?.getAttribute('data-appearance')).toBe('pill')
  expect(plain.container.querySelector('[data-slot="document-tab-accent"]')).toBeNull()
  expect(plain.container.querySelector('[data-slot="document-tab-fillet"]')).toBeNull()
})

test('with motion on, the chosen attached tab is the same as without: no sliding tint over its paper and its accent bar', async () => {
  await preloadMotion()
  systemMotion(false)
  const strip = (appearance: 'attached' | 'pill') => (
    <DocumentTabs value="trip" onValueChange={vi.fn()} appearance={appearance} animated>
      <DocumentTab value="trip">Trip</DocumentTab>
      <DocumentTab value="ideas">Ideas</DocumentTab>
    </DocumentTabs>
  )
  // The pills keep their sliding tint: motion is really on here.
  const pill = render(<MotionProvider animated>{strip('pill')}</MotionProvider>)
  expect(pill.container.querySelectorAll('[data-slot="highlight"]')).toHaveLength(1)
  pill.unmount()
  // Attached, on the strip's own word and on the app's (a `MotionProvider` for the whole page): the chosen tab is the
  // sheet's paper with its accent bar, and nothing tinted lies over it.
  for (const provided of [false, true]) {
    const { container, unmount } = render(provided ? <MotionProvider animated>{strip('attached')}</MotionProvider> : strip('attached'))
    const chosen = container.querySelector('[data-slot="document-tab"][data-selected]')!
    expect(container.querySelector('[data-slot="highlight"]'), `provided: ${provided}`).toBeNull()
    expect(classes(chosen)).toEqual(expect.arrayContaining(['bg-paper', 'border-line']))
    expect(chosen.querySelector('[data-slot="document-tab-accent"]')).not.toBeNull()
    unmount()
  }
})

test('closes tab via × button, middle-click, and Delete key, moving focus to adjacent tab or + button when last tab closes (value={null})', () => {
  function Harness() {
    const [tabs, setTabs] = useState([{ id: 'trip', title: 'Trip' }, { id: 'ideas', title: 'Ideas' }])
    const [active, setActive] = useState<string | null>('trip')
    const close = (id: string) => {
      setTabs((list) => {
        const idx = list.findIndex((t) => t.id === id)
        const next = list.filter((t) => t.id !== id)
        setActive(next[idx]?.id ?? next[idx - 1]?.id ?? null)
        return next
      })
    }
    return (
      <DocumentTabs value={active} onValueChange={setActive} onAdd={() => {}}>
        {tabs.map((t) => <DocumentTab key={t.id} value={t.id} onClose={() => close(t.id)}>{t.title}</DocumentTab>)}
      </DocumentTabs>
    )
  }
  const { container } = render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Close Trip' }))
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Ideas' }))
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Ideas' }), { key: 'Delete' })
  expect(screen.queryAllByRole('tab')).toHaveLength(0)
  expect(document.activeElement).toBe(container.querySelector('[data-slot="document-tabs-add"]'))
})

test('a middle press closes a tab; the × is out of the Tab order; a tab that cannot close has no ×', () => {
  const onClose = vi.fn()
  render(
    <DocumentTabs value="trip" onValueChange={vi.fn()}>
      <DocumentTab value="trip" onClose={onClose}>Trip</DocumentTab>
      <DocumentTab value="ideas" closable={false} onClose={vi.fn()}>Ideas</DocumentTab>
      <DocumentTab value="notes" onClose={vi.fn()} closeLabel="Close the notes">Notes</DocumentTab>
    </DocumentTabs>,
  )
  fireEvent(screen.getByRole('tab', { name: 'Trip' }), new MouseEvent('auxclick', { bubbles: true, button: 1 }))
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent(screen.getByRole('tab', { name: 'Trip' }), new MouseEvent('auxclick', { bubbles: true, button: 2 }))
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Close Trip' }).tabIndex).toBe(-1)
  expect(screen.queryByRole('button', { name: 'Close Ideas' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Close the notes' })).toBeTruthy()
})

test('with no tab and no value the strip draws cleanly and keeps its + (value={null})', () => {
  const error = vi.spyOn(console, 'error')
  const { container } = render(<DocumentTabs value={null} onValueChange={vi.fn()} onAdd={vi.fn()} />)
  expect(screen.getByRole('tablist', { name: 'Open tabs' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'New tab' })).toBe(container.querySelector('[data-slot="document-tabs-add"]'))
  expect(container.querySelector('[data-slot="tabs-scroll-next"]')).not.toBeNull()
  render(<DocumentTabs value={undefined} onValueChange={vi.fn()} />)
  expect(error).not.toHaveBeenCalled()
})

test('keeps fixed disabled overflow > slot without overflow and scrolls logically in LTR and RTL when overflowing', () => {
  const { container } = render(
    <div dir="rtl">
      <DocumentTabs value="a" onValueChange={vi.fn()} onAdd={vi.fn()}>
        <DocumentTab value="a">Alpha</DocumentTab>
        <DocumentTab value="b">Beta</DocumentTab>
      </DocumentTabs>
    </div>,
  )
  const next = container.querySelector<HTMLButtonElement>('[data-slot="tabs-scroll-next"]')!
  expect(next).not.toBeNull()
  expect(next.disabled).toBe(true)
  // The slot comes before the divider and the +, in both states: only the arrow's state changes.
  const order = () => [...container.querySelectorAll('[data-slot="tabs-scroll-next"], [data-slot="document-tabs-divider"], [data-slot="document-tabs-add"]')].map((el) => el.getAttribute('data-slot'))
  expect(order()).toEqual(['tabs-scroll-next', 'document-tabs-divider', 'document-tabs-add'])
  const list = container.querySelector<HTMLElement>('[data-slot="tabs-list"]')!
  const scrollBy = vi.fn()
  Object.defineProperties(list, { scrollWidth: { value: 600, configurable: true }, clientWidth: { value: 200, configurable: true }, scrollLeft: { value: 0, configurable: true } })
  list.scrollBy = scrollBy
  fireEvent(window, new Event('resize'))
  fireEvent.scroll(list)
  expect(next.disabled).toBe(false)
  fireEvent.click(next)
  expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number) }))
  expect(order()).toEqual(['tabs-scroll-next', 'document-tabs-divider', 'document-tabs-add'])
  // Only one arrow forward: the strip adds none of its own.
  expect(container.querySelectorAll('[data-slot="tabs-scroll-next"]')).toHaveLength(1)
  // The arrow, the divider and the + are written the way the row is, whatever the page around it: the order holds.
  const direction = (el: Element) => getComputedStyle(el).direction
  for (const slot of ['tabs-scroll-next', 'document-tabs-divider', 'document-tabs-add']) {
    expect(direction(container.querySelector(`[data-slot="${slot}"]`)!), slot).toBe(direction(list))
  }
})

test('a row written from the right steps toward its left, and its arrows and corners point that way', () => {
  const real = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
    const style = real(el, pseudo)
    return new Proxy(style, { get: (target, key) => (key === 'direction' ? 'rtl' : Reflect.get(target, key)) })
  })
  const { container } = render(
    <DocumentTabs value="a" onValueChange={vi.fn()} appearance="attached">
      <DocumentTab value="a">Alpha</DocumentTab>
      <DocumentTab value="b">Beta</DocumentTab>
    </DocumentTabs>,
  )
  const list = container.querySelector<HTMLElement>('[data-slot="tabs-list"]')!
  const scrollBy = overflowing(list, -100)
  // Three quarters of the row (150 of 200), never less than 120, toward the end of the line: the left.
  fireEvent.click(container.querySelector('[data-slot="tabs-scroll-next"]')!)
  expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -150 }))
  fireEvent.click(container.querySelector('[data-slot="tabs-scroll-prev"]')!)
  expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: 150 }))
  for (const slot of ['tabs-scroll-next', 'tabs-scroll-prev']) {
    expect(container.querySelector(`[data-slot="${slot}"] svg`)?.getAttribute('class'), slot).toContain('-scale-x-100')
  }
  // The corners are mirrored by the row's own direction (`:dir()`), not by an attribute of the page.
  for (const svg of container.querySelectorAll('[data-slot="document-tab-fillet"] svg')) expect(svg.getAttribute('class')).toContain('[&:dir(rtl)]' + ':-scale-x-100')
})

test('from the left, the arrow steps right; scrolled away from the start an arrow steps back, before the arrow forward; at the end the arrow forward is disabled', () => {
  const { container } = render(
    <Tabs value="a" onValueChange={vi.fn()}>
      <TabsList aria-label="Filters" overflow="buttons">
        <TabsTrigger value="a">All</TabsTrigger>
        <TabsTrigger value="b">Open</TabsTrigger>
      </TabsList>
    </Tabs>,
  )
  const list = screen.getByRole('tablist', { name: 'Filters' })
  expect(list.getAttribute('data-slot')).toBe('tabs-list')
  // The arrows say there is more: the faded edges are not drawn as well.
  expect(list.hasAttribute('data-scroll-shade')).toBe(false)
  expect(list.className).toMatch(/overflow-x-auto/)
  expect(container.querySelector('[data-slot="tabs-scroll-prev"]')).toBeNull()
  let scrollBy = overflowing(list)
  // A press on an arrow does not take the focus (it is out of the Tab order).
  expect(fireEvent.mouseDown(container.querySelector('[data-slot="tabs-scroll-next"]')!)).toBe(false)
  fireEvent.click(container.querySelector('[data-slot="tabs-scroll-next"]')!)
  expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: 150 }))
  scrollBy = overflowing(list, 100)
  const prev = container.querySelector<HTMLButtonElement>('[data-slot="tabs-scroll-prev"]')!
  expect(prev).not.toBeNull()
  expect(fireEvent.mouseDown(prev)).toBe(false)
  expect(prev.compareDocumentPosition(container.querySelector('[data-slot="tabs-scroll-next"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(prev)
  expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -150 }))
  overflowing(list, 400)
  expect(container.querySelector<HTMLButtonElement>('[data-slot="tabs-scroll-next"]')!.disabled).toBe(true)
  expect(screen.getByRole('button', { name: 'Scroll tabs forward' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Scroll tabs backward' })).toBeTruthy()
})

test('a row that scrolls with its shade (the default) is drawn as before: no arrows, no wrapper', () => {
  const { container } = render(
    <Tabs value="a" onValueChange={vi.fn()}>
      <TabsList aria-label="Filters" scroll>
        <TabsTrigger value="a">All</TabsTrigger>
      </TabsList>
    </Tabs>,
  )
  const list = screen.getByRole('tablist', { name: 'Filters' })
  expect(list.getAttribute('data-scroll-shade')).toBe('x')
  expect(list.parentElement?.getAttribute('data-slot')).toBe('tabs')
  expect(container.querySelector('[data-slot="tabs-scroll-next"]')).toBeNull()
})

/**
 * Lays a row of tabs out as a browser would, for what jsdom does not measure: the row 200px wide on the screen, its
 * room at its start and its end (its padding, `start` and `end`), its tabs side by side after the start room (`tab`
 * wide, 100px at first),
 * and a `scrollLeft` that moves them (0 to the right of the start, below 0 written from the right), the row `x` from the
 * screen's left. The row's direction and padding are what `getComputedStyle` says of it. A child of the row with the
 * class `contents` (a `ContextMenu`'s wrapper) is `display: contents`, as the stylesheet makes it: it has no box (its
 * rect is all zeros, as a browser gives it) and the tabs inside it are laid out in its place. Returns the row's
 * `scrollLeft`, read live.
 */
function laidOut(list: HTMLElement, { start, end, rtl = false, scrollLeft = 0, tab = 100, x = 0 }: { start: number; end: number; rtl?: boolean; scrollLeft?: number; tab?: number; x?: number }) {
  const width = 200
  let at = scrollLeft
  const boxless = (el: Element) => el.classList.contains('contents')
  const real = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
    const style = real(el, pseudo)
    const own: Record<string, string> | null =
      el === list ? { direction: rtl ? 'rtl' : 'ltr', paddingLeft: `${rtl ? end : start}px`, paddingRight: `${rtl ? start : end}px` } : boxless(el) ? { display: 'contents' } : null
    if (!own) return style
    return new Proxy(style, { get: (target, key) => (typeof key === 'string' && key in own ? own[key] : Reflect.get(target, key)) })
  })
  const children = Array.from(list.children) as HTMLElement[]
  const items = children.flatMap((child) => (boxless(child) ? (Array.from(child.children) as HTMLElement[]) : [child]))
  Object.defineProperties(list, {
    clientWidth: { value: width, configurable: true },
    scrollWidth: { value: start + items.length * tab + end, configurable: true },
    scrollLeft: { get: () => at, set: (v: number) => { at = v }, configurable: true },
  })
  const rect = (left: number, right: number) => ({ left, right, width: right - left, top: 0, bottom: 40, height: 40, x: left, y: 0, toJSON: () => ({}) }) as DOMRect
  list.getBoundingClientRect = () => rect(x, x + width)
  for (const child of children) if (boxless(child)) child.getBoundingClientRect = () => ({ ...rect(0, 0), bottom: 0, height: 0 })
  items.forEach((item, i) => {
    // From the row's start edge, along the way it is written.
    const from = start + i * tab
    item.getBoundingClientRect = () => (rtl ? rect(x + width - from - tab - at, x + width - from - at) : rect(x + from - at, x + from + tab - at))
  })
  fireEvent(window, new Event('resize'))
  fireEvent.scroll(list)
  return () => at
}

/** A spy in place of `scrollIntoView` (which jsdom lacks), put back as it was afterwards. */
function watchScrollIntoView() {
  const had = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
  const spy = vi.fn()
  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: spy, configurable: true, writable: true })
  return { spy, restore: () => (had ? Object.defineProperty(Element.prototype, 'scrollIntoView', had) : Reflect.deleteProperty(Element.prototype, 'scrollIntoView')) }
}

test('the chosen tab comes into sight by scrolling the row alone, never the page, with the row\'s room at its edges, both ways of writing', () => {
  const into = watchScrollIntoView()
  try {
    for (const rtl of [false, true]) {
      for (const mode of ['buttons', 'scroll'] as const) {
        const row = (value: string) => (
          <Tabs value={value} onValueChange={vi.fn()}>
            <TabsList aria-label="Files" {...(mode === 'buttons' ? { overflow: 'buttons' as const } : { scroll: true })}>
              {['a', 'b', 'c', 'd', 'e'].map((v) => <TabsTrigger key={v} value={v}>{v.toUpperCase()}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        )
        const { rerender, unmount } = render(row('a'))
        const scrolled = laidOut(screen.getByRole('tablist', { name: 'Files' }), { start: 4, end: 10, rtl, tab: 60 })
        const sign = rtl ? -1 : 1
        const where = `${mode}, ${rtl ? 'rtl' : 'ltr'}`
        // The last tab: as far as the row goes, its end room in sight too (5 tabs of 60px and the room, less 200px seen).
        rerender(row('e'))
        expect(scrolled(), where).toBe(sign * 114)
        // Back to the second tab: its start, after the start room, at the row's start; the least move.
        rerender(row('b'))
        expect(scrolled(), where).toBe(sign * 60)
        // A tab already whole in sight: nothing moves.
        rerender(row('c'))
        expect(scrolled(), where).toBe(sign * 60)
        unmount()
        vi.restoreAllMocks()
      }
    }
    // The page around the row is never scrolled to it.
    expect(into.spy).not.toHaveBeenCalled()
  } finally {
    into.restore()
  }
})

test('a tab inside a wrapper with no box of its own (a ContextMenu, as in Workspace) is measured by its own box: the row scrolls to it, both ways of writing', () => {
  for (const rtl of [false, true]) {
    for (const mode of ['buttons', 'scroll'] as const) {
      // As Workspace draws its row: each tab, with its × after it (`end`), inside a `ContextMenu`, whose wrapper is
      // `display: contents`; the row stands 300px from the screen's left.
      const row = (value: string) => (
        <Tabs value={value} onValueChange={vi.fn()}>
          <TabsList aria-label="Files" {...(mode === 'buttons' ? { overflow: 'buttons' as const } : { scroll: true })}>
            {['a', 'b', 'c', 'd', 'e'].map((v) => (
              <ContextMenu key={v} items={[]} label={v}>
                <TabsTrigger value={v} end={<span>x</span>}>{v.toUpperCase()}</TabsTrigger>
              </ContextMenu>
            ))}
          </TabsList>
        </Tabs>
      )
      const { container, rerender, unmount } = render(row('a'))
      const list = screen.getByRole('tablist', { name: 'Files' })
      expect([...list.children].every((child) => child.getAttribute('data-slot') === 'context-menu' && child.classList.contains('contents'))).toBe(true)
      const scrolled = laidOut(list, { start: 4, end: 10, rtl, tab: 60, x: 300 })
      // The boxes laid out are the tabs' items, inside the wrappers.
      expect(container.querySelectorAll('[data-slot="context-menu"] > [data-slot="tabs-item"]')).toHaveLength(5)
      const sign = rtl ? -1 : 1
      const where = `${mode}, ${rtl ? 'rtl' : 'ltr'}`
      rerender(row('e'))
      expect(scrolled(), where).toBe(sign * 114)
      rerender(row('b'))
      expect(scrolled(), where).toBe(sign * 60)
      rerender(row('c'))
      expect(scrolled(), where).toBe(sign * 60)
      unmount()
      vi.restoreAllMocks()
    }
  }
})

test('the room at the row\'s edges is part of the edge: at rest the arrow back is not shown, and with only the end room left the arrow forward is disabled', () => {
  for (const rtl of [false, true]) {
    const { container, unmount } = render(
      <Tabs value="a" onValueChange={vi.fn()}>
        <TabsList aria-label="Files" overflow="buttons">
          {['a', 'b', 'c', 'd', 'e'].map((v) => <TabsTrigger key={v} value={v}>{v.toUpperCase()}</TabsTrigger>)}
        </TabsList>
      </Tabs>,
    )
    const list = screen.getByRole('tablist', { name: 'Files' })
    const sign = rtl ? -1 : 1
    const where = rtl ? 'rtl' : 'ltr'
    const prev = () => container.querySelector('[data-slot="tabs-scroll-prev"]')
    const next = () => container.querySelector<HTMLButtonElement>('[data-slot="tabs-scroll-next"]')!
    // The row runs 8px + 500px + 12px: 320px to scroll.
    laidOut(list, { start: 8, end: 12, rtl })
    const scrollTo = (at: number) => {
      list.scrollLeft = sign * at
      fireEvent.scroll(list)
    }
    // Scrolled within the start room only: the first tab is whole, there is nothing to go back to.
    scrollTo(6)
    expect(prev(), where).toBeNull()
    expect(next().disabled, where).toBe(false)
    scrollTo(20)
    expect(prev(), where).not.toBeNull()
    // 10px left to scroll, inside the 12px end room: the last tab is whole, there is nothing further.
    scrollTo(310)
    expect(next().disabled, where).toBe(true)
    scrollTo(300)
    expect(next().disabled, where).toBe(false)
    unmount()
    vi.restoreAllMocks()
  }
})

test('renders R10 color Dot alongside top accent bar and applies the 44px coarse-pointer minimum + glass CSS rules', () => {
  const { container } = render(
    <DocumentTabs value="trip" onValueChange={vi.fn()} appearance="attached">
      <DocumentTab value="trip" color="amber">Trip</DocumentTab>
    </DocumentTabs>,
  )
  expect(container.querySelector('[data-slot="dot"]')).not.toBeNull()
  // The dot is drawn in the theme's shade of the colour named: amber is the fifth of the palette.
  expect(container.querySelector('[data-slot="dot"]')?.getAttribute('data-mark-hue')).toBe('5')
  expect(container.querySelector('[data-slot="document-tab-accent"]')).not.toBeNull()
  // Tailwind also scans `test/`: a variant and its class are joined with `+` (test/build.test.ts).
  expect(container.querySelector('[data-slot="tabs-trigger"]')?.className).toContain('pointer-coarse' + ':min-h-11')
  const css = themeCss
  expect(css).toContain('[data-material="glass"]')
  expect(css).toContain('[data-slot="document-tab"][data-selected]')
})

test('every colour of the palette is drawn by its name and by its value', () => {
  const { container } = render(
    <DocumentTabs value="red" onValueChange={vi.fn()}>
      {HUE_NAMES.map((hue) => <DocumentTab key={hue} value={hue} color={hue}>{hue}</DocumentTab>)}
      <DocumentTab value="hex" color="#297abc">Blue by value</DocumentTab>
    </DocumentTabs>,
  )
  const hues = [...container.querySelectorAll('[data-slot="dot"]')].map((dot) => dot.getAttribute('data-mark-hue'))
  expect(hues).toEqual([...HUE_NAMES.map((_, at) => String(at + 1)), '11'])
})

test('under glass the chosen tab of the sheet is the sheet\'s glass, and its corners into the sheet are not drawn', () => {
  const gate = '@media (forced-colors: none) and (prefers-reduced-transparency: no-preference)'
  const clean = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = clean.match(/(@media[^{]*)\{\s*([^{}]*\[data-slot="document-tab"\]\[data-selected\][^{}]*)\{([^}]*)\}/)
  expect(rule?.[1]?.trim()).toBe(gate)
  expect(rule?.[2]).toContain('[data-appearance="attached"]')
  expect(rule?.[3]?.trim()).toBe('background-color: var(--glass-sheet, var(--color-paper));')
  const { container } = render(
    <DocumentTabs value="b" onValueChange={vi.fn()} appearance="attached">
      <DocumentTab value="a">Alpha</DocumentTab>
      <DocumentTab value="b">Beta</DocumentTab>
    </DocumentTabs>,
  )
  const fillets = [...container.querySelectorAll('[data-slot="document-tab-fillet"]')]
  expect(fillets.length).toBe(2)
  for (const fillet of fillets) {
    expect(fillet.getAttribute('aria-hidden')).toBe('true')
    expect(fillet.className).toContain('[[data-material=glass]_&]' + ':' + 'hidden')
    expect(fillet.className).toContain('prefers-reduced-transparency:no-preference')
    // Drawn, never painted with a gradient (R7, design:check).
    expect(fillet.querySelector('svg')).not.toBeNull()
  }
})

test('attached, the row keeps room at its end for the last tab\'s corner, so the corner never makes it overflow', () => {
  // The end corner is a square of `--radius-lg` set against the chosen tab's inner edge (`start-full`): it reaches
  // `--radius-lg` less 1px past the tab. The row's end padding is `--radius-lg` itself, so at every radius (6, 10, 14px)
  // the corner stays inside the row's padding box and adds nothing to `scrollWidth`. Pinned here as the two tokens agree;
  // jsdom does no layout. Tailwind also scans `test/`: the class names are joined with `+` (test/build.test.ts).
  const room = 'pe-' + '(--radius-lg)'
  const { container } = render(
    <DocumentTabs value="b" onValueChange={vi.fn()} appearance="attached">
      <DocumentTab value="a">Alpha</DocumentTab>
      <DocumentTab value="b">Beta</DocumentTab>
    </DocumentTabs>,
  )
  const list = container.querySelector<HTMLElement>('[data-slot="tabs-list"]')!
  expect(list.className.split(' ')).toContain(room)
  const end = container.querySelector('[data-slot="document-tab-fillet"][data-side="end"]')!
  expect(end.className.split(' ')).toEqual(expect.arrayContaining(['start-' + 'full', 'size-' + '(--radius-lg)']))
  // The pills have no corners, and no room for them.
  const plain = render(
    <DocumentTabs value="b" onValueChange={vi.fn()} appearance="pill">
      <DocumentTab value="b">Beta</DocumentTab>
    </DocumentTabs>,
  )
  expect(plain.container.querySelector('[data-slot="tabs-list"]')!.className.split(' ')).not.toContain(room)
})

test('the first tab draws no start corner where the strip starts at the sheet\'s start edge; where something stands before it, it curves and the row keeps room for the corner', () => {
  // Composed with `+`: Tailwind also scans the tests (test/build.test.ts).
  const startRoom = 'ps-' + '(--radius-lg)'
  const noCorner = 'group-first/document-tab' + ':hidden'
  const strip = (flushStart: boolean | undefined) => (
    <UnifiedShellContext.Provider value={{ unifiedTop: true, collapsed: false, attachedTabs: true, ...(flushStart === undefined ? {} : { flushStart }) }}>
      <DocumentTabs value="a" onValueChange={vi.fn()}>
        <DocumentTab value="a">Alpha</DocumentTab>
        <DocumentTab value="b">Beta</DocumentTab>
      </DocumentTabs>
    </UnifiedShellContext.Provider>
  )
  const read = (container: HTMLElement) => ({
    room: container.querySelector('[data-slot="tabs-list"]')!.className.split(' ').includes(startRoom),
    corner: !container.querySelector('[data-slot="document-tab-fillet"][data-side="start"]')!.className.split(' ').includes(noCorner),
  })
  // Flush (the frame says so, or says nothing): the first tab's side drops straight into the sheet's side.
  for (const flushStart of [true, undefined]) {
    const { container, unmount } = render(strip(flushStart))
    expect(read(container), String(flushStart)).toEqual({ room: false, corner: false })
    unmount()
  }
  // Not flush (the button that opens the drawer stands before the strip): the first tab curves into the sheet's top
  // line as the others do, and the row keeps `--radius-lg` at its start so the corner stays inside what it scrolls.
  const { container, unmount } = render(strip(false))
  expect(read(container)).toEqual({ room: true, corner: true })
  unmount()
  // Outside any frame, attached by hand: as before, flush.
  const alone = render(
    <DocumentTabs value="a" onValueChange={vi.fn()} appearance="attached">
      <DocumentTab value="a">Alpha</DocumentTab>
    </DocumentTabs>,
  )
  expect(read(alone.container)).toEqual({ room: false, corner: false })
})
