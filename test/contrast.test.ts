// @vitest-environment node
// Text contrast (WCAG 2.x, AA: 4.5:1 for small text), computed from the token values of `theme.css`, for the
// light palette and for the dark one (`prefers-color-scheme: dark`). It does not measure the browser: it takes the declared colors and
// the backgrounds the package draws them on (paper, paper 2, raised).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { colorTokens, palettes, themeCss, themePalettes } from './theme-tokens'

export { colorTokens }

const root = fileURLToPath(new URL('../', import.meta.url))

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const { light, dark } = palettes(themeCss)
/**
 * Every group of tests runs on the two palettes of the first paint. The same rules, on all the theme × palette pairs
 * the user can choose, are tested by test/theme-engine.test.ts.
 */
const PALETTES: [string, Record<string, string>][] = [
  ['light', light],
  ['dark', dark],
]
/**
 * The backgrounds the content text is drawn on: page, lanes and headers, sheets and rows. The sidebar is a dark column with
 * its own inks (`sidebar-*`), in light too: the content inks never sit on it, and its own are tested below ("the sidebar column").
 */
const BACKGROUNDS = ['paper', 'paper-2', 'raised'] as const
/** The muted text: every use of it must stay readable. `muted-foreground` is the placeholder of the primitives. */
const MUTED = ['ink-mute', 'muted-foreground'] as const
/** The same backgrounds with the semantic names the primitives use. */
const SEMANTIC_BACKGROUNDS = ['background', 'popover'] as const
const AA = 4.5

describe.each(PALETTES)('text contrast from the theme tokens, palette %s', (_name, t) => {
  test('the theme declares every token this test reads', () => {
    for (const k of ['ink', 'ink-soft', 'ink-mute', 'muted-foreground', 'accent', 'accent-hover', 'accent-soft', 'primary', 'destructive', 'destructive-soft', ...BACKGROUNDS, ...SEMANTIC_BACKGROUNDS]) expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/)
  })

  test.each(MUTED)('%s reaches 4.5:1 on paper, paper-2 and white', (name) => {
    for (const bg of BACKGROUNDS) expect(contrast(t[name]!, t[bg]!), `${name} on ${bg}`).toBeGreaterThanOrEqual(AA)
    for (const bg of SEMANTIC_BACKGROUNDS) expect(contrast(t[name]!, t[bg]!), `${name} on ${bg}`).toBeGreaterThanOrEqual(AA)
  })

  test('ink and ink-soft reach 4.5:1 too, on every background', () => {
    for (const fg of ['ink', 'ink-soft'] as const) for (const bg of BACKGROUNDS) expect(contrast(t[fg]!, t[bg]!), `${fg} on ${bg}`).toBeGreaterThanOrEqual(AA)
  })

  test('muted-foreground (placeholders) is the same color as ink-mute', () => {
    expect(t['muted-foreground']).toBe(t['ink-mute'])
  })

  test('there is still a clear step between ink, ink-soft and ink-mute', () => {
    for (const bg of BACKGROUNDS) {
      const ink = contrast(t['ink']!, t[bg]!)
      const soft = contrast(t['ink-soft']!, t[bg]!)
      const mute = contrast(t['ink-mute']!, t[bg]!)
      // Calm, not grey on grey: between one level and the next at least a point and a half of contrast (three from the ink).
      expect(soft - mute, `ink-soft - ink-mute on ${bg}`).toBeGreaterThanOrEqual(1.5)
      expect(ink - soft, `ink - ink-soft on ${bg}`).toBeGreaterThanOrEqual(3)
    }
  })

  test('the contrast helper agrees with the published WCAG values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    // The old value of the muted text on white, computed by hand: 3.43.
    expect(contrast('#8f8a82', '#ffffff')).toBeCloseTo(3.43, 1)
  })
})

