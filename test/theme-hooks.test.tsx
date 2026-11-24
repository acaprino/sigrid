// The four looks a theme asks for by name (the owner, 2026-11-24), each off unless the theme asks: boxed keys
// (`ThemeDef.keys`), a status tone on a badge (`Badge tone`), strong control borders (`ThemeDef.controls`) and a control
// border the palette states (`Surfaces.input`). First: with none asked, nothing of the toolkit changes. Then each hook.
// Last: the contrast of the preset they were approved for, measured by the engine and printed (`[theme-hooks]` lines).
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Badge, Button, Input, Kbd, Shortcut, Textarea, badgeVariants, type BadgeTone } from '../src/primitives'
import { FIELD_SURFACE, STRONG_BORDER } from '../src/lib/field'
import { cn } from '../src/lib/utils'
import { PALETTE_COMBOS } from '../src/palette'
import type { ThemeDef } from '../src/theme-catalog'
import { STATUS, themeTokens, tokensFor } from '../src/theme-engine'
import { BASE_THEME, THEME_ATTRIBUTES, applyTheme, copyTheme } from '../src/themes'
import { THEMES } from './fixtures/sample-themes'
import { SHELL_ACCENTS, SHELL_INPUT, SHELL_TONE, shellPreset } from './fixtures/shell-preset'
import { classes, contrast } from './helpers'

const SCHEMES = ['light', 'dark'] as const
const AA = 4.5
const PART = 3
/** `fg` at `alpha` over `bg`, as a class with `/80` or an opacity draws it. */
const mix = (fg: string, bg: string, alpha: number) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('')
const nord = THEMES.find((t) => t.id === 'nord')! as ThemeDef
// Tailwind also scans `test/`: a class with its variant written out in one literal here would be compiled even if the
// source had lost it (test/build.test.ts). So a variant and its class are joined with `+`, never one literal.
const KEYS = '[[data-keys=boxed]_&]' + ':'
const IN_BUTTON = '[[data-slot=button]_&]' + ':'
const STRONG = '[:where([data-controls=strong])_&]' + ':' + 'border-input'

describe('off by default', () => {
  test('a theme that asks for nothing writes only the sidebar attribute, in every theme and scheme', () => {
    for (const scheme of SCHEMES) {
      expect(tokensFor(BASE_THEME, scheme).attributes).toEqual({ 'data-sidebar': 'shared' })
      for (const theme of THEMES) expect(Object.keys(tokensFor(theme as ThemeDef, scheme).attributes), theme.id).toEqual(['data-sidebar'])
    }
  })

  test('the default of each hook, and a value that is not one, count as absent: the same tokens', () => {
    for (const scheme of SCHEMES) {
      const plain = tokensFor(nord, scheme)
      expect(tokensFor({ ...nord, keys: 'plain', controls: 'divider' }, scheme)).toEqual(plain)
      expect(tokensFor({ ...nord, keys: 'caps', controls: 'thick' } as unknown as ThemeDef, scheme)).toEqual(plain)
      const unstated = (input: unknown) => ({ ...nord, surfaces: { light: { ...nord.surfaces!.light, input }, dark: { ...nord.surfaces!.dark, input } } }) as unknown as ThemeDef
      expect(tokensFor(unstated(undefined), scheme)).toEqual(plain)
      expect(tokensFor(unstated('gray'), scheme)).toEqual(plain)
    }
  })

  test('applyTheme writes neither attribute, and takes away the ones a former theme asked for', () => {
    const el = document.createElement('div')
    applyTheme(el, { theme: BASE_THEME, scheme: 'light' })
    expect(el.hasAttribute('data-keys')).toBe(false)
    expect(el.hasAttribute('data-controls')).toBe(false)
    applyTheme(el, { theme: { ...BASE_THEME, keys: 'boxed', controls: 'strong' }, scheme: 'light' })
    expect(el.getAttribute('data-keys')).toBe('boxed')
    expect(el.getAttribute('data-controls')).toBe('strong')
    applyTheme(el, { theme: BASE_THEME, scheme: 'light' })
    expect(el.hasAttribute('data-keys')).toBe(false)
    expect(el.hasAttribute('data-controls')).toBe(false)
  })

  test('the status colours gain `info` and its soft ground, the same for every theme of a scheme; no other token is new', () => {
    for (const scheme of SCHEMES) {
      const t = tokensFor(BASE_THEME, scheme).colors
      expect(t['info']).toBe(STATUS[scheme].info)
      expect(t['info-soft']).toBe(STATUS[scheme]['info-soft'])
      for (const theme of THEMES) {
        const c = tokensFor(theme as ThemeDef, scheme).colors
        expect(c['info-soft'], theme.id).toBe(STATUS[scheme]['info-soft'])
        // A theme may move the colour just enough to hold on its own surfaces: the lightness only.
        if (!(theme as ThemeDef).surfaces) expect(c['info'], theme.id).toBe(STATUS[scheme].info)
        expect(contrast(c['info']!, c['info-soft']!), `${theme.id} ${scheme}: info on its soft`).toBeGreaterThanOrEqual(AA)
        for (const bg of ['paper', 'paper-2', 'raised'] as const) expect(contrast(c['info']!, c[bg]!), `${theme.id} ${scheme}: info on ${bg}`).toBeGreaterThanOrEqual(AA)
      }
    }
  })
})

