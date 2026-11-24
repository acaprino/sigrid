// @vitest-environment node
// The dark scheme as parameters of the theme (owner, 2026-11-23: «Sigrid deve avere gli strumenti per gestire la
// coloreria anche del dark, come avviene per il chiaro»): how deep the page is and how far below it the sidebar sits,
// and whether the backgrounds take the theme's hue. Without them every theme is what it was; with them the engine
// still holds every threshold. The contrast is computed here with its own formula, not with the engine's.
import { describe, expect, test } from 'vitest'
import { DARK_DEPTHS, DARK_TINTS, DEFAULT_DARK_DEPTH, DEFAULT_DARK_TINT, colorTheme, themeDark, themeTokens } from '../src'
import type { ThemeDark, ThemeDef } from '../src'
import { fromHex, tokensFor } from '../src/theme-engine'
import type { ThemeTone } from '../src/theme-engine'
import { THEMES } from './fixtures/sample-themes'

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
const mix = (fg: string, bg: string, alpha: number) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('')
const gray = (hex: string) => hex.slice(1, 3) === hex.slice(3, 5) && hex.slice(3, 5) === hex.slice(5, 7)
const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

const DEFS: readonly ThemeDef[] = THEMES
/** The themes whose backgrounds the engine computes: the parameters are theirs. */
const GENERATED = DEFS.filter((t) => t.surfaces === undefined)
const AS_CHOSEN: ThemeTone = { intensity: 'theme', light: 'theme' }
const TONES: readonly (ThemeTone | null)[] = [null, AS_CHOSEN, { intensity: 'faded', light: 'darker' }, { intensity: 'bright', light: 'lighter' }, { intensity: 'vivid', light: 'darker' }]
const RANGE: readonly ThemeDark[] = DARK_DEPTHS.flatMap((depth) => DARK_TINTS.map((tint) => ({ depth, tint })))
const named = (dark: ThemeDark) => `${dark.depth}/${dark.tint}`
const def = (id: string): ThemeDef => DEFS.find((t) => t.id === id)!
const SURFACES = ['paper', 'paper-2', 'sidebar-paper', 'raised', 'line'] as const

describe('the choices', () => {
  test('three depths and two tints; the standard neutral anthracite is the default', () => {
    expect(DARK_DEPTHS).toEqual(['deep', 'standard', 'soft'])
    expect(DARK_TINTS).toEqual(['neutral', 'theme'])
    expect(DEFAULT_DARK_DEPTH).toBe('standard')
    expect(DEFAULT_DARK_TINT).toBe('neutral')
  })

  test('a saved value keeps only what is valid and not the default; with nothing left there are no parameters', () => {
    expect(themeDark({ depth: 'deep', tint: 'theme' })).toEqual({ depth: 'deep', tint: 'theme' })
    expect(themeDark({ depth: 'soft', tint: 'navy', more: 1 })).toEqual({ depth: 'soft' })
    expect(themeDark({ depth: 'pitch', tint: 'theme' })).toEqual({ tint: 'theme' })
    for (const none of [null, undefined, 'deep', 3, [], {}, { depth: 'standard' }, { tint: 'neutral' }, { depth: 'standard', tint: 'neutral' }, { depth: 'constructor' }]) expect(themeDark(none), JSON.stringify(none)).toBeNull()
  })
})

