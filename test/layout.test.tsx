// The layout parts (`Column`, `Cluster`, `Split`, `Grid`, `Spacer`, `Section`, `ScrollArea`, `Page`, `Text`): a screen
// laid out with no class of the app's own. Every space is a step of the scale, and a class or a style passed in spite of
// the types never reaches the page.
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Cluster, Column, Grid, Page, ScrollArea, Section, Spacer, Split, Text, type Space } from '../src/primitives'
import { classes } from './helpers'

const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`)!
// The steps of the scale and the gap each one is (4, 8, 12, 16 and 24px on Tailwind's 4px unit).
const SCALE: [Space, string][] = [['xs', 'gap-1'], ['sm', 'gap-2'], ['md', 'gap-3'], ['lg', 'gap-4'], ['xl', 'gap-6']]

describe('piles and rows', () => {
  test('a pile is a column with the gap of its step; its padding is a step too; it can be a list', () => {
    for (const [space, gap] of SCALE) {
      const { unmount } = render(<Column gap={space}>a</Column>)
      expect(classes(slot('column'))).toEqual(expect.arrayContaining(['flex', 'flex-col', gap]))
      unmount()
    }
    const { unmount } = render(
      <Column as="ul" pad="lg" align="start" aria-label="Facts">
        <li>one</li>
      </Column>,
    )
    const list = screen.getByRole('list', { name: 'Facts' })
    expect(list.getAttribute('data-slot')).toBe('column')
    expect(classes(list)).toEqual(expect.arrayContaining(['p-4', 'items-start', 'gap-2']))
    unmount()
  })

  test('a pile that fills is as tall as its region, in a block or in another pile; without it, as tall as its parts', () => {
    // jsdom lays nothing out: the classes that give the pile that height, as in test/fit-screen.test.tsx.
    const { rerender } = render(<Column>a</Column>)
    expect(slot('column').hasAttribute('data-fill')).toBe(false)
    expect(classes(slot('column'))).toEqual(['flex', 'min-w-0', 'flex-col', 'gap-2', 'items-stretch'])
    rerender(<Column fill pad="md">a</Column>)
    expect(slot('column').hasAttribute('data-fill')).toBe(true)
    expect(slot('column').hasAttribute('fill')).toBe(false)
    expect(classes(slot('column'))).toEqual(expect.arrayContaining(['flex-col', 'p-3', 'h-full', 'min-h-0', 'flex-1']))
  })

  test('a row wraps, with its parts at the start, the end or apart; two groups go to the two ends of a row', () => {
    render(
      <>
        <Cluster justify="end">
          <button type="button">One</button>
        </Cluster>
        <Split>
          <span>Title</span>
          <button type="button">Action</button>
        </Split>
      </>,
    )
    expect(classes(slot('cluster'))).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'justify-end', 'items-center', 'gap-2']))
    expect(classes(slot('split'))).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'justify-between', 'gap-3']))
  })

  test('a grid takes as many columns as the width holds, each at least its minimum', () => {
    const { rerender } = render(<Grid>x</Grid>)
    expect(classes(slot('grid'))).toEqual(expect.arrayContaining(['grid', 'grid-cols-(--grid-columns-md)', 'gap-3']))
    rerender(<Grid min="lg" gap="xl">x</Grid>)
    expect(classes(slot('grid'))).toEqual(expect.arrayContaining(['grid-cols-(--grid-columns-lg)', 'gap-6']))
  })

  test('a spacer is room and nothing a screen reader meets', () => {
    render(<Spacer />)
    expect(slot('spacer').getAttribute('aria-hidden')).toBe('true')
    expect(classes(slot('spacer'))).toContain('flex-auto')
  })
})

describe('sections, areas and pages', () => {
  test('a section is a region named by its heading, at its level, with the icon slot kept when empty (R6)', () => {
    render(
      <>
        <Section title="Linguaggi" icon={<svg />} end={<span>3</span>}>
          <p>Body</p>
        </Section>
        <Section title="Nested" level={3}>
          <p>Body</p>
        </Section>
      </>,
    )
    const region = screen.getByRole('region', { name: 'Linguaggi' })
    expect(screen.getByRole('heading', { level: 2, name: 'Linguaggi' })).toBeTruthy()
    expect(region.querySelector('[data-slot="section-icon"]')!.getAttribute('aria-hidden')).toBe('true')
    const nested = screen.getByRole('region', { name: 'Nested' })
    expect(screen.getByRole('heading', { level: 3, name: 'Nested' })).toBeTruthy()
    expect(nested.querySelector('[data-slot="section-icon"]')!.childElementCount).toBe(0)
  })

  test('an area that scrolls is a named region the keyboard reaches; bounded, it keeps under about half the window', () => {
    render(
      <ScrollArea aria-label="Albero" bounded pad="md">
        <p>Rows</p>
      </ScrollArea>,
    )
    const area = screen.getByRole('region', { name: 'Albero' })
    expect(area.getAttribute('tabindex')).toBe('0')
    expect(classes(area)).toEqual(expect.arrayContaining(['overflow-auto', 'max-h-(--scroll-bounded)', 'p-3']))
  })

  test('the body of a page is as wide as the content may be, centred, its sections spaced by the largest step', () => {
    render(<Page>p</Page>)
    expect(classes(slot('page'))).toEqual(expect.arrayContaining(['max-w-(--content-max)', 'mx-auto', 'gap-6']))
  })
})

describe('text', () => {
  test('a line takes its weight: the text around it, muted, a caption or a kicker; it may keep its breaks', () => {
    render(
      <>
        <Text>plain</Text>
        <Text variant="muted">muted</Text>
        <Text variant="caption" as="p">caption</Text>
        <Text variant="kicker" pre as="div">
          {'kicker\nline'}
        </Text>
      </>,
    )
    expect(screen.getByText('plain').hasAttribute('class')).toBe(false)
    expect(classes(screen.getByText('muted'))).toEqual(['text-ink-mute'])
    const caption = screen.getByText('caption')
    expect(caption.tagName).toBe('P')
    expect(classes(caption)).toEqual(expect.arrayContaining(['text-2xs', 'text-ink-mute']))
    const kicker = document.querySelector('[data-variant="kicker"]')!
    expect(kicker.tagName).toBe('DIV')
    expect(classes(kicker)).toEqual(expect.arrayContaining(['font-medium', 'whitespace-pre-wrap']))
  })
})

test('a class or a style passed in spite of the types never reaches the page: a layout part draws only its own', () => {
  // Tailwind also reads `test/`: the palette class is composed, so it is not written into the stylesheet.
  const palette = 'bg-' + 'red-500'
  const sneaky = { className: palette, style: { color: 'red' } } as unknown as Record<string, never>
  render(
    <>
      <Column {...sneaky}>a</Column>
      <Cluster {...sneaky}>b</Cluster>
      <Split {...sneaky}>c</Split>
      <Grid {...sneaky}>d</Grid>
      <Section title="S" {...sneaky}>e</Section>
      <ScrollArea aria-label="A" {...sneaky}>f</ScrollArea>
      <Page {...sneaky}>g</Page>
      <Text {...sneaky}>h</Text>
    </>,
  )
  for (const name of ['column', 'cluster', 'split', 'grid', 'section', 'scroll-area', 'page', 'text']) {
    const el = slot(name)
    expect(el.getAttribute('class') ?? '', name).not.toContain(palette)
    expect(el.getAttribute('style'), name).toBeNull()
  }
})

test('every gap and every padding of every part is a step of the scale', () => {
  const PADS: [Space, string][] = [['xs', 'p-1'], ['sm', 'p-2'], ['md', 'p-3'], ['lg', 'p-4'], ['xl', 'p-6']]
  for (const [space, gap] of SCALE) {
    const { unmount } = render(
      <>
        <Column gap={space}>a</Column>
        <Cluster gap={space}>b</Cluster>
        <Split gap={space}>c</Split>
        <Grid gap={space}>d</Grid>
        <Section title="S" gap={space}>e</Section>
      </>,
    )
    for (const name of ['column', 'cluster', 'split', 'grid', 'section']) expect(classes(slot(name)), `${name} ${space}`).toContain(gap)
    unmount()
  }
  for (const [space, pad] of PADS) {
    const { unmount } = render(
      <>
        <Column pad={space}>a</Column>
        <Cluster pad={space}>b</Cluster>
        <Split pad={space}>c</Split>
        <ScrollArea aria-label="A" pad={space}>d</ScrollArea>
      </>,
    )
    for (const name of ['column', 'cluster', 'split', 'scroll-area']) expect(classes(slot(name)), `${name} ${space}`).toContain(pad)
    unmount()
  }
})
