// Three more looks a theme asks for by name (the owner, 2026-11-24), each off unless asked: bold tabs
// (`ThemeDef.tabs: 'bold'`: the chosen view of a bar and the chosen item of a segment are marked by weight 700 and the
// accent), a tall status strip (`ThemeDef.statusStrip: 'tall'`), and the system's font among `FONTS`. First: with none
// asked nothing changes. Then each one. Last: the contrast of the bold tabs on the preset they were approved for,
// measured by the engine and printed (`[theme-tabs]` lines); a pair under its threshold is recorded, not hidden.
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { preloadMotion } from '../src/internal/motion'
import { AppShell, Toolbar, ToolbarTab, ToolbarTabs } from '../src/layout'
import { Tabs, TabsList, TabsTrigger, ToggleGroup, ToggleGroupItem } from '../src/primitives'
import { DEFAULT_FONT, FONTS, SYSTEM_FONT } from '../src/theme-catalog'
import type { ThemeDef } from '../src/theme-catalog'
import { themeTokens, tokensFor } from '../src/theme-engine'
import { BASE_THEME, THEME_ATTRIBUTES, applyFont, applyTheme, copyTheme, fontById, isFontId } from '../src/themes'
import { THEMES } from './fixtures/sample-themes'
import { SHELL_ACCENTS, SHELL_TONE, shellPreset } from './fixtures/shell-preset'
import { classes, contrast, systemMotion } from './helpers'
import { themeCss } from './theme-tokens'

afterEach(() => vi.unstubAllGlobals())

const SCHEMES = ['light', 'dark'] as const
// Tailwind also scans `test/`: a variant and its class are joined with `+`, never one literal (test/build.test.ts).
const BOLD = '[[data-tabs=bold]_&]' + ':'
const TALL = '[[data-status-strip=tall]_&]' + ':'
const CHOSEN = 'aria-[current=page]' + ':'
const OTHER = 'not-aria-[current=page]' + ':'
const PRESSED = 'data-[pressed]' + ':'
const AFTER = 'after' + ':'
const HOVER = 'hover' + ':'
const nord = THEMES.find((t) => t.id === 'nord')! as ThemeDef
/** `fg` at `alpha` over `bg`, as a class with `/16` draws it. */
const mix = (fg: string, bg: string, alpha: number) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('')
/** The classes of an element that are under the bold tabs' attribute, and those that are not. */
const split = (el: Element) => {
  const all = classes(el)
  return { bold: all.filter((c) => c.includes('data-tabs')), plain: all.filter((c) => !c.includes('data-tabs')) }
}

function Bar() {
  return (
    <Toolbar aria-label="Sample">
      <ToolbarTabs aria-label="Views" value="one" onValueChange={() => {}}>
        <ToolbarTab value="one">One</ToolbarTab>
        <ToolbarTab value="two">Two</ToolbarTab>
      </ToolbarTabs>
    </Toolbar>
  )
}

function Segment({ animated }: { animated?: boolean }) {
  return (
    <ToggleGroup aria-label="Filter" value="all" onValueChange={() => {}} animated={animated}>
      <ToggleGroupItem value="all">All</ToggleGroupItem>
      <ToggleGroupItem value="chosen">Chosen</ToggleGroupItem>
    </ToggleGroup>
  )
}

