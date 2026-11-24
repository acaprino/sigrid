// A control never changes place between pages or states (the owner's rule, above all on a phone: a control that jumps
// distracts). Two ways the toolkit keeps it: a tool that a view lacks keeps its place, empty (`absent`), and the word of
// a chosen segment, tab or view is as wide as it is when not chosen, so a two-state switch stays where it is in both
// states. jsdom measures no width: what is checked is that the place is there in both states and that each label
// carries its own bold width.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { Tabs, TabsList, TabsTrigger, ToggleGroup, ToggleGroupItem } from '../src/primitives'
import { Toolbar, ToolbarButton, ToolbarSearch, ToolbarSpacer, ToolbarTab, ToolbarTabs } from '../src/layout'
import { noop } from './helpers'

const bar = () => screen.getByRole('toolbar', { name: 'Tools' })
const slots = () => Array.from(bar().children).map((el) => el.getAttribute('data-slot'))

describe('a tool that a view lacks keeps its place', () => {
  function Tools({ filter }: { filter: boolean }) {
    return (
      <Toolbar aria-label="Tools">
        <ToolbarSpacer />
        <ToolbarButton label="Filter" icon={<svg />} absent={!filter} />
        <ToolbarSearch label="Search" value="" onValueChange={noop} absent={!filter} />
        <ToolbarButton label="New task" icon={<svg />} variant="default">
          New task
        </ToolbarButton>
      </Toolbar>
    )
  }

  test('absent, the tool is an empty box of its own size: the tools after it stay where they were', () => {
    const { rerender } = render(<Tools filter />)
    const before = slots()
    const filter = screen.getByRole('button', { name: 'Filter' })
    rerender(<Tools filter={false} />)
    // As many places, in the same order: the solid action at the end has not moved.
    expect(slots()).toHaveLength(before.length)
    const empty = bar().querySelectorAll('[data-slot="toolbar-slot"]')
    expect(empty).toHaveLength(2)
    // The empty place has the size classes of the tool it stands for.
    const place = empty[0] as HTMLElement
    for (const name of filter.className.split(/\s+/).filter((c) => /^(size|h|w|px|min-w)-/.test(c))) expect(place.className, name).toContain(name)
    expect(place.className).toContain('invisible')
    expect(place.getAttribute('aria-hidden')).toBe('true')
    expect(place.hasAttribute('inert')).toBe(true)
  })

  test('absent, it is out of the keyboard\'s path and of what screen readers hear', () => {
    render(<Tools filter={false} />)
    expect(screen.queryByRole('button', { name: 'Filter' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull()
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['New task'])
  })

  test('a word button keeps its word in the empty place too, so the place is as wide as the button', () => {
    render(
      <Toolbar aria-label="Tools">
        <ToolbarButton label="Share" icon={<svg />} absent>
          Share
        </ToolbarButton>
      </Toolbar>,
    )
    const place = bar().querySelector('[data-slot="toolbar-slot"]')!
    expect(place.textContent).toBe('Share')
    expect(place.querySelector('[data-slot="toolbar-button-word"]')).not.toBeNull()
  })
})

describe('a chosen label is as wide as it is when not chosen', () => {
  const label = (name: string) => screen.getByRole('button', { name }).querySelector<HTMLElement>('[data-slot="steady-label"]')

  test('the segment: both words carry their bold width, and pressing one does not change what they hold', () => {
    function Stage() {
      const [value, setValue] = useState('write')
      return (
        <ToggleGroup aria-label="Stage" value={value} onValueChange={setValue}>
          <ToggleGroupItem value="write">Write</ToggleGroupItem>
          <ToggleGroupItem value="sort">Sort · 12</ToggleGroupItem>
        </ToggleGroup>
      )
    }
    render(<Stage />)
    for (const name of ['Write', 'Sort · 12']) {
      const span = label(name)!
      expect(span.getAttribute('data-label')).toBe(name)
      expect(span.className).toContain('after:font-semibold')
      expect(span.className).toContain('after:content-[attr(data-label)]')
      expect(span.className).toContain('after:invisible')
    }
    fireEvent.click(screen.getByRole('button', { name: 'Sort · 12' }))
    expect(screen.getByRole('button', { name: 'Sort · 12' }).getAttribute('aria-pressed')).toBe('true')
    expect(label('Write')!.getAttribute('data-label')).toBe('Write')
    // The bold copy is not in the page's text: the word is found once, and the name is the word.
    expect(screen.getAllByText('Write')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Write' }).textContent).toBe('Write')
  })

  test('the tabs and the views of the bar keep their words as wide too', () => {
    render(
      <>
        <Tabs value="a" onValueChange={noop}>
          <TabsList aria-label="Panels">
            <TabsTrigger value="a">Details</TabsTrigger>
            <TabsTrigger value="b">History</TabsTrigger>
          </TabsList>
        </Tabs>
        <Toolbar aria-label="Bar">
          <ToolbarTabs aria-label="Views" value="today" onValueChange={noop}>
            <ToolbarTab value="today">Today</ToolbarTab>
            <ToolbarTab value="board">Board</ToolbarTab>
          </ToolbarTabs>
        </Toolbar>
      </>,
    )
    expect(screen.getByRole('tab', { name: 'History' }).querySelector('[data-slot="steady-label"]')!.getAttribute('data-label')).toBe('History')
    expect(label('Board')!.getAttribute('data-label')).toBe('Board')
    expect(label('Today')!.getAttribute('data-label')).toBe('Today')
  })

  test('a label that is not text is drawn as it is', () => {
    render(
      <ToggleGroup aria-label="View" value="a" onValueChange={noop}>
        <ToggleGroupItem value="a">
          <svg aria-hidden="true" />
          <span>List</span>
        </ToggleGroupItem>
      </ToggleGroup>,
    )
    expect(screen.getByRole('button', { name: 'List' }).querySelector('[data-slot="steady-label"]')).toBeNull()
  })
})