describe('without the parameters nothing moves', () => {
  test('the dark of a generated theme is the ladder it had: values computed before the parameters existed (Sigrid 4.3.2)', () => {
    const neutro = tokensFor(def('neutro'), 'dark', AS_CHOSEN).colors
    expect([neutro['paper'], neutro['sidebar-paper'], neutro['paper-2'], neutro['raised'], neutro['line'], neutro['input'], neutro['selected'], neutro['accent-soft'], neutro['ink-mute']])
      .toEqual(['#1e1e1e', '#171717', '#171717', '#2a2a2a', '#353535', '#747474', '#0c2927', '#0c3230', '#969593'])
    // In the default tone the sidebar takes the theme's tint, as before.
    const notte = tokensFor(def('notte'), 'dark').colors
    expect([notte['paper'], notte['sidebar-paper'], notte['raised'], notte['line'], notte['selected'], notte['accent-soft'], notte['ink-mute']])
      .toEqual(['#1e1e1e', '#0b121b', '#2a2a2a', '#353535', '#492600', '#422200', '#959699'])
    // The solid sidebar and Ink.
    const solid = tokensFor(def('ultravioletto'), 'dark', AS_CHOSEN).colors
    expect([solid['paper'], solid['sidebar-paper'], solid['paper-2'], solid['selected']]).toEqual(['#1e1e1e', '#111014', '#171717', '#2a1747'])
    const ink = tokensFor(def('inchiostro'), 'dark').colors
    expect([ink['paper'], ink['sidebar-paper'], ink['selected'], ink['accent-soft'], ink['ink-mute']]).toEqual(['#1e1e1e', '#171717', '#333333', '#2b2b2b', '#9b9b9b'])
  })

  test.each(DEFS.map((t) => t.id))('%s: no parameters, the default ones and values that are none give the same tokens, in both schemes', (id) => {
    const t = def(id)
    for (const scheme of ['light', 'dark'] as const) {
      for (const tone of [null, AS_CHOSEN]) {
        const plain = tokensFor(t, scheme, tone)
        for (const dark of [{}, { depth: 'standard' }, { tint: 'neutral' }, { depth: 'standard', tint: 'neutral' }, { depth: 'pitch', tint: 'navy' }, 'deep', null]) {
          expect(tokensFor({ ...t, dark: dark as never }, scheme, tone), `${scheme} ${JSON.stringify(dark)}`).toEqual(plain)
        }
      }
    }
  }, 30_000)

  test.each(GENERATED.map((t) => t.id))('%s: the light scheme does not know the parameters', (id) => {
    for (const tone of [null, AS_CHOSEN]) {
      const plain = tokensFor(def(id), 'light', tone)
      for (const dark of RANGE) expect(tokensFor({ ...def(id), dark }, 'light', tone), named(dark)).toEqual(plain)
    }
  }, 30_000)
})

describe('the depth', () => {
  test('the page of each depth: a near-black, the anthracite, a lighter charcoal', () => {
    const page = (depth: ThemeDark['depth']) => tokensFor({ ...def('neutro'), dark: { depth } }, 'dark', AS_CHOSEN).colors
    expect([page('deep')['paper'], page('deep')['sidebar-paper'], page('deep')['raised'], page('deep')['line']]).toEqual(['#161616', '#0d0d0d', '#242424', '#303030'])
    expect([page('standard')['paper'], page('standard')['sidebar-paper'], page('standard')['raised'], page('standard')['line']]).toEqual(['#1e1e1e', '#171717', '#2a2a2a', '#353535'])
    expect([page('soft')['paper'], page('soft')['sidebar-paper'], page('soft')['raised'], page('soft')['line']]).toEqual(['#222222', '#1c1c1c', '#2a2a2a', '#373737'])
    for (const [depth, L] of [['deep', 0.2], ['standard', 0.235], ['soft', 0.25]] as const) expect(fromHex(page(depth)['paper']!).L, depth).toBeCloseTo(L, 2)
  })

  test.each(GENERATED.map((t) => t.id))('%s: the sidebar and the lanes below the page, the sheets above, the lines above the sheets, at every depth, tint and tone', (id) => {
    for (const sidebar of ['tenue', 'piena', 'scura'] as const) for (const dark of RANGE) for (const tone of TONES) {
      const c = tokensFor({ ...def(id), sidebar, dark }, 'dark', tone).colors
      const where = `${sidebar} ${named(dark)} ${JSON.stringify(tone)}`
      expect(lum(c['sidebar-paper']!), where).toBeLessThan(lum(c['paper']!))
      expect(lum(c['paper-2']!), where).toBeLessThan(lum(c['paper']!))
      expect(lum(c['raised']!), where).toBeGreaterThan(lum(c['paper']!))
      expect(lum(c['line']!), where).toBeGreaterThan(lum(c['raised']!))
    }
  }, 30_000)

  test('the steps of the ladder: the sidebar a clear step below the page at every depth, deeper is a wider step, and soft brings the page up to the standard sheets', () => {
    const at = (depth: ThemeDark['depth']) => tokensFor({ ...def('notte'), dark: { depth } }, 'dark', AS_CHOSEN).colors
    const [deep, standard, soft] = [at('deep'), at('standard'), at('soft')]
    for (const c of [deep, standard, soft]) {
      const side = ratio(c['sidebar-paper']!, c['paper']!)
      expect(side).toBeGreaterThanOrEqual(1.06)
      expect(side).toBeLessThanOrEqual(1.09)
      const line = ratio(c['line']!, c['paper']!)
      expect(line).toBeGreaterThanOrEqual(1.3)
      expect(line).toBeLessThanOrEqual(1.4)
      expect(ratio(c['line']!, c['raised']!)).toBeGreaterThanOrEqual(1.15)
    }
    expect(lum(deep['paper']!)).toBeLessThan(lum(standard['paper']!))
    expect(lum(standard['paper']!)).toBeLessThan(lum(soft['paper']!))
    // The same ratio is a wider step of lightness on a darker page.
    const step = (c: Readonly<Record<string, string>>) => fromHex(c['paper']!).L - fromHex(c['sidebar-paper']!).L
    expect(step(deep)).toBeGreaterThan(step(standard))
    expect(step(standard)).toBeGreaterThan(step(soft))
    // Deep keeps the sheets' ratio; soft keeps the sheets themselves, which have no room to rise (the fill's 3:1).
    expect(Math.abs(ratio(deep['raised']!, deep['paper']!) - ratio(standard['raised']!, standard['paper']!))).toBeLessThan(0.02)
    expect(soft['raised']).toBe(standard['raised'])
    expect(ratio(soft['raised']!, soft['paper']!)).toBeGreaterThanOrEqual(1.1)
    // With the tone as designed the selected item stays apart from the page at every depth, by its lightness too.
    for (const c of [deep, standard, soft]) expect(ratio(c['selected']!, c['paper']!)).toBeGreaterThanOrEqual(1.02)
  })

  test.each(GENERATED.map((t) => t.id))('%s: the depth leaves the text where it was designed, no level is moved that the standard ladder does not move', (id) => {
    for (const tone of TONES) {
      const standard = tokensFor(def(id), 'dark', tone).corrected
      for (const depth of ['deep', 'soft'] as const) {
        const moved = tokensFor({ ...def(id), dark: { depth } }, 'dark', tone).corrected
        // Soft lifts its selected item a little, and the muted text with it in a few more tones: the two levels above stay.
        for (const role of depth === 'soft' ? ['ink', 'inkSoft'] : ['ink', 'inkSoft', 'inkMute']) if (!standard.includes(role)) expect(moved, `${depth} ${JSON.stringify(tone)}`).not.toContain(role)
      }
    }
  }, 30_000)
})

