// The direction of the page passed to Ark UI: a page written from the right (`<html dir="rtl">`) makes every Ark-based
// part of an `AppShell` right to left (Ark writes `dir="rtl"` and its keys and geometry follow it), it follows the page
// while the app is open, and a `DirectionProvider` does the same outside a frame or gives a subtree its own direction.
// jsdom computes `direction` from the `dir` attributes, so the parts' own reads of it are real here, never mocked; it
// lays nothing out, so the sizes a row of tabs scrolls by are given by hand.
import { useLocaleContext } from '@ark-ui/react/locale'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DirectionProvider } from '../src'
import { RTL_SCRIPTS } from '../src/internal/direction'
import { CommandPalette } from '../src/assemblies'
import { Toasts } from '../src/components'
import { AppShell, DocumentTab, DocumentTabs, NavItem, Sidebar } from '../src/layout'
import { Slider, Tabs, TabsList, TabsTrigger, ToggleGroup, ToggleGroupItem } from '../src/primitives'
import { settle } from './helpers'

afterEach(() => {
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
  vi.restoreAllMocks()
})

/** The page's direction, as an app sets it. */
const page = (dir: 'ltr' | 'rtl') => document.documentElement.setAttribute('dir', dir)
const press = async (key: string) => {
  await act(async () => {
    fireEvent.keyDown(document.activeElement!, { key })
  })
  await settle(30)
}