describe('H1: boxed keys', () => {
  test('`keys: boxed` is written as data-keys on the root, carried to another window, and kept under a palette or the user\'s own page', () => {
    const boxed: ThemeDef = { ...BASE_THEME, keys: 'boxed' }
    expect(tokensFor(boxed, 'dark').attributes['data-keys']).toBe('boxed')
    expect(THEME_ATTRIBUTES).toEqual(expect.arrayContaining(['data-keys', 'data-controls']))
    const a = document.createElement('div')
    const b = document.createElement('div')
    applyTheme(a, { theme: boxed, scheme: 'light' })
    copyTheme(a, b)
    expect(b.getAttribute('data-keys')).toBe('boxed')
    applyTheme(a, { theme: boxed, scheme: 'light', palette: { seed: '#3366cc', combo: PALETTE_COMBOS[0] } })
    expect(a.getAttribute('data-keys')).toBe('boxed')
    const own = themeTokens({ ...nord, keys: 'boxed', controls: 'strong' }, 'light', { accent: '#4452c4', background: 'match' })
    expect(own.attributes).toMatchObject({ 'data-keys': 'boxed', 'data-controls': 'strong' })
  })

  test('a key is plain text as before, and every class of the cap is under the attribute: 20px, a hairline, l1 corners, monospace', () => {
    render(
      <>
        <Kbd data-testid="key">K</Kbd>
        <Shortcut keys={['Ctrl', 'Enter']} data-testid="combo" />
      </>,
    )
    const keys = [screen.getByTestId('key'), ...screen.getByTestId('combo').querySelectorAll('kbd')]
    expect(keys).toHaveLength(3)
    for (const key of keys) {
      const c = classes(key)
      // Plain, as R5 has it.
      for (const cls of ['font-sans', 'text-2xs', 'font-medium', 'text-ink-mute', 'max-md:pointer-coarse:hidden']) expect(c).toContain(cls)
      // Nothing draws a box without the attribute.
      const box = c.filter((cls) => /(?:^|:)(?:bg-|border|rounded|shadow-|font-mono|h-\d|min-w-|px-)/.test(cls))
      expect(box.length).toBeGreaterThan(0)
      for (const cls of box) expect(cls.startsWith(KEYS), cls).toBe(true)
      for (const cls of ['h-5', 'min-w-5', 'rounded-sm', 'border', 'border-line', 'px-1', 'font-mono', 'justify-center']) expect(c).toContain(`${KEYS}${cls}`)
      // Inside a button the hairline is the label's colour.
      expect(c).toContain(KEYS + IN_BUTTON + 'border-current' + '/35')
    }
  })
})

