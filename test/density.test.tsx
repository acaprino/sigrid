// Density is data, like the themes: three presets, an app's own definitions, and `applyDensity` that writes the measures
// on an element. `theme.css` turns them into the tokens the primitives use. Here: `normal` is the toolkit as it was
// before density existed, each preset writes its measures, a definition is made safe, and with a coarse pointer no
// control is ever shorter than 44px.
// jsdom does no layout and reads no stylesheet: the px of a primitive is read from its class (the token) through the
// rule of `theme.css` that defines the token. Careful: Tailwind also scans `test/`; no whole variant class is written here.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Button, DensityChoice, Input, Textarea } from '../src'
import { DEFAULT_DENSITY, DENSITIES, DENSITY_LIMITS, DENSITY_VARIABLES, TOUCH_TARGET, applyDensity, densityById, densityOf, densityVariables, densityWith, isDensityId } from '../src/density'
import type { Density, DensityDef } from '../src/density'
import { THEME_ATTRIBUTES, THEME_VARIABLES, copyTheme } from '../src/themes'
import { root } from './helpers'

const source = (file: string) => readFileSync(resolve(root, file), 'utf8')
const css = source('src/styles/theme.css').replace(/\r\n/g, '\n')

/** The declarations of the density tokens in `theme.css`: on every pointer, and the ones a coarse pointer replaces. */
function tokenRules(): { fine: Record<string, string>; coarse: Record<string, string>; touch: number } {
  const start = css.indexOf('--touch-target:')
  const block = css.slice(start, css.indexOf('\n}\n', start))
  const [fineText = '', coarseText = ''] = block.split('@media (pointer: coarse)')
  const declarations = (text: string) => Object.fromEntries([...text.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
  const fine = declarations(fineText)
  return { fine, coarse: declarations(coarseText), touch: Number(/^(\d+)px$/.exec(fine['--touch-target'] ?? '')?.[1]) }
}

/** The px of a token declaration: `var(--name, fallback)` read from the variables, and `max(a, b)`. */
function px(value: string, variables: Record<string, string>): number {
  const resolved = value.replace(/var\((--[a-z-]+)(?:,\s*([^()]+))?\)/g, (_, name: string, fallback?: string) => variables[name] ?? fallback ?? 'missing')
  const max = /^max\((.+)\)$/.exec(resolved)
  const parts = (max ? max[1]! : resolved).split(',').map((p) => /^(\d+)px$/.exec(p.trim()))
  if (parts.some((p) => !p)) throw new Error(`not a px value: ${value} -> ${resolved}`)
  return Math.max(...parts.map((p) => Number(p![1])))
}

/** The tokens as the page computes them for a density (or for none: before any script), on a fine or a coarse pointer. */
function tokens(density: Density | null, pointer: 'fine' | 'coarse' = 'fine'): Record<string, number> {
  const rules = tokenRules()
  const variables = { '--touch-target': `${rules.touch}px`, ...(density ? densityVariables(density) : {}) }
  const declared = pointer === 'coarse' ? { ...rules.fine, ...rules.coarse } : rules.fine
  return Object.fromEntries(Object.entries(declared).map(([name, value]) => [name, px(value, variables)]))
}

/** The token a class of this utility reads on an element: `h` finds `--control-md` in the height class. */
function tokenOf(el: Element, utility: string): string | undefined {
  const own = (el.getAttribute('class') ?? '').split(/\s+/).filter((c) => !c.includes(':'))
  return own.map((c) => new RegExp(`^${utility}-\\((--[a-z-]+)\\)$`).exec(c)?.[1]).find(Boolean)
}

const COMPACT = { control: [32, 28, 24], pad: [10, 8, 6], row: [32, 4] }
const NORMAL = { control: [36, 32, 28], pad: [12, 10, 8], row: [40, 8] }
const LARGE = { control: [40, 36, 32], pad: [14, 12, 10], row: [48, 12] }
const measures = (d: DensityDef) => ({ control: [d.control.md, d.control.sm, d.control.xs], pad: [d.pad.md, d.pad.sm, d.pad.xs], row: [d.row.height, d.row.pad] })

describe('the presets', () => {
  test('three levels, compact, normal and large; normal is the default', () => {
    expect(DENSITIES.map((d) => d.id)).toEqual(['compact', 'normal', 'large'])
    expect(DEFAULT_DENSITY).toBe('normal')
    expect(isDensityId('large')).toBe(true)
    for (const bad of ['comfortable', 'spacious', '', null, undefined, 3, 'constructor']) expect(isDensityId(bad), String(bad)).toBe(false)
  })

  test('normal is a step under the md form of Park UI; compact is one step smaller, large one step larger', () => {
    expect(measures(densityById('compact'))).toEqual(COMPACT)
    expect(measures(densityById('normal'))).toEqual(NORMAL)
    expect(measures(densityById('large'))).toEqual(LARGE)
  })

  test('every height of a preset is on the 4px grid and every side padding on the 2px step', () => {
    for (const d of DENSITIES) {
      for (const h of [...measures(d).control, ...measures(d).row]) expect(h % 4, `${d.id} ${h}`).toBe(0)
      for (const p of measures(d).pad) expect(p % 2, `${d.id} ${p}`).toBe(0)
    }
  })
})

describe('normal is what the toolkit is before any script runs', () => {
  test('theme.css gives every token the value of normal before any script runs', () => {
    expect(tokens(null)).toEqual({
      '--touch-target': 44,
      '--control-md': 36, '--control-sm': 32, '--control-xs': 28,
      '--pad-md': 12, '--pad-sm': 10, '--pad-xs': 8,
      '--row-height': 40, '--row-pad': 8,
    })
    expect(tokens('normal')).toEqual(tokens(null))
  })

  test('every density variable has its token in theme.css, and the fallback is normal', () => {
    const { fine } = tokenRules()
    for (const [name, value] of Object.entries(densityVariables('normal'))) {
      expect(fine[name.replace('--density-', '--')], name).toBe(`var(${name}, ${value})`)
    }
  })

  test('the Button sizes are 36, 32 and 28px tall with 12, 10 and 8px of side padding', () => {
    const t = tokens(null)
    // size -> [height, min width, side padding]; the square sizes have no padding; `lg` keeps its fixed 16px (px-4).
    const before = { default: [36, 36, 12], sm: [32, 32, 10], xs: [28, 28, 8], lg: [36, 36, null], icon: [36, 36, null], 'icon-sm': [32, 32, null], 'icon-xs': [28, 28, null], 'icon-lg': [36, 36, null] } as const
    for (const [size, [height, width, pad]] of Object.entries(before)) {
      const { unmount } = render(<Button size={size as keyof typeof before}>x</Button>)
      const el = screen.getByRole('button')
      const square = size.startsWith('icon')
      expect(t[tokenOf(el, square ? 'size' : 'h')!], `${size} height`).toBe(height)
      expect(t[tokenOf(el, square ? 'size' : 'min-w')!], `${size} width`).toBe(width)
      if (pad === null) expect(tokenOf(el, 'px'), `${size} padding`).toBeUndefined()
      else expect(t[tokenOf(el, 'px')!], `${size} padding`).toBe(pad)
      unmount()
    }
  })

  test('a field is 36px tall with 10px of side padding', () => {
    const t = tokens(null)
    render(
      <>
        <Input aria-label="field" />
        <Textarea aria-label="note" />
      </>,
    )
    expect(t[tokenOf(screen.getByLabelText('field'), 'h')!]).toBe(36)
    expect(t[tokenOf(screen.getByLabelText('field'), 'px')!]).toBe(10)
    expect(t[tokenOf(screen.getByLabelText('note'), 'px')!]).toBe(10)
  })

  test('the other primitives read the same tokens for their heights and paddings', () => {
    const line = (file: string, needle: string) => source(file).split('\n').find((l) => l.includes(needle)) ?? ''
    const has = (file: string, needle: string, ...tokens: string[]) => {
      for (const token of tokens) expect(line(file, needle), `${file}: ${token}`).toContain(token)
    }
    // Select: the button 36px (32 when `sm`), 10px left and 8px right; an item at least 40px with 8px above and below.
    has('src/components/ui/select.tsx', 'flex w-full items-center justify-between', 'pr-(--pad-xs)', 'pl-(--pad-sm)')
    has('src/components/ui/select.tsx', 'size === "sm"', '"h-(--control-sm) w-auto"', '"h-(--control-md)"')
    // The rows of every floating list (select, combo box, suggestions, menu) are one constant.
    has('src/lib/rows.ts', 'export const LIST_ROW', 'min-h-(--row-height)', 'py-(--row-pad)')
    has('src/components/ui/select.tsx', 'const ITEM_CLASS', 'LIST_ROW')
    has('src/components/ui/select.tsx', 'data-slot="select-group-label"', 'h-(--row-height)')
    // Menu: an item at least 40px with 8px above and below, a label 40px.
    has('src/components/ui/dropdown-menu.tsx', 'LIST_ROW,', 'LIST_ROW')
    has('src/components/ui/dropdown-menu.tsx', 'text-ink-mute data-[inset]', 'h-(--row-height)')
    // Segment item: 36px, 12px of side padding.
    has('src/components/ui/toggle-group.tsx', '"inline-flex h-', 'h-(--control-md)', 'min-w-(--control-md)', 'px-(--pad-md)')
    // Date field: the surface of Input; the time field 32px.
    has('src/lib/field.ts', 'export const FIELD_HEIGHT', 'h-(--control-md)')
    has('src/components/DateField.tsx', 'const TRIGGER_CLASS', 'FIELD_HEIGHT', 'px-(--pad-sm)')
    has('src/components/DateField.tsx', 'w-28', 'h-(--control-sm)')
    // The close button of a dialog and of a sheet: 32px.
    has('src/components/ui/button.tsx', '"icon-sm":', 'size-(--control-sm)')
    has('src/components/ui/dialog.tsx', 'render={<Button', 'size="icon-sm"')
    has('src/components/ui/sheet.tsx', 'render={<Button', 'size="icon-sm"')
    // Calendar cells: 32px. Chips box: at least 36px, its padding what a 28px chip and the two borders leave (3px).
    has('src/components/ui/calendar.tsx', 'data-slot="calendar"', '[--cell-size:var(--control-sm)]')
    has('src/components/ChipsInput.tsx', '<TagsInput.Control', 'min-h-(--control-md)', 'py-[calc((var(--control-md)_-_30px)/2)]')
    expect((tokens(null)['--control-md']! - 30) / 2).toBe(3)
  })
})

describe('applyDensity', () => {
  test('a preset goes on the element as data-density and as its measures', () => {
    const el = document.createElement('div')
    const expected = { compact: COMPACT, normal: NORMAL, large: LARGE }
    for (const d of DENSITIES) {
      applyDensity(el, d.id)
      expect(el.getAttribute('data-density')).toBe(d.id)
      const e = expected[d.id]
      const value = (name: string) => el.style.getPropertyValue(name)
      expect(['md', 'sm', 'xs'].map((s) => value(`--density-control-${s}`)), d.id).toEqual(e.control.map((n) => `${n}px`))
      expect(['md', 'sm', 'xs'].map((s) => value(`--density-pad-${s}`)), d.id).toEqual(e.pad.map((n) => `${n}px`))
      expect([value('--density-row-height'), value('--density-row-pad')], d.id).toEqual(e.row.map((n) => `${n}px`))
    }
  })

  test('each preset changes the tokens the components read', () => {
    expect(tokens('compact')).toMatchObject({ '--control-md': 32, '--control-sm': 28, '--control-xs': 24, '--pad-md': 10, '--pad-sm': 8, '--pad-xs': 6, '--row-height': 32, '--row-pad': 4 })
    expect(tokens('large')).toMatchObject({ '--control-md': 40, '--control-sm': 36, '--control-xs': 32, '--pad-md': 14, '--pad-sm': 12, '--pad-xs': 10, '--row-height': 48, '--row-pad': 12 })
  })

  test('always writes the same variables, whatever the density', () => {
    for (const d of [...DENSITIES, densityWith('normal', { id: 'mine', row: { height: 56 } })]) {
      expect(Object.keys(densityVariables(d)).sort(), d.id).toEqual([...DENSITY_VARIABLES].sort())
    }
  })

  test('a value that is not a density is normal', () => {
    const el = document.createElement('div')
    for (const bad of ['comfortable', '', null, undefined, 7, []]) {
      applyDensity(el, 'compact')
      applyDensity(el, bad as unknown as Density)
      expect(el.getAttribute('data-density'), String(bad)).toBe('normal')
      expect(el.style.getPropertyValue('--density-control-md'), String(bad)).toBe('36px')
    }
  })

  test("an app's own definition: a preset with some measures changed", () => {
    const mine = densityWith('compact', { id: 'dense', label: 'Dense', control: { md: 28 }, row: { height: 28 } })
    expect(measures(mine)).toEqual({ control: [28, 28, 24], pad: [10, 8, 6], row: [28, 4] })
    const el = document.createElement('div')
    applyDensity(el, mine)
    expect(el.getAttribute('data-density')).toBe('dense')
    expect(el.style.getPropertyValue('--density-control-md')).toBe('28px')
    expect(el.style.getPropertyValue('--density-row-height')).toBe('28px')
    // The presets are not touched.
    expect(measures(densityById('compact'))).toEqual(COMPACT)
  })

  test('a definition is made safe: measures inside the limits, whole px, normal where one is missing', () => {
    const wild = { id: 'wild', label: 'Wild', control: { md: 4, sm: 500, xs: 30.4 }, pad: { md: -8, sm: Number.NaN, xs: 99 }, row: { height: 2, pad: -1 } } as DensityDef
    expect(measures(densityOf(wild))).toEqual({
      control: [DENSITY_LIMITS.control.min, DENSITY_LIMITS.control.max, 30],
      pad: [DENSITY_LIMITS.pad.min, 10, DENSITY_LIMITS.pad.max],
      row: [DENSITY_LIMITS.rowHeight.min, DENSITY_LIMITS.rowPad.min],
    })
    expect(measures(densityOf({ id: 'empty' }))).toEqual(NORMAL)
    expect(measures(densityOf({ id: 'text', control: { md: '12px' }, row: 'tall' }))).toEqual(NORMAL)
    // No control or row can be asked shorter than the 24px hit area of a fine pointer (test/targets.test.tsx).
    expect(DENSITY_LIMITS.control.min).toBeGreaterThanOrEqual(24)
    expect(DENSITY_LIMITS.rowHeight.min).toBeGreaterThanOrEqual(24)
    expect(DENSITY_LIMITS.pad.min).toBeGreaterThan(0)
  })

  test('the id of a definition goes in the attribute only if a selector can match it', () => {
    const el = document.createElement('div')
    applyDensity(el, { ...densityById('large'), id: 'my_density-2' })
    expect(el.getAttribute('data-density')).toBe('my_density-2')
    for (const bad of ['a b', '"]{}', '', 'x'.repeat(41)]) {
      applyDensity(el, { ...densityById('large'), id: bad })
      expect(el.getAttribute('data-density'), bad).toBe('custom')
    }
  })
})

describe('with a coarse pointer every control and row is at least 44px, whatever the density', () => {
  test('the floor is 44px, in the stylesheet and in the code', () => {
    expect(tokenRules().touch).toBe(44)
    expect(TOUCH_TARGET).toBe(44)
  })

  test('every control height, and the row height, is the larger of the floor and what the density asks', () => {
    const { coarse } = tokenRules()
    for (const name of ['control-md', 'control-sm', 'control-xs', 'row-height']) {
      expect(coarse[`--${name}`], name).toMatch(new RegExp(`^max\\(var\\(--touch-target\\), var\\(--density-${name}, \\d+px\\)\\)$`))
    }
  })

  test('the presets, the smallest definition allowed and a taller one', () => {
    const smallest = densityWith('compact', { id: 'smallest', control: { md: 1, sm: 1, xs: 1 }, row: { height: 1 } })
    const tall = densityWith('large', { id: 'tall', control: { md: 56 } })
    for (const d of [...DENSITIES, smallest, tall]) {
      const t = tokens(d, 'coarse')
      for (const name of ['control-md', 'control-sm', 'control-xs', 'row-height']) expect(t[`--${name}`], `${d.id} ${name}`).toBeGreaterThanOrEqual(44)
    }
    // A fine pointer gets what the definition asks (made safe); a coarse one never less than 44, and more if asked.
    expect(tokens(smallest)['--control-md']).toBe(DENSITY_LIMITS.control.min)
    expect(tokens(null, 'coarse')).toMatchObject({ '--control-md': 44, '--control-sm': 44, '--control-xs': 44 })
    expect(tokens(tall, 'coarse')['--control-md']).toBe(56)
  })

  test('a row on touch follows the density above the floor: 44px at compact and normal, 48px at large', () => {
    expect(tokens('compact', 'coarse')['--row-height']).toBe(44)
    expect(tokens(null, 'coarse')['--row-height']).toBe(44)
    expect(tokens('large', 'coarse')['--row-height']).toBe(48)
    // The padding of a row has no floor: it is what the density asks on every pointer.
    expect(tokens('large', 'coarse')['--row-pad']).toBe(12)
    expect(tokens(null, 'coarse')['--row-pad']).toBe(8)
  })

  test('the rows of a menu and of a select take their least height from the token alone, so large reaches touch', () => {
    const line = (file: string, needle: string) => source(file).split('\n').find((l) => l.includes(needle)) ?? ''
    const fixed = ['pointer-coarse', 'min-h-11'].join(':')
    for (const [file, needle] of [['src/lib/rows.ts', 'export const LIST_ROW']] as const) {
      expect(line(file, needle), file).toContain('min-h-(--row-height)')
      expect(line(file, needle), file).not.toContain(fixed)
    }
  })
})

describe('another document copies the density with the theme', () => {
  test('data-density and the measures are among what copyTheme carries', () => {
    expect(THEME_ATTRIBUTES).toContain('data-density')
    for (const name of DENSITY_VARIABLES) expect(THEME_VARIABLES, name).toContain(name)
    const a = document.implementation.createHTMLDocument('a').documentElement
    const b = document.implementation.createHTMLDocument('b').documentElement
    applyDensity(a, 'compact')
    applyDensity(b, 'large')
    copyTheme(a, b)
    expect(b.getAttribute('data-density')).toBe('compact')
    for (const name of DENSITY_VARIABLES) expect(b.style.getPropertyValue(name), name).toBe(a.style.getPropertyValue(name))
  })
})

describe('DensityChoice: the settings control', () => {
  const text = { label: 'Density', hint: 'How much room things take.', densities: { compact: { name: 'Tight', note: 'More on the screen' }, normal: { name: 'Regular', note: 'The usual sizes' } } }

  test('one option for each density the app offers, with the words of the app; the chosen one is marked', () => {
    render(<DensityChoice densities={DENSITIES} chosen="normal" onDensity={() => {}} text={text} />)
    const group = screen.getByRole('radiogroup', { name: 'Density' })
    const options = [...group.querySelectorAll('[role="radio"]')]
    // A density without words of the app shows its own label.
    expect(options.map((o) => o.querySelector('.font-medium')?.textContent)).toEqual(['Tight', 'Regular', 'Large'])
    expect(options.map((o) => o.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(options.filter((o) => (o as HTMLElement).tabIndex === 0)).toHaveLength(1)
  })

  test('a click hands the app the density picked; an app may offer its own', () => {
    const onDensity = vi.fn()
    const mine = densityWith('large', { id: 'roomy', label: 'Roomy' })
    render(<DensityChoice densities={[...DENSITIES, mine]} chosen="compact" onDensity={onDensity} text={text} />)
    fireEvent.click(screen.getByRole('radio', { name: /^Roomy/ }))
    expect(onDensity).toHaveBeenCalledTimes(1)
    expect(onDensity.mock.calls[0]![0]).toBe(mine)
    fireEvent.click(screen.getByRole('radio', { name: /^Tight/ }))
    expect(onDensity.mock.calls[1]![0].id).toBe('compact')
  })

  test('each card draws three rows at a quarter of the row height of the density', () => {
    render(<DensityChoice densities={DENSITIES} chosen="normal" onDensity={() => {}} text={text} />)
    const heights = DENSITIES.map((d) => {
      const rows = [...document.querySelectorAll<HTMLElement>(`[data-preview="density-${d.id}"] [data-slot="density-preview"] > span`)]
      expect(rows, d.id).toHaveLength(3)
      return rows[0]!.style.height
    })
    expect(heights).toEqual(['8px', '10px', '12px'])
  })
})