/** fg with opacity alpha over bg, like a color with /80. */
export function over(fg: string, bg: string, alpha: number): string {
  const c = [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

describe.each(PALETTES)('accent contrast from the theme tokens, palette %s', (_name, t) => {
  test('the text of the primary button (primary-foreground), at rest and on hover, reaches 4.5:1', () => {
    // The label is light in both palettes: in the dark the fill is a deep tone of the accent, not
    // the light accent of the text. That is why `primary-foreground` sits only on `primary` (and on its hover).
    const on = t['primary-foreground']!
    expect(contrast(on, t['primary']!), 'primary-foreground on primary').toBeGreaterThanOrEqual(AA)
    expect(contrast(on, t['accent-hover']!), 'primary-foreground on accent-hover').toBeGreaterThanOrEqual(AA)
    // R11 (2026-11-20): with the default tone (Vivid) a livelier fill may take the dark label, the one that reads better.
    expect(luminance(on) > 0.8 || luminance(on) < 0.02, 'the label of the filled button is light or dark, never in between').toBe(true)
  })

  test('accent text reaches 4.5:1 on the soft accent background', () => {
    expect(contrast(t['accent']!, t['accent-soft']!), 'accent on accent-soft').toBeGreaterThanOrEqual(AA)
  })

  test('destructive controls and badges reach 4.5:1, at rest and when highlighted', () => {
    const destructive = t['destructive']!
    const soft = t['destructive-soft']!
    expect(contrast(destructive, soft), 'destructive on destructive-soft').toBeGreaterThanOrEqual(AA)
    expect(contrast(t['destructive-foreground']!, destructive), 'destructive-foreground on destructive').toBeGreaterThanOrEqual(AA)
    for (const bg of BACKGROUNDS) {
      expect(contrast(destructive, t[bg]!), 'destructive on ' + bg).toBeGreaterThanOrEqual(AA)
      expect(contrast(destructive, over(soft, t[bg]!, 0.8)), 'button on hover on ' + bg).toBeGreaterThanOrEqual(AA)
      expect(contrast(destructive, over(destructive, t[bg]!, 0.1)), 'highlighted menu item on ' + bg).toBeGreaterThanOrEqual(AA)
      expect(contrast(t['destructive-foreground']!, over(destructive, t[bg]!, 0.9)), 'badge on hover on ' + bg).toBeGreaterThanOrEqual(AA)
    }
  })

  test('accent as text (the “Now” label) reaches 4.5:1 on paper, paper-2 and white', () => {
    for (const bg of BACKGROUNDS) expect(contrast(t['accent']!, t[bg]!), 'accent on ' + bg).toBeGreaterThanOrEqual(AA)
  })

  test('hover is a step of the accent that can be seen: it is one accent, not two', () => {
    // Darker than the filled button it hovers (with the default tone, Vivid, the fill is livelier than the accent as
    // text); a fill that is nearly black has no darker step to show, so its hover is lighter.
    if (luminance(t['primary']!) < 0.02) expect(luminance(t['accent-hover']!)).toBeGreaterThan(luminance(t['primary']!) * 1.5)
    else expect(luminance(t['accent-hover']!)).toBeLessThan(luminance(t['primary']!))
    // Same color, darker: the highest channel of the accent stays the highest on hover too.
    const dominant = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((best, v, i, all) => (v > all[best]! ? i : best), 0)
    expect(dominant(t['accent-hover']!)).toBe(dominant(t['accent']!))
  })

  test('the primary button hover is the accent-hover token, never an opacity mix', () => {
    const button = readFileSync(`${root}src/components/ui/button.tsx`, 'utf8')
    expect(button).toContain('hover:bg-accent-hover')
    expect(button).not.toMatch(/hover:bg-accent\/\d+/)
    // The text of buttons and badges on the accent is the token, never hand-written white (in the dark it would not be readable).
    expect(button).toContain('bg-primary text-primary-foreground')
    expect(button).not.toContain('text-white')
    const badge = readFileSync(`${root}src/components/ui/badge.tsx`, 'utf8')
    expect(badge).toContain('bg-destructive text-destructive-foreground')
    expect(badge).not.toContain('text-white')
  })

  test('no source puts text on a bg-accent fill: the accent is a text color (light in the dark), fills with text use bg-primary', () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : [`${dir}/${f}`]))
    const bad: string[] = []
    for (const f of walk(`${root}src`).filter((x) => x.endsWith('.tsx'))) {
      // The classes of an element sit on one line: a line with the accent fill and a label «on top» is an error.
      readFileSync(f, 'utf8')
        .split(/\r?\n/)
        .forEach((line, n) => {
          if (/(^|[\s"'`:])bg-accent(?=[\s"'`])/.test(line) && /text-(primary|accent)-foreground/.test(line)) bad.push(`${f.slice(root.length)}:${n + 1}`)
        })
    }
    expect(bad).toEqual([])
  })

  test('primary is the accent as a fill (in the dark a deeper tone of it) and destructive follows the scheme', () => {
    const isDark = luminance(t['paper']!) < luminance(t['ink']!)
    // The first paint is the gray baseline: without an accent the light fill is the accent itself, like the "Ink" kind.
    if (isDark && t['primary'] !== t['accent']) expect(luminance(t['primary']!), "in the dark the fill is deeper than the text accent").toBeLessThan(luminance(t['accent']!))
    // R11 (2026-11-20): the default tone is Vivid, so the fill is a livelier tone of the accent: it stays seen on the page.
    else expect((Math.max(luminance(t['primary']!), luminance(t['paper']!)) + 0.05) / (Math.min(luminance(t['primary']!), luminance(t['paper']!)) + 0.05)).toBeGreaterThanOrEqual(3)
    const scheme = luminance(t['paper']!) < luminance(t['ink']!) ? dark : light
    expect(t['destructive']).toBe(scheme['destructive'])
    expect(t['destructive-soft']).toBe(scheme['destructive-soft'])
  })
})

// Non-text contrast (WCAG 1.4.11, at least 3:1): the border that identifies a control and the focus ring.
// The decorative dividers (`line`, `border`) stay light on purpose: they do not identify any control.
describe.each(PALETTES)('non-text contrast from the theme tokens (WCAG 1.4.11, 3:1), palette %s', (_name, t) => {
  const NON_TEXT = 3
  const ALL_BACKGROUNDS = [...BACKGROUNDS, ...SEMANTIC_BACKGROUNDS]
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : [`${dir}/${f}`]))
  const sources = walk(`${root}src`).filter((f) => f.endsWith('.tsx'))

  test('the theme declares the tokens of the control border and of the focus ring', () => {
    for (const k of ['input', 'ring', 'line', 'border']) expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/)
  })

  test('the border of checkbox, inputs, textareas and selects (input) reaches 3:1 on every background', () => {
    for (const bg of ALL_BACKGROUNDS) expect(contrast(t['input']!, t[bg]!), `input on ${bg}`).toBeGreaterThanOrEqual(NON_TEXT)
  })

  test('the decorative dividers stay lighter than the control border', () => {
    for (const bg of BACKGROUNDS) {
      expect(contrast(t['line']!, t[bg]!), `line on ${bg}`).toBeLessThan(NON_TEXT)
      expect(contrast(t['input']!, t[bg]!), `input on ${bg}`).toBeGreaterThan(contrast(t['line']!, t[bg]!))
    }
  })

  test('the focus ring (R8: the accent as text, a solid 2px outline) reaches 3:1 on every background', () => {
    expect(t['ring']).toBe(t['accent'])
    for (const bg of ALL_BACKGROUNDS) expect(contrast(t['ring']!, t[bg]!), `ring on ${bg}`).toBeGreaterThanOrEqual(NON_TEXT)
  })

  test('every focus ring in the sources, with its own opacity, reaches 3:1 on the surface it sits on', () => {
    // `focus-visible:ring-ink/20` (the sidebar, before) was at 1.5:1: you could see where you were only with a bit of luck.
    // The toast's ring is its own text colour (`paper`) and sits on its dark surface (`ink`).
    const ON: Record<string, readonly string[]> = { paper: ['ink'] }
    const files = walk(`${root}src`).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    const bad: string[] = []
    let seen = 0
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/(?:focus-visible|focus-within|focus|data-highlighted):(?:ring|outline)-([a-z0-9-]+?)(?:\/(\d+))?(?=[\s'"`]|$)/g)) {
        const [cls, token, alpha] = [m[0], m[1]!, m[2]]
        if (!t[token]) continue // `outline-2`, `outline-offset-2`, `outline-solid`: they are not the color
        seen++
        for (const bg of ON[token] ?? BACKGROUNDS) {
          const c = contrast(alpha === undefined ? t[token]! : over(t[token]!, t[bg]!, Number(alpha) / 100), t[bg]!)
          if (c < NON_TEXT) bad.push(`${f.slice(root.length)}: ${cls} on ${bg} = ${c.toFixed(2)}:1`)
        }
      }
    }
    expect(seen, 'the scan found no focus ring at all: the pattern is stale').toBeGreaterThan(4)
    expect(bad).toEqual([])
  })

  test('focus is drawn one way (R8): a 2px outline, never a box-shadow ring', () => {
    const files = walk(`${root}src`).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    const bad: string[] = []
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/(?:focus-visible|focus-within|focus):ring(?:-[\w\[\]/.]+)?/g)) bad.push(`${f.slice(root.length)}: ${m[0]}`)
      for (const m of readFileSync(f, 'utf8').matchAll(/(?:focus-visible|focus-within|focus|data-highlighted):outline-(\d+)(?=[\s'"`]|$)/g)) if (m[1] !== '2') bad.push(`${f.slice(root.length)}: ${m[0]}`)
    }
    expect(bad).toEqual([])
  })

  test('selects and the tags box use the light divider border, like the other fields (the design of 2026-11-22)', () => {
    const line = (file: string, needle: string) => readFileSync(`${root}${file}`, 'utf8').split('\n').find((l) => l.includes(needle)) ?? ''
    // The native `<select>`s became Base UI's Select: the border sits on its button.
    expect(line('src/components/ui/select.tsx', 'flex w-full items-center justify-between')).toContain('border-line')
    expect(line('src/internal/chips.tsx', 'flex min-h-(--control-md) w-full')).toContain('border-line')
  })
})