describe('the tint', () => {
  test.each(GENERATED.map((t) => t.id))('%s, neutral: the page, the sheets and the lines are grays at every depth and in every tone', (id) => {
    for (const depth of DARK_DEPTHS) for (const tone of TONES) {
      const c = tokensFor({ ...def(id), dark: { depth, tint: 'neutral' } }, 'dark', tone).colors
      for (const name of ['paper', 'raised', 'line']) expect(gray(c[name]!), `${depth} ${name} ${JSON.stringify(tone)}`).toBe(true)
    }
  }, 30_000)

  const TINTED = GENERATED.filter((x) => x.chroma > 0).map((t) => t.id)

  test.each(TINTED)('%s, theme: every background takes the hue of the theme\'s grays, at a low chroma; a warm hue takes less', (id) => {
    const t = def(id)
    for (const depth of DARK_DEPTHS) {
      const c = tokensFor({ ...t, dark: { depth, tint: 'theme' } }, 'dark', AS_CHOSEN).colors
      const warm = t.hue <= 110 || t.hue >= 325
      for (const name of SURFACES) {
        const k = fromHex(c[name]!)
        const where = `${t.id} ${depth} ${name} ${c[name]}`
        expect(gray(c[name]!), where).toBe(false)
        // Eight bits a channel leave a dark, faint colour a coarse hue.
        expect(apart(k.h, t.hue), where).toBeLessThanOrEqual(20)
        expect(k.C, where).toBeLessThanOrEqual(warm ? 0.012 : 0.022)
      }
      expect(fromHex(c['paper']!).C, t.id).toBeGreaterThanOrEqual(warm ? 0.005 : 0.012)
    }
  }, 30_000)

  test('theme: a midnight blue from a cool gray, a warm charcoal from a warm one', () => {
    expect(tokensFor({ ...def('notte'), dark: { tint: 'theme' } }, 'dark', AS_CHOSEN).colors['paper']).toBe('#191e26')
    expect(tokensFor({ ...def('notte'), dark: { depth: 'deep', tint: 'theme' } }, 'dark', AS_CHOSEN).colors['paper']).toBe('#12161d')
    expect(tokensFor({ ...def('seppia'), dark: { tint: 'theme' } }, 'dark', AS_CHOSEN).colors['paper']).toBe('#211d1a')
  })

  test.each(TINTED)('%s: the tint keeps the ladder, each background about as light as its gray and never lighter', (id) => {
    for (const depth of DARK_DEPTHS) {
      const neutral = tokensFor({ ...def(id), dark: { depth } }, 'dark', AS_CHOSEN).colors
      const tinted = tokensFor({ ...def(id), dark: { depth, tint: 'theme' } }, 'dark', AS_CHOSEN).colors
      for (const name of ['paper', 'raised', 'line']) {
        expect(Math.abs(fromHex(tinted[name]!).L - fromHex(neutral[name]!).L), `${depth} ${name}`).toBeLessThan(0.008)
        // The ladder sits at thresholds measured on the grays (the fill at 3:1 on the sheets): a hue must not weigh more.
        expect(lum(tinted[name]!), `${depth} ${name}`).toBeLessThanOrEqual(lum(neutral[name]!))
      }
    }
  }, 30_000)

  test('grays with no chroma have no hue to give: Ink and a gray baseline stay neutral', () => {
    const base: ThemeDef = { id: 'gray', label: 'Gray', hue: 200, chroma: 0, accent: [0.16, 258], sidebar: 'tenue', palette: 'crisp' }
    for (const t of [def('inchiostro'), base]) for (const depth of DARK_DEPTHS) {
      expect(tokensFor({ ...t, dark: { depth, tint: 'theme' } }, 'dark', AS_CHOSEN), `${t.id} ${depth}`).toEqual(tokensFor({ ...t, dark: { depth } }, 'dark', AS_CHOSEN))
    }
  })
})