describe('H2: the tone of a badge', () => {
  const TONES: readonly BadgeTone[] = ['success', 'warning', 'danger', 'info']

  test('without a tone a badge is as it was: no attribute, no dot, the classes of its variant', () => {
    for (const variant of ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const) {
      const { container, unmount } = render(<Badge variant={variant}>Label</Badge>)
      const badge = container.querySelector('[data-slot="badge"]')!
      expect(badge.hasAttribute('data-tone')).toBe(false)
      expect(badge.className).toBe(cn(badgeVariants({ variant })))
      expect(classes(badge).some((cls) => cls.startsWith('before:'))).toBe(false)
      expect(badge.getAttribute('data-variant')).toBe(variant)
      unmount()
    }
  })

  test('a tone is the status colour on its soft ground with a 6px dot, in place of the variant\'s colours; the word stays', () => {
    const ground = { success: 'success', warning: 'warning', danger: 'destructive', info: 'info' } as const
    for (const tone of TONES) {
      const { container, unmount } = render(<Badge tone={tone}>Running</Badge>)
      const badge = container.querySelector('[data-slot="badge"]')!
      const c = classes(badge)
      expect(badge.getAttribute('data-tone')).toBe(tone)
      expect(badge.textContent).toBe('Running')
      expect(c).toEqual(expect.arrayContaining([`bg-${ground[tone]}-soft`, `text-${ground[tone]}`]))
      // The dot: 6px (1.5 units of 4px), round, the tone's colour, drawn by the badge.
      expect(c).toEqual(expect.arrayContaining(['before:size-1.5', 'before:rounded-full', 'before:bg-current', "before:content-['']"]))
      // The form is the badge's; the colours of the default variant are gone.
      expect(c).toEqual(expect.arrayContaining(['h-5', 'rounded-md', 'text-2xs', 'font-medium', 'gap-1']))
      for (const cls of ['bg-ink', 'text-paper', 'bg-accent', 'text-accent', 'bg-primary']) expect(c).not.toContain(cls)
      unmount()
    }
  })

  test('with asChild the child takes the tone and its dot', () => {
    render(
      <Badge asChild tone="info">
        <a href="#x">Queued</a>
      </Badge>,
    )
    const link = screen.getByRole('link', { name: 'Queued' })
    expect(link.getAttribute('data-tone')).toBe('info')
    expect(classes(link)).toEqual(expect.arrayContaining(['bg-info-soft', 'text-info', 'before:size-1.5']))
  })

  test('the word of each tone reads on its ground (4.5:1) in every theme and scheme', () => {
    const pairs = [['success', 'success-soft'], ['warning', 'warning-soft'], ['destructive', 'destructive-soft'], ['info', 'info-soft']] as const
    for (const theme of [BASE_THEME, ...THEMES] as readonly ThemeDef[]) {
      for (const scheme of SCHEMES) {
        const c = tokensFor(theme, scheme).colors
        for (const [text, soft] of pairs) expect(contrast(c[text]!, c[soft]!), `${theme.id} ${scheme}: ${text} on ${soft}`).toBeGreaterThanOrEqual(AA)
      }
    }
  })
})

describe('H3: strong control borders', () => {
  test('`controls: strong` is written as data-controls on the root', () => {
    expect(tokensFor({ ...BASE_THEME, controls: 'strong' }, 'light').attributes['data-controls']).toBe('strong')
  })

  test('fields and the outline button keep the light divider, and take the control border only under the attribute, as weak as the divider', () => {
    expect(STRONG_BORDER).toBe(STRONG)
    expect(FIELD_SURFACE.split(' ')).toEqual(expect.arrayContaining(['border-line', STRONG_BORDER]))
    render(
      <>
        <Input aria-label="Name" />
        <Textarea aria-label="Notes" />
        <Button variant="outline">Reply</Button>
        <Button variant="ghost">Skip</Button>
        <Button>Send</Button>
      </>,
    )
    for (const el of [screen.getByRole('textbox', { name: 'Name' }), screen.getByRole('textbox', { name: 'Notes' }), screen.getByRole('button', { name: 'Reply' })]) {
      const c = classes(el)
      expect(c).toContain('border-line')
      expect(c).toContain(STRONG_BORDER)
      // Never the control border without the attribute.
      expect(c).not.toContain('border-input')
      // The invalid red is a state: it wins over both.
      expect(c).toContain('aria-invalid:border-destructive')
    }
    for (const name of ['Skip', 'Send']) expect(classes(screen.getByRole('button', { name }))).not.toContain(STRONG_BORDER)
  })
})