describe.each(PALETTES)('the sidebar, the light bar of Park UI, palette %s', (_name, t) => {
  const bar = t['sidebar-paper']!
  const selected = t['sidebar-selected']!
  // On the light bar the rows take the content's inks; under the pointer a row is the ink at 5% (`hover:bg-ink/5`, and
  // the gliding highlight of Unlumen's sidebar with `animated`).
  const hover = over(t['ink']!, bar, 0.05)

  test('the theme declares every token of the bar', () => {
    for (const k of ['sidebar-paper', 'sidebar-ink', 'sidebar-mute', 'sidebar-selected', 'sidebar-selected-ink', 'sidebar-accent', 'sidebar-accent-ink']) expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/)
  })

  test('the bar is the ground: a step below the page, in both schemes, so the page reads as a sheet on it', () => {
    expect(luminance(bar)).toBeLessThan(luminance(t['paper']!))
    expect(contrast(bar, t['paper']!)).toBeLessThan(1.15)
  })

  test('its text reaches 7:1 and its muted text 4.5:1, at rest and on a hovered row', () => {
    for (const bg of [bar, hover]) {
      expect(contrast(t['sidebar-ink']!, bg), 'sidebar-ink').toBeGreaterThanOrEqual(7)
      expect(contrast(t['sidebar-mute']!, bg), 'sidebar-mute').toBeGreaterThanOrEqual(AA)
      expect(contrast(t['ink-mute']!, bg), 'ink-mute').toBeGreaterThanOrEqual(AA)
    }
  })

  test('the selected row is the accent tint and its text reaches 4.5:1', () => {
    expect(selected).toBe(t['selected'])
    expect(contrast(t['sidebar-selected-ink']!, selected)).toBeGreaterThanOrEqual(AA)
  })

  test('the accent of the bar reaches 4.5:1 on the bar, 3:1 (a mark) on a hovered row and on the selection tint, and its ink 4.5:1 on it', () => {
    // Navigation is neutral (R1, R2): no accent text sits on a hovered or chosen row of the light bar, only marks.
    expect(contrast(t['sidebar-accent']!, bar)).toBeGreaterThanOrEqual(AA)
    for (const bg of [hover, selected]) expect(contrast(t['sidebar-accent']!, bg)).toBeGreaterThanOrEqual(3)
    expect(contrast(t['sidebar-accent-ink']!, t['sidebar-accent']!)).toBeGreaterThanOrEqual(AA)
  })

  test('the focus ring inside the bar (the accent as text, solid) reaches 3:1', () => {
    for (const bg of [bar, selected]) expect(contrast(t['ring']!, bg)).toBeGreaterThanOrEqual(3)
  })

})