describe('the thresholds hold on the whole range', () => {
  // The catalog's themes with their own sidebar, four of them with the other two as well, and themes made of the
  // colours `colorTheme` is tested with, on a cool and on a warm gray.
  const PICKS = ['#00857a', '#d1453b', '#eb6f0a', '#f5b800', '#058527', '#3db8e5', '#246fe0', '#7b3ff2', '#d6246e', '#3d4350']
  const cases: (readonly [string, ThemeDef])[] = [
    ...GENERATED.map((t) => [t.id, t] as const),
    ...(['neutro', 'notte', 'seppia', 'arancio'] as const).flatMap((id) => (['piena', 'scura'] as const).map((sidebar) => [`${id} ${sidebar}`, { ...def(id), sidebar }] as const)),
    ...PICKS.flatMap((color) => {
      const p = fromHex(color)
      return ([[255, 'cool'], [70, 'warm']] as const).map(([hue, name]) => [`${color} ${name}`, { id: 'pick', label: 'Pick', hue, chroma: 0.012, accent: [Math.max(p.C, 0.001), p.h], sidebar: 'tenue', palette: 'crisp', spot: '#eb6f0a' } satisfies ThemeDef] as const)
    }),
  ]

  test.each(cases)('%s: text at 4.5:1, what is seen without text at 3:1, at every depth and tint, in five tones', (_name, theme) => {
    for (const dark of RANGE) for (const tone of TONES) {
      const tk = tokensFor({ ...theme, dark }, 'dark', tone)
      const t = tk.colors
      const where = `${named(dark)} ${JSON.stringify(tone)}`
      const own = tk.attributes['data-sidebar'] === 'own'
      const BG = ['paper', 'paper-2', 'raised', ...(own ? [] : ['sidebar-paper'])].map((k) => t[k]!)
      // The text, from the faintest to the strongest, and the selected item under the faintest.
      for (const bg of [...BG, t['selected']!]) expect(ratio(t['ink-mute']!, bg), `ink-mute ${where}`).toBeGreaterThanOrEqual(4.5)
      for (const bg of BG) {
        expect(ratio(t['ink']!, bg), `ink ${where}`).toBeGreaterThanOrEqual(7)
        expect(ratio(t['ink-soft']!, bg) - ratio(t['ink-mute']!, bg), `ink-soft ${where}`).toBeGreaterThanOrEqual(1.5)
        expect(ratio(t['ink']!, bg) - ratio(t['ink-soft']!, bg), `ink ${where}`).toBeGreaterThanOrEqual(3)
      }
      expect(ratio(t['selected-ink']!, t['selected']!), `selected ink ${where}`).toBeGreaterThanOrEqual(4.5)
      // The accent as text and as the focus ring; the fill with its label, and seen without one.
      for (const bg of [...BG, t['accent-soft']!]) expect(ratio(t['accent']!, bg), `accent ${where}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(t['ring']!, t['selected']!), `ring ${where}`).toBeGreaterThanOrEqual(3)
      expect(ratio(t['primary-foreground']!, t['primary']!), `label ${where}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(t['primary-foreground']!, t['accent-hover']!), `label on hover ${where}`).toBeGreaterThanOrEqual(4.5)
      for (const bg of BG) {
        expect(ratio(t['primary']!, bg), `fill ${where}`).toBeGreaterThanOrEqual(3)
        expect(ratio(t['input']!, bg), `control border ${where}`).toBeGreaterThanOrEqual(3)
        expect(ratio(t['line']!, bg), `divider ${where}`).toBeLessThan(3)
        expect(ratio(t['spot']!, bg), `spot ${where}`).toBeGreaterThanOrEqual(3)
      }
      expect(ratio(t['spot-foreground']!, t['spot']!), `label on spot ${where}`).toBeGreaterThanOrEqual(4.5)
      for (const bg of [...BG, t['spot-soft']!]) expect(ratio(t['spot-ink']!, bg), `spot ink ${where}`).toBeGreaterThanOrEqual(4.5)
      // The red holds on every ladder (the engine would move it, as on a curated palette); the status colours as in every theme.
      expect(ratio(t['destructive']!, t['destructive-soft']!), `red on its soft ${where}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(t['destructive-foreground']!, t['destructive']!), `text on red ${where}`).toBeGreaterThanOrEqual(4.5)
      for (const bg of BG) {
        expect(ratio(t['destructive']!, bg), `red ${where}`).toBeGreaterThanOrEqual(4.5)
        expect(ratio(t['destructive']!, mix(t['destructive-soft']!, bg, 0.8)), `red on hover ${where}`).toBeGreaterThanOrEqual(4.5)
        expect(ratio(t['destructive']!, mix(t['destructive']!, bg, 0.1)), `red menu item ${where}`).toBeGreaterThanOrEqual(4.5)
        for (const name of ['success', 'warning']) expect(ratio(t[name]!, bg), `${name} ${where}`).toBeGreaterThanOrEqual(4.5)
      }
      expect(ratio(t['ink']!, t['highlight']!), `ink on highlight ${where}`).toBeGreaterThanOrEqual(7)
      // The sidebar, with the content's inks or its own.
      expect(ratio(t['sidebar-ink']!, t['sidebar-paper']!), `sidebar ink ${where}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(t['sidebar-mute']!, t['sidebar-paper']!), `sidebar mute ${where}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(t['sidebar-selected-ink']!, t['sidebar-selected']!), `sidebar selected ink ${where}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(t['sidebar-accent']!, t['sidebar-paper']!), `sidebar accent ${where}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(t['sidebar-accent-ink']!, t['sidebar-accent']!), `sidebar accent ink ${where}`).toBeGreaterThanOrEqual(4.5)
      // The user's colours: a dot at 3:1 on the content (the icon and the sidebar's own shades left with 5.0.0: nothing drew them).
      for (let n = 1; n <= 18; n++) for (const bg of BG) expect(ratio(t[`mark-${n}`]!, bg), `mark-${n} ${where}`).toBeGreaterThanOrEqual(3)
    }
  }, 30_000)
})

describe('what wins over the parameters', () => {
  test.each(DEFS.filter((x) => x.surfaces !== undefined).map((t) => t.id))('%s: a curated palette keeps its own backgrounds, the parameters change none of its tokens', (id) => {
    for (const scheme of ['light', 'dark'] as const) {
      const plain = tokensFor(def(id), scheme)
      for (const dark of RANGE) expect(tokensFor({ ...def(id), dark }, scheme), `${named(dark)} ${scheme}`).toEqual(plain)
    }
  }, 30_000)

  test('a colour theme has a curated palette too: the parameters change none of its tokens', () => {
    const two = colorTheme({ id: 'two', label: 'Two', color: '#246fe0', spot: 'balanced' })
    for (const dark of RANGE) expect(themeTokens({ ...two, dark }, 'dark', null, AS_CHOSEN), named(dark)).toEqual(themeTokens(two, 'dark', null, AS_CHOSEN))
  })

  test('the user\'s own page wins over the theme\'s; with the page left to the theme, their accent sits on the theme\'s dark', () => {
    const theme: ThemeDef = { ...def('notte'), dark: { depth: 'deep', tint: 'theme' } }
    for (const own of [{ accent: '#d6246e', background: 'match' }, { accent: '#058527', background: 'neutral' }, { accent: '#00857a', background: '#101820' }] as const) {
      for (const scheme of ['light', 'dark'] as const) expect(themeTokens(theme, scheme, own), `${JSON.stringify(own)} ${scheme}`).toEqual(themeTokens(def('notte'), scheme, own))
    }
    const mine = themeTokens(theme, 'dark', '#d6246e', AS_CHOSEN).colors
    const theirs = themeTokens(theme, 'dark', null, AS_CHOSEN).colors
    for (const name of ['paper', 'raised', 'line']) expect(mine[name], name).toBe(theirs[name])
    expect(mine['paper']).toBe('#12161d')
    expect(mine['primary']).not.toBe(theirs['primary'])
  })
})