describe('off by default', () => {
  test('a theme that asks for neither writes neither attribute; the default of each, and a value that is not one, count as absent', () => {
    for (const scheme of SCHEMES) {
      const plain = tokensFor(nord, scheme)
      expect(Object.keys(plain.attributes)).toEqual(['data-sidebar'])
      expect(tokensFor({ ...nord, tabs: 'plain', statusStrip: 'slim' }, scheme)).toEqual(plain)
      expect(tokensFor({ ...nord, tabs: 'crisp', statusStrip: 'short' } as unknown as ThemeDef, scheme)).toEqual(plain)
      // Asked for, they change nothing but the attributes: no colour and no measure.
      const asked = tokensFor({ ...nord, tabs: 'bold', statusStrip: 'tall' }, scheme)
      expect(asked.colors).toEqual(plain.colors)
      expect(asked.shape).toEqual(plain.shape)
      expect(asked.attributes).toEqual({ ...plain.attributes, 'data-tabs': 'bold', 'data-status-strip': 'tall' })
    }
  })

  test('applyTheme writes them only when asked and takes them away with the next theme; another window and the user\'s own page keep them', () => {
    const el = document.createElement('div')
    const other = document.createElement('div')
    applyTheme(el, { theme: BASE_THEME, scheme: 'light' })
    expect(el.hasAttribute('data-tabs')).toBe(false)
    expect(el.hasAttribute('data-status-strip')).toBe(false)
    applyTheme(el, { theme: { ...BASE_THEME, tabs: 'bold', statusStrip: 'tall' }, scheme: 'light' })
    expect(el.getAttribute('data-tabs')).toBe('bold')
    expect(el.getAttribute('data-status-strip')).toBe('tall')
    expect(THEME_ATTRIBUTES).toEqual(expect.arrayContaining(['data-tabs', 'data-status-strip']))
    copyTheme(el, other)
    expect(other.getAttribute('data-tabs')).toBe('bold')
    expect(other.getAttribute('data-status-strip')).toBe('tall')
    applyTheme(el, { theme: BASE_THEME, scheme: 'light' })
    expect(el.hasAttribute('data-tabs')).toBe(false)
    expect(el.hasAttribute('data-status-strip')).toBe(false)
    const own = themeTokens({ ...nord, tabs: 'bold', statusStrip: 'tall' }, 'light', { accent: '#4452c4', background: 'match' })
    expect(own.attributes).toMatchObject({ 'data-tabs': 'bold', 'data-status-strip': 'tall' })
  })

  test('every class the looks add is under its attribute: without it a view, a segment and the strip have the classes they had', () => {
    render(
      <>
        <Bar />
        <Segment />
      </>,
    )
    const view = split(screen.getByRole('button', { name: 'One' }))
    // As before: the soft ink, a wash under the pointer, weight 600 and the ink when chosen, a round line in the fill.
    for (const cls of ['text-ink-soft', HOVER + 'text-ink', OTHER + HOVER + 'bg-ink/6', CHOSEN + 'font-semibold', CHOSEN + 'text-ink', CHOSEN + AFTER + 'bg-primary', AFTER + 'rounded-full', AFTER + 'h-0.5', AFTER + 'inset-x-3']) expect(view.plain, cls).toContain(cls)
    expect(view.plain.some((c) => /font-bold|scale-x|font-medium/.test(c))).toBe(false)
    for (const cls of view.bold) expect(cls.startsWith(BOLD), cls).toBe(true)
    const group = split(screen.getByRole('group', { name: 'Filter' }))
    for (const cls of ['rounded-lg', 'bg-paper-2', 'inset-ring', 'inset-ring-line']) expect(group.plain, cls).toContain(cls)
    expect(group.plain.some((c) => /^(p|gap)-/.test(c))).toBe(false)
    for (const cls of group.bold) expect(cls.startsWith(BOLD), cls).toBe(true)
    const item = split(screen.getByRole('button', { name: 'All' }))
    for (const cls of ['h-(--control-md)', 'rounded-lg', 'font-medium', 'text-ink-mute', PRESSED + 'bg-raised', PRESSED + 'font-semibold', PRESSED + 'text-ink', PRESSED + 'shadow-xs']) expect(item.plain, cls).toContain(cls)
    expect(item.plain.some((c) => /font-bold|accent|^border/.test(c))).toBe(false)
    for (const cls of item.bold) expect(cls.startsWith(BOLD), cls).toBe(true)
  })
})