function Panels() {
  const [value, setValue] = useState('a')
  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabsList aria-label="Panels">
        <TabsTrigger value="a">One</TabsTrigger>
        <TabsTrigger value="b">Two</TabsTrigger>
        <TabsTrigger value="c">Three</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

const tab = (name: string) => screen.getByRole('tab', { name })

describe('an AppShell follows the page', () => {
  test('in a page written from the right, Ark writes dir="rtl" on the tabs and the arrow Left goes to the next tab', async () => {
    page('rtl')
    render(<AppShell contentLabel="Notes"><Panels /></AppShell>)
    expect(screen.getByRole('tablist', { name: 'Panels' }).getAttribute('dir')).toBe('rtl')
    for (const name of ['One', 'Two', 'Three']) expect(tab(name).getAttribute('dir'), name).toBe('rtl')
    act(() => tab('One').focus())
    await press('ArrowLeft')
    // Three tabs, from the first: the next is the second, not the last the focus would wrap to.
    await waitFor(() => expect(document.activeElement).toBe(tab('Two')))
    await press('ArrowRight')
    await waitFor(() => expect(document.activeElement).toBe(tab('One')))
  })

  test('from the left nothing changes: dir="ltr" and the arrow Right goes to the next tab', async () => {
    render(<AppShell contentLabel="Notes"><Panels /></AppShell>)
    expect(screen.getByRole('tablist', { name: 'Panels' }).getAttribute('dir')).toBe('ltr')
    act(() => tab('One').focus())
    await press('ArrowRight')
    await waitFor(() => expect(document.activeElement).toBe(tab('Two')))
  })

  test('live: the parts turn when the page turns, and back', async () => {
    render(<AppShell contentLabel="Notes"><Panels /></AppShell>)
    const list = () => screen.getByRole('tablist', { name: 'Panels' })
    expect(list().getAttribute('dir')).toBe('ltr')
    await act(async () => page('rtl'))
    await waitFor(() => expect(list().getAttribute('dir')).toBe('rtl'))
    await act(async () => document.documentElement.removeAttribute('dir'))
    await waitFor(() => expect(list().getAttribute('dir')).toBe('ltr'))
  })

  test('live: the arrows of a row of tabs too long for its room turn with the row, and back', async () => {
    const { container } = render(
      <AppShell contentLabel="Notes">
        <Tabs value="a" onValueChange={vi.fn()}>
          <TabsList aria-label="Filters" overflow="buttons">
            <TabsTrigger value="a">All</TabsTrigger>
            <TabsTrigger value="b">Open</TabsTrigger>
          </TabsList>
        </Tabs>
      </AppShell>,
    )
    const icons = () => ['tabs-scroll-prev', 'tabs-scroll-next'].map((slot) => container.querySelector(`[data-slot="${slot}"] svg`)?.getAttribute('class') ?? '')
    expect(icons().some((c) => c.includes('-scale-x-100'))).toBe(false)
    await act(async () => page('rtl'))
    await waitFor(() => expect(screen.getByRole('tablist', { name: 'Filters' }).getAttribute('dir')).toBe('rtl'))
    // Nothing else changed (no scroll, no resize, no tab): the row's new `dir` alone is measured.
    await waitFor(() => {
      for (const c of icons()) expect(c).toContain('-scale-x-100')
    })
    await act(async () => page('ltr'))
    await waitFor(() => expect(icons().some((c) => c.includes('-scale-x-100'))).toBe(false))
  })
})

describe('DirectionProvider, for the parts outside a frame', () => {
  test('with dir="rtl", the parts under it are right to left in a page written from the left', async () => {
    render(<DirectionProvider dir="rtl"><Panels /></DirectionProvider>)
    expect(screen.getByRole('tablist', { name: 'Panels' }).getAttribute('dir')).toBe('rtl')
    act(() => tab('One').focus())
    await press('ArrowLeft')
    await waitFor(() => expect(document.activeElement).toBe(tab('Two')))
  })

  test('with dir="ltr", a subtree stays left to right in a page written from the right, inside an AppShell too', () => {
    page('rtl')
    render(<AppShell contentLabel="Notes"><DirectionProvider dir="ltr"><Panels /></DirectionProvider></AppShell>)
    expect(screen.getByRole('tablist', { name: 'Panels' }).getAttribute('dir')).toBe('ltr')
  })

  test('around an AppShell, a dir is the frame\'s too: a provider without dir follows the nearest one with a dir, else the page', () => {
    const { unmount } = render(<DirectionProvider dir="rtl"><AppShell contentLabel="Notes"><Panels /></AppShell></DirectionProvider>)
    expect(screen.getByRole('tablist', { name: 'Panels' }).getAttribute('dir')).toBe('rtl')
    unmount()
    page('rtl')
    render(<DirectionProvider dir="ltr"><DirectionProvider><AppShell contentLabel="Notes"><Panels /></AppShell></DirectionProvider></DirectionProvider>)
    expect(screen.getByRole('tablist', { name: 'Panels' }).getAttribute('dir')).toBe('ltr')
  })

  test('without dir, it follows the page, live', async () => {
    render(<DirectionProvider><Panels /></DirectionProvider>)
    const list = () => screen.getByRole('tablist', { name: 'Panels' })
    expect(list().getAttribute('dir')).toBe('ltr')
    await act(async () => page('rtl'))
    await waitFor(() => expect(list().getAttribute('dir')).toBe('rtl'))
    await act(async () => page('ltr'))
    await waitFor(() => expect(list().getAttribute('dir')).toBe('ltr'))
  })

  /** What Ark is given: its locale and the direction it reads from it. */
  function Given() {
    const { locale, dir } = useLocaleContext()
    return <output data-testid="given">{`${locale} ${dir}`}</output>
  }
  const given = () => screen.getByTestId('given').textContent

  test("Ark's own en-US from the left, whatever the page's language; from the right the page's language when it is written so, else ar", async () => {
    document.documentElement.setAttribute('lang', 'ar-EG')
    render(<DirectionProvider><Given /></DirectionProvider>)
    expect(given()).toBe('en-US ltr')
    await act(async () => page('rtl'))
    await waitFor(() => expect(given()).toBe('ar-EG rtl'))
    // The language alone changes: Ark is told.
    await act(async () => document.documentElement.setAttribute('lang', 'he'))
    await waitFor(() => expect(given()).toBe('he rtl'))
    // A language written from the left, none, or a tag that is not one: the stand-in.
    for (const lang of ['en', '', 'not a tag']) {
      await act(async () => document.documentElement.setAttribute('lang', lang))
      await waitFor(() => expect(given(), lang).toBe('ar rtl'))
    }
  })

  test('each script the bridge takes as written from the right is one Ark reads so: the page\'s language is passed on, and Ark says rtl', async () => {
    const scripts = [...RTL_SCRIPTS]
    expect(scripts.length).toBeGreaterThan(0)
    page('rtl')
    render(<DirectionProvider><Given /></DirectionProvider>)
    for (const script of scripts) {
      await act(async () => document.documentElement.setAttribute('lang', `und-${script}`))
      await waitFor(() => expect(given(), script).toBe(`und-${script} rtl`))
    }
  })

  test('a page made right to left by its stylesheet counts: the direction is the one the browser computes', async () => {
    const style = document.createElement('style')
    style.textContent = 'html.mirrored { direction: rtl; }'
    document.head.append(style)
    try {
      render(<DirectionProvider><Given /></DirectionProvider>)
      expect(given()).toBe('en-US ltr')
      await act(async () => document.documentElement.classList.add('mirrored'))
      await waitFor(() => expect(given()).toBe('ar rtl'))
    } finally {
      document.documentElement.classList.remove('mirrored')
      style.remove()
    }
  })
})

describe('the parts an app puts beside its AppShell follow the page by themselves', () => {
  test('Toasts beside the frame, in a page written from the right: the region and its notices are right to left', async () => {
    page('rtl')
    render(
      <>
        <AppShell contentLabel="Notes">Body</AppShell>
        <Toasts items={[{ id: 'saved', text: 'Saved' }]} />
      </>,
    )
    await settle()
    expect(screen.getByRole('status', { name: 'Notices' }).getAttribute('dir')).toBe('rtl')
    // A notice writes no `dir` of its own: it is written the region's way.
    expect(getComputedStyle(screen.getByText('Saved').closest('[data-part="root"]')!).direction).toBe('rtl')
  })

  test('the command palette beside the frame, in a page written from the right: its window is right to left', async () => {
    page('rtl')
    render(
      <>
        <AppShell contentLabel="Notes">Body</AppShell>
        <CommandPalette open onOpenChange={vi.fn()} commands={[{ id: 'find', label: 'Search', onSelect: vi.fn() }]} />
      </>,
    )
    await settle()
    expect(screen.getByRole('dialog').getAttribute('dir')).toBe('rtl')
  })
})

describe('the parts whose keys follow the direction', () => {
  test('DocumentTabs in the one top row of an RTL sheet frame: the strip is right to left and steps toward its left', async () => {
    page('rtl')
    const { container } = render(
      <AppShell
        frame="sheet"
        top="unified"
        contentLabel="Notes"
        sidebar={<Sidebar aria-label="Places"><NavItem icon={<svg />}>All</NavItem></Sidebar>}
        tabs={
          <DocumentTabs aria-label="Open notes" value="a" onValueChange={vi.fn()} onAdd={vi.fn()}>
            <DocumentTab value="a">Alpha</DocumentTab>
            <DocumentTab value="b">Beta</DocumentTab>
          </DocumentTabs>
        }
      >
        Body
      </AppShell>,
    )
    const list = screen.getByRole('tablist', { name: 'Open notes' })
    expect(list.getAttribute('dir')).toBe('rtl')
    // The row's own direction, as the browser computes it: not mocked.
    expect(getComputedStyle(list).direction).toBe('rtl')
    const scrollBy = vi.fn()
    Object.defineProperties(list, { scrollWidth: { value: 600, configurable: true }, clientWidth: { value: 200, configurable: true }, scrollLeft: { value: 0, configurable: true } })
    list.scrollBy = scrollBy
    fireEvent(window, new Event('resize'))
    fireEvent.scroll(list)
    fireEvent.click(container.querySelector('[data-slot="tabs-scroll-next"]')!)
    // Three quarters of the row (150 of 200) toward the end of its line: the left, where `scrollLeft` goes below 0.
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -150 }))
  })

  function Views() {
    const [value, setValue] = useState('list')
    return (
      <ToggleGroup aria-label="View" value={value} onValueChange={setValue}>
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="board">Board</ToggleGroupItem>
        <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
      </ToggleGroup>
    )
  }
  const button = (name: string) => screen.getByRole('button', { name })

  test('ToggleGroup: from the right the arrow Left goes to the next item, Right back', async () => {
    page('rtl')
    render(<AppShell contentLabel="Notes"><Views /></AppShell>)
    expect(screen.getByRole('group', { name: 'View' }).getAttribute('dir')).toBe('rtl')
    act(() => button('List').focus())
    await press('ArrowLeft')
    await waitFor(() => expect(document.activeElement).toBe(button('Board')))
    await press('ArrowRight')
    await waitFor(() => expect(document.activeElement).toBe(button('List')))
  })

  test('ToggleGroup: from the left the arrow Right goes to the next item, as before', async () => {
    render(<AppShell contentLabel="Notes"><Views /></AppShell>)
    act(() => button('List').focus())
    await press('ArrowRight')
    await waitFor(() => expect(document.activeElement).toBe(button('Board')))
    await press('ArrowLeft')
    await waitFor(() => expect(document.activeElement).toBe(button('List')))
  })

  function Zoom({ onValue }: { onValue: (value: number) => void }) {
    const [value, setValue] = useState(40)
    return (
      <Slider
        aria-label="Zoom"
        value={value}
        min={0}
        max={100}
        step={10}
        onValueChange={(next) => {
          onValue(next)
          setValue(next)
        }}
      />
    )
  }

  test('Slider: from the right the arrow Left grows the value and Right shrinks it; Up still grows it and Down shrinks it', async () => {
    page('rtl')
    const spy = vi.fn()
    render(<AppShell contentLabel="Notes"><Zoom onValue={spy} /></AppShell>)
    const thumb = screen.getByRole('slider', { hidden: true })
    expect(thumb.getAttribute('dir')).toBe('rtl')
    act(() => thumb.focus())
    for (const [key, want] of [['ArrowLeft', 50], ['ArrowRight', 40], ['ArrowUp', 50], ['ArrowDown', 40]] as const) {
      fireEvent.keyDown(thumb, { key })
      await settle(120)
      expect(spy, key).toHaveBeenLastCalledWith(want)
    }
  })
})