describe('text colors in the sources', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : [`${dir}/${f}`]))
  const sources = walk(`${root}src`).filter((f) => f.endsWith('.tsx'))
  const classes = (text: string) => text.match(/[A-Za-z0-9_:\-./\[\]#%()]+/g) ?? []

  test('no text color is hard-coded or diluted with opacity', () => {
    const bad: string[] = []
    for (const f of sources) {
      for (const c of classes(readFileSync(f, 'utf8'))) {
        // `text-[#abc]`, `text-[rgb(...)]` and `text-ink-mute/70`: a color that does not go through the tokens and the test above.
        if (/(^|:)text-\[(#|rgb|hsl|oklch|color)/.test(c) || /(^|:)text-(ink|ink-soft|ink-mute|paper|accent|muted-foreground|foreground)\/\d+/.test(c)) bad.push(`${f.slice(root.length)}: ${c}`)
      }
    }
    expect(bad).toEqual([])
  })

  test('placeholders and descriptions of the primitives use the muted-foreground token', () => {
    for (const f of ['src/components/ui/input.tsx', 'src/components/ui/textarea.tsx']) {
      expect(readFileSync(`${root}${f}`, 'utf8'), f).toContain('placeholder:text-muted-foreground')
    }
  })

  test('no source writes the old muted value', () => {
    for (const f of sources) expect(readFileSync(f, 'utf8').toLowerCase(), f).not.toContain('8f8a82')
  })
})

describe('the chosen themes', () => {
  test('the scheme tells the browser, so scrollbars and native controls follow the chosen theme', () => {
    const clean = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(clean).toMatch(/\[data-scheme="light"\]\s*\{\s*color-scheme:\s*light;/)
    expect(clean).toMatch(/\[data-scheme="dark"\]\s*\{\s*color-scheme:\s*dark;/)
  })
})

describe('the dark palette', () => {
  test('redefines every color token of the light palette, and nothing else', () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort())
  })

  test('is dark: the page is darker than the ink, the raised surfaces are lighter than the page, lanes a step below', () => {
    expect(luminance(dark['paper']!)).toBeLessThan(luminance(dark['ink']!))
    expect(luminance(dark['paper']!)).toBeLessThan(luminance(dark['raised']!))
    // Since 2026-11-15 (approved sketch): lanes and bar (paper-2) sit a step below the page.
    expect(luminance(dark['paper-2']!)).toBeLessThanOrEqual(luminance(dark['paper']!))
  })

  test('the theme follows the system and tells the browser, so scrollbars and native controls follow it too', () => {
    const clean = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(clean).toContain('@media (prefers-color-scheme: dark)')
    expect(clean).toMatch(/color-scheme:\s*light dark/)
    // The elevation changes too: on dark paper a drop of ink would be a glow (Park's dark shadows).
    for (const k of ['--elevation-xs', '--elevation-md', '--elevation-lg', '--elevation-float']) expect(clean.slice(clean.indexOf('prefers-color-scheme: dark')), k).toContain(k)
  })

  test('a bare `border` (sheets, dialogs, menus, popovers of shadcn) takes the border token, not the text color', () => {
    // Tailwind 4 colors a bare `border` with `currentColor`: the ink, which in the dark is almost white.
    const clean = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(clean).toMatch(/\*,\s*::after,\s*::before,\s*::backdrop,\s*::file-selector-button\s*\{\s*border-color:\s*var\(--color-border/)
  })
})

// Icons inside the shapes: the background color is user data, the same in both palettes, so
// are the two inks. Each of the seven colors has an ink with at least 3:1.