describe('H4: a control border the palette states', () => {
  const stated = (input: string): ThemeDef => ({ ...nord, surfaces: { light: { ...nord.surfaces!.light, input }, dark: { ...nord.surfaces!.dark, input } } })

  test('a stated border that holds is kept as written, and changes no other colour', () => {
    for (const scheme of SCHEMES) {
      const before = tokensFor(nord, scheme)
      // A border far from every surface of the palette: nothing to correct.
      const input = scheme === 'light' ? '#4c566a' : '#d8dee9'
      const after = tokensFor(stated(input), scheme)
      expect(after.colors['input']).toBe(input)
      expect(after.corrected).not.toContain('input')
      expect({ ...after.colors, input: before.colors['input'] }).toEqual(before.colors)
      expect(after.shape).toEqual(before.shape)
      expect(after.attributes).toEqual(before.attributes)
    }
  })

  test('a stated border that is too faint is moved until it holds 3:1 on the page, the sidebar, the sheets and the chosen row', () => {
    for (const scheme of SCHEMES) {
      // The palette's own divider as the control border: under 3:1 everywhere.
      const t = tokensFor(stated(nord.surfaces![scheme].line), scheme)
      expect(t.corrected).toContain('input')
      for (const bg of ['paper', 'paper-2', 'raised', 'sidebar-paper', 'selected'] as const) expect(contrast(t.colors['input']!, t.colors[bg]!), `${scheme}: input on ${bg}`).toBeGreaterThanOrEqual(PART)
    }
  })
})

/* ———— The preset the hooks were approved for: every pair that must hold, measured on the engine's own colours ———— */

interface Pair {
  readonly name: string
  readonly kind: 'text' | 'part'
  readonly ratio: number
}

/** The pairs of the preset in one scheme: text at 4.5:1, parts of the interface at 3:1. */
function pairsOf(c: Readonly<Record<string, string>>): Pair[] {
  const grounds = ['paper', 'paper-2', 'raised', 'sidebar-paper'] as const
  const out: Pair[] = []
  const text = (name: string, fg: string, bg: string) => out.push({ name, kind: 'text', ratio: contrast(fg, bg) })
  const part = (name: string, fg: string, bg: string) => out.push({ name, kind: 'part', ratio: contrast(fg, bg) })
  for (const g of grounds) {
    const bg = c[g]!
    text(`ink on ${g}`, c['ink']!, bg)
    text(`ink-soft on ${g}`, c['ink-soft']!, bg)
    text(`ink-mute (and the letter of a key) on ${g}`, c['ink-mute']!, bg)
    // A row under the pointer: the ink at 6% over the ground.
    text(`ink-mute on a hovered row of ${g}`, c['ink-mute']!, mix(c['ink']!, bg, 0.06))
    text(`accent as text on ${g}`, c['accent']!, bg)
    for (const status of ['success', 'warning', 'destructive', 'info'] as const) text(`${status} on ${g}`, c[status]!, bg)
    part(`control border on ${g}`, c['input']!, bg)
    part(`focus ring on ${g}`, c['ring']!, bg)
    part(`primary fill on ${g}`, c['primary']!, bg)
  }
  const selected = c['selected']!
  text('text of a chosen row on its tint', c['selected-ink']!, selected)
  text('second line of a chosen row (its text at 80%)', mix(c['selected-ink']!, selected, 0.8), selected)
  text('ink-soft on a chosen row', c['ink-soft']!, selected)
  text('ink-mute on a chosen row', c['ink-mute']!, selected)
  text('label on the primary button', c['primary-foreground']!, c['primary']!)
  text('label on the primary button under the pointer', c['primary-foreground']!, c['accent-hover']!)
  text('badge neutral (ink on the ink at 6% over the page)', c['ink']!, mix(c['ink']!, c['paper']!, 0.06))
  for (const [word, soft] of [['success', 'success-soft'], ['warning', 'warning-soft'], ['destructive', 'destructive-soft'], ['info', 'info-soft']] as const) {
    text(`badge ${word} (word and dot on its ground)`, c[word]!, c[soft]!)
    text(`note: ink on ${soft}`, c['ink']!, c[soft]!)
  }
  text('toast (inverted): page on ink', c['paper']!, c['ink']!)
  part('control border on a chosen row', c['input']!, selected)
  part('focus ring and selection bar on a chosen row', c['ring']!, selected)
  return out
}