describe('bold tabs: the view of a bar', () => {
  test('not chosen is weight 500 and muted, the ink under the pointer with no wash; chosen is weight 700 in the ink; the line is square, in the fill, and grows from nothing', () => {
    render(<Bar />)
    for (const name of ['One', 'Two']) {
      const c = classes(screen.getByRole('button', { name }))
      for (const cls of [OTHER + 'font-medium', OTHER + 'text-ink-mute', OTHER + HOVER + 'text-ink', OTHER + HOVER + 'bg-transparent', CHOSEN + 'font-bold', CHOSEN + 'text-ink', AFTER + 'scale-x-0', AFTER + 'rounded-none', AFTER + 'bg-primary', CHOSEN + AFTER + 'scale-x-100']) expect(c, cls).toContain(BOLD + cls)
      // Keyboard, focus ring, the off state and the line's place and thickness are the toolkit's, as they were.
      for (const cls of [AFTER + 'h-0.5', AFTER + 'inset-x-3', 'data-disabled' + ':opacity-50']) expect(c, cls).toContain(cls)
      expect(c.some((cls) => cls.includes('focus-visible:outline'))).toBe(true)
    }
    expect(screen.getByRole('button', { name: 'One' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Two' }).hasAttribute('aria-current')).toBe(false)
  })

  test('the line eases only where the app has motion on and the system allows it; the label keeps the width of its heaviest self', () => {
    const gate = themeCss.indexOf('@media (prefers-reduced-motion: no-preference)')
    const rule = themeCss.indexOf(':where(:root[data-motion]) [data-slot="toolbar-tab"]::after')
    expect(gate).toBeGreaterThan(-1)
    expect(rule).toBeGreaterThan(gate)
    const body = themeCss.slice(rule, themeCss.indexOf('}', rule))
    // The toolkit's own time and curve (R: no part writes its own): the scale, nothing else.
    expect(body).toContain('transition: scale var(--motion-normal) var(--motion-ease-enter)')
    render(
      <>
        <Bar />
        <Segment />
      </>,
    )
    for (const [name, slot] of [['One', 'toolbar-tab'], ['All', 'toggle-group-item']] as const) {
      const label = screen.getByRole('button', { name }).querySelector('[data-slot="steady-label"]')!
      const c = classes(label)
      expect(c).toContain(AFTER + 'font-semibold')
      expect(c).toContain('[[data-tabs=bold]_[data-slot=' + slot + ']_&]' + ':' + AFTER + 'font-bold')
    }
  })

  test('the tabs of a view (TabsList) are a tint, not an underline: they take nothing of it', () => {
    render(
      <Tabs value="a" onValueChange={() => {}}>
        <TabsList aria-label="Panels">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    const tab = screen.getByRole('tab', { name: 'A' })
    expect(classes(tab).some((c) => c.includes('data-tabs'))).toBe(false)
    expect(classes(screen.getByRole('tablist')).some((c) => c.includes('data-tabs'))).toBe(false)
  })
})

describe('bold tabs: the segment', () => {
  test('a track with 2px inside it and between its items; the chosen item is weight 700 with the accent at 16% as its fill and at 55% as its border, one corner step under the track', () => {
    render(<Segment />)
    const group = classes(screen.getByRole('group', { name: 'Filter' }))
    for (const cls of ['p-0.5', 'gap-0.5']) expect(group, cls).toContain(BOLD + cls)
    // The hairline of the track and its corners are the group's own.
    expect(group).toEqual(expect.arrayContaining(['inset-ring', 'inset-ring-line', 'rounded-lg']))
    for (const name of ['All', 'Chosen']) {
      const c = classes(screen.getByRole('button', { name }))
      for (const cls of ['rounded-md', 'border', 'border-transparent', PRESSED + 'font-bold', PRESSED + 'shadow-none', PRESSED + 'border-accent' + '/55', PRESSED + 'bg-accent' + '/16', PRESSED + HOVER + 'bg-accent' + '/16']) expect(c, cls).toContain(BOLD + cls)
      // Shorter by the track's padding, so the track stays a control tall; 44px with a finger as before.
      expect(c.some((cls) => cls.startsWith(BOLD + 'h-[calc(var(--control-md)'))).toBe(true)
      expect(c).toEqual(expect.arrayContaining(['pointer-coarse' + ':min-h-11', 'font-medium', 'text-ink-mute', 'disabled' + ':opacity-50']))
    }
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
  })

  test('with animations the fill and the border are the sliding pill\'s, and the item under it has none of its own', async () => {
    await preloadMotion()
    systemMotion(false)
    render(<Segment animated />)
    const item = screen.getByRole('button', { name: 'All' })
    const c = classes(item)
    // The item is empty under the pill, with or without the look.
    expect(c).toEqual(expect.arrayContaining([PRESSED + 'bg-transparent', PRESSED + 'shadow-none']))
    expect(c.some((cls) => cls.startsWith(BOLD) && /bg-accent|border-accent/.test(cls))).toBe(false)
    expect(c).toContain(BOLD + PRESSED + 'font-bold')
    const pill = [...item.querySelectorAll('*')].find((el) => classes(el).includes('-z-10'))
    expect(pill).toBeTruthy()
    const p = classes(pill)
    expect(p).toEqual(expect.arrayContaining(['bg-raised', 'shadow-xs', 'inset-0']))
    for (const cls of ['-inset-px', 'border', 'border-accent' + '/55', 'bg-accent' + '/16', 'shadow-none']) expect(p, cls).toContain(BOLD + cls)
    // The other item has no pill.
    expect([...screen.getByRole('button', { name: 'Chosen' }).querySelectorAll('*')].some((el) => classes(el).includes('-z-10'))).toBe(false)
  })
})

describe('a tall status strip', () => {
  test('40px under the attribute, 44px with a finger; without it a dense control tall as before', () => {
    render(
      <AppShell contentLabel="Work" status={<span>Ready</span>}>
        <p>Content</p>
      </AppShell>,
    )
    const strip = document.querySelector('[data-slot="app-shell-status"]')!
    const c = classes(strip)
    expect(c).toEqual(expect.arrayContaining(['min-h-(--control-sm)', 'flex', 'items-center']))
    expect(c).toContain(TALL + 'min-h-10')
    expect(c).toContain(TALL + 'pointer-coarse' + ':min-h-11')
    expect(c.filter((cls) => cls.includes('data-status-strip'))).toHaveLength(2)
  })
})

describe('the system\'s font', () => {
  test('the fonts an app lists to a person are those of v6.2.1 and no more: the system\'s is apart', () => {
    expect(FONTS.map((f) => f.id)).toEqual(['inter', 'lexend', 'plex', 'source', 'atkinson', 'jakarta', 'dm', 'manrope', 'figtree', 'work', 'nunito', 'serif', 'mono'])
    expect((FONTS as readonly { id: string }[]).some((f) => f.id === SYSTEM_FONT.id)).toBe(false)
    expect((FONTS as readonly { stack: string }[]).some((f) => f.stack.includes('Segoe'))).toBe(false)
  })

  test('set by name, never the default; nothing of it is shipped; with it the monospace is the system\'s too', () => {
    const system = fontById('system')
    expect(system).toBe(SYSTEM_FONT)
    expect(isFontId('system')).toBe(true)
    expect(isFontId('segoe')).toBe(false)
    expect(system.stack).toBe('"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif')
    expect(DEFAULT_FONT).toBe('plex')
    const el = document.createElement('div')
    applyFont(el, 'system')
    expect(el.getAttribute('data-font')).toBe('system')
    expect(el.style.getPropertyValue('--font-sans')).toBe(system.stack)
    // The monospace follows the attribute, in the stylesheet: no file, no request.
    const rule = themeCss.indexOf('[data-font="system"] {')
    expect(rule).toBeGreaterThan(-1)
    expect(themeCss.slice(rule, themeCss.indexOf('}', rule))).toContain('--font-mono: "Cascadia Mono", "Cascadia Code", Consolas, ui-monospace, monospace;')
    expect(themeCss).not.toMatch(/@font-face[^}]*Segoe/)
    expect(themeCss).not.toMatch(/@font-face[^}]*Cascadia/)
  })
})

/* ———— The preset the looks were approved for: the pairs of the bold tabs, measured on the engine's own colours ———— */

describe('bold tabs on the preset, measured', () => {
  test.each(SCHEMES)('%s: the text of a view and of a segment holds 4.5:1 and the line 3:1, for the five accents; the border of the chosen item is recorded', (scheme) => {
    const short: string[] = []
    const lowest = new Map<string, { ratio: number; app: string }>()
    const note = (name: string, ratio: number, needs: number, app: string) => {
      const now = lowest.get(name)
      if (!now || ratio < now.ratio) lowest.set(name, { ratio, app })
      if (ratio < needs) short.push(`${app}: ${name} ${ratio.toFixed(2)} (needs ${needs})`)
    }
    for (const accent of SHELL_ACCENTS) {
      const tokens = tokensFor(shellPreset(accent), scheme, SHELL_TONE)
      const c = tokens.colors
      expect(tokens.attributes).toMatchObject({ 'data-tabs': 'bold', 'data-status-strip': 'tall' })
      // The bar is the window's ground (the sidebar surface); the track of a segment is the lanes' surface.
      const bar = c['sidebar-paper']!
      const track = c['paper-2']!
      const fill = mix(c['accent']!, track, 0.16)
      const border = mix(c['accent']!, track, 0.55)
      const text: [string, number][] = [
        ['view not chosen: ink-mute on the bar', contrast(c['ink-mute']!, bar)],
        ['view chosen or under the pointer: ink on the bar', contrast(c['ink']!, bar)],
        ['segment not chosen: ink-mute on the track', contrast(c['ink-mute']!, track)],
        ['segment under the pointer: ink on the track', contrast(c['ink']!, track)],
        ['segment chosen: ink on the accent at 16%', contrast(c['ink']!, fill)],
      ]
      for (const [name, ratio] of text) {
        note(name, ratio, 4.5, accent.id)
        expect(ratio, `${accent.id} ${scheme}: ${name}`).toBeGreaterThanOrEqual(4.5)
      }
      const line = contrast(c['primary']!, bar)
      note('the line of the chosen view on the bar', line, 3, accent.id)
      expect(line, `${accent.id} ${scheme}: the line on the bar`).toBeGreaterThanOrEqual(3)
      // The border of the chosen item is a tint of the accent, as approved: it is measured against the track and
      // against its own fill and recorded where it is under 3:1. The choice is also told without it, by the weight
      // (700 beside 500) and by the ink beside the muted ink. It always shows more than the track's hairline.
      note('the border of the chosen item (accent at 55%) on the track', contrast(border, track), 3, accent.id)
      note('the border of the chosen item on its fill', contrast(border, fill), 3, accent.id)
      expect(contrast(border, track), `${accent.id} ${scheme}: the border shows more than the hairline`).toBeGreaterThan(contrast(c['line']!, track))
      // The chosen item beside one that is not: the two inks apart.
      note('ink beside ink-mute (chosen beside not chosen)', contrast(c['ink']!, c['ink-mute']!), 1, accent.id)
    }
    for (const [name, { ratio, app }] of lowest) console.log(`[theme-tabs] ${scheme} lowest: ${name}: ${ratio.toFixed(2)}:1 (${app})`)
    console.log(`[theme-tabs] ${scheme} pairs under their threshold: ${short.length ? short.join(' | ') : 'none'}`)
    // Only the border may be short: anything else would have failed above.
    expect(short.every((s) => s.includes('the border of the chosen item'))).toBe(true)
  })
})