describe('the preset the hooks were approved for, measured', () => {
  const worst = (pairs: readonly (Pair & { readonly app: string })[], kind: Pair['kind']) => pairs.filter((p) => p.kind === kind).reduce((a, b) => (b.ratio < a.ratio ? b : a))

  test.each(SCHEMES)('%s: every text pair holds 4.5:1 and every part 3:1, for the five accents; the stated border is kept', (scheme) => {
    const all: (Pair & { readonly app: string })[] = []
    const failing: string[] = []
    for (const accent of SHELL_ACCENTS) {
      const tokens = tokensFor(shellPreset(accent), scheme, SHELL_TONE)
      const c = tokens.colors
      expect(tokens.attributes).toMatchObject({ 'data-keys': 'boxed', 'data-controls': 'strong' })
      // The dividers and the hairline of a key are decoration: under 3:1 by design.
      for (const g of ['paper', 'paper-2', 'raised', 'sidebar-paper'] as const) expect(contrast(c['line']!, c[g]!), `${accent.id}: line on ${g}`).toBeLessThan(PART)
      const pairs = pairsOf(c)
      for (const p of pairs) {
        all.push({ ...p, app: accent.id })
        if (p.ratio < (p.kind === 'text' ? AA : PART)) failing.push(`${accent.id} ${scheme}: ${p.name} ${p.ratio.toFixed(2)}`)
      }
      // The same preset without the hook: what the engine derives, and where it stands on the chosen row.
      const derived = tokensFor(shellPreset(accent, false), scheme, SHELL_TONE).colors
      const row = (name: string) => pairs.find((p) => p.name === name)!.ratio.toFixed(2)
      console.log(
        `[theme-hooks] ${scheme} ${accent.id}: input ${c['input']} (stated ${SHELL_INPUT[scheme]}, corrected: ${tokens.corrected.includes('input')}) on selected ${c['selected']} ${row('control border on a chosen row')}; ` +
          `derived without H4 ${derived['input']} on selected ${contrast(derived['input']!, derived['selected']!).toFixed(2)}; ` +
          `ink-mute ${c['ink-mute']} on selected ${row('ink-mute on a chosen row')}; selected-ink ${c['selected-ink']} ${row('text of a chosen row on its tint')}; second line ${row('second line of a chosen row (its text at 80%)')}; ` +
          `primary ${c['primary']} label ${c['primary-foreground']} ${row('label on the primary button')}; accent ${c['accent']}; ink-soft ${c['ink-soft']}; info ${c['info']} on ${c['info-soft']} ${row('badge info (word and dot on its ground)')}; corrected: ${tokens.corrected.join(',') || 'none'}`,
      )
    }
    const text = worst(all, 'text')
    const part = worst(all, 'part')
    console.log(`[theme-hooks] ${scheme} worst text pair: ${text.name}, ${text.app}, ${text.ratio.toFixed(2)}:1 (needs 4.5)`)
    console.log(`[theme-hooks] ${scheme} worst part pair: ${part.name}, ${part.app}, ${part.ratio.toFixed(2)}:1 (needs 3)`)
    console.log(`[theme-hooks] ${scheme} pairs under their threshold: ${failing.length ? failing.join(' | ') : 'none'}`)
    expect(failing).toEqual([])
  })
})
