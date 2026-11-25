// A theme in a scheme and a font on the root: `applyTheme` and `applyFont` set the variables and the attributes,
// `copyTheme` carries them to another root (separate windows). The colors themselves are tested by test/theme-engine.test.ts.
import { describe, expect, test } from 'vitest'
import { DENSITY_VARIABLES } from '../src/density'
import { DEFAULT_FONT } from '../src/theme-catalog'
import { BASE_THEME, FONT_VARIABLE, THEME_ATTRIBUTES, THEME_VARIABLES, applyFont, applyTheme, copyTheme, fontById, isFontId, themeVariables } from '../src/themes'
import { sampleTheme, themeTokens } from './fixtures/sample-themes'
import { themeCss } from './theme-tokens'

const createDocument = () => {
  const doc = document.implementation.createHTMLDocument('t')
  const meta = doc.createElement('meta')
  meta.name = 'theme-color'
  doc.head.append(meta)
  return { doc, el: doc.documentElement, meta }
}

describe('the choices', () => {
  test('the toolkit ships no themes: its baseline is a plain gray with no accent', () => {
    expect(BASE_THEME).toMatchObject({ chroma: 0, accent: [0, 0], palette: 'mono' })
  })

  test('the fonts accept only the catalog', () => {
    expect(isFontId('lexend')).toBe(true)
    expect(isFontId('comic-sans')).toBe(false)
    expect(isFontId(undefined)).toBe(false)
  })

  test('theme.css has no per-theme blocks, nor a separate accent or palette choice', () => {
    expect(themeCss).not.toContain('[data-theme=')
    expect(themeCss).not.toContain('data-accent')
    expect(themeCss).not.toContain('data-palette')
  })
})

describe('applyTheme', () => {
  test('puts the computed variables, the attributes and the paper in the browser bar on the root', () => {
    const { el, meta } = createDocument()
    applyTheme(el, { theme: sampleTheme('grafite'), scheme: 'dark' })
    const t = themeTokens('grafite', 'dark')
    expect(el.style.getPropertyValue('--color-paper')).toBe(t.colors['paper'])
    expect(el.style.getPropertyValue('--color-primary')).toBe(t.colors['primary'])
    expect(el.style.getPropertyValue('--radius-md')).toBe(t.shape['--radius-md'])
    expect(el.getAttribute('data-theme')).toBe('grafite')
    expect(el.getAttribute('data-scheme')).toBe('dark')
    expect(el.getAttribute('data-sidebar')).toBe('shared')
    expect(el.hasAttribute('data-rows')).toBe(false)
    expect(el.hasAttribute('data-selection')).toBe(false)
    expect(el.style.getPropertyValue('--elevation-md')).toBe(t.shape['--elevation-md'])
    expect(meta.content).toBe(t.colors['paper'])
  })

  test('on any element (a thumbnail) it does not touch the browser bar', () => {
    const { doc, meta } = createDocument()
    meta.content = 'before'
    const mini = doc.createElement('span')
    doc.body.append(mini)
    applyTheme(mini, { theme: sampleTheme('salvia'), scheme: 'light' })
    expect(mini.getAttribute('data-theme')).toBe('salvia')
    expect(mini.getAttribute('data-sidebar')).toBe('shared')
    expect(meta.content).toBe('before')
  })

  test('always writes the same variables, whatever the theme and the scheme', () => {
    for (const pick of [{ theme: BASE_THEME, scheme: 'light' }, { theme: BASE_THEME, scheme: 'dark' }, { theme: sampleTheme('notte'), scheme: 'dark' }, { theme: sampleTheme('inchiostro'), scheme: 'light' }] as const) {
      // The ground of a glass page is the one variable only a theme that asks for it writes (test/glass.test.ts).
      expect([...Object.keys(themeVariables(pick)), '--glass-ground', FONT_VARIABLE, ...DENSITY_VARIABLES].sort()).toEqual([...THEME_VARIABLES].sort())
    }
  })
})

describe('applyFont', () => {
  test('a chosen font goes in --font-sans and in data-font; IBM Plex Sans, the default, removes them', () => {
    const { el } = createDocument()
    applyFont(el, 'lexend')
    expect(el.style.getPropertyValue(FONT_VARIABLE)).toBe(fontById('lexend').stack)
    expect(el.getAttribute('data-font')).toBe('lexend')
    applyFont(el, 'plex')
    expect(el.style.getPropertyValue(FONT_VARIABLE)).toBe('')
    expect(el.hasAttribute('data-font')).toBe(false)
    // Inter is now a choice like the others.
    applyFont(el, 'inter')
    expect(el.style.getPropertyValue(FONT_VARIABLE)).toBe(fontById('inter').stack)
    expect(el.getAttribute('data-font')).toBe('inter')
  })

  test('the font of the first paint (@theme) is the stack of the default font', () => {
    expect(themeCss).toContain(`${FONT_VARIABLE}: ${fontById(DEFAULT_FONT).stack};`)
  })

  test('applyTheme does not touch the font, and the font does not touch the theme', () => {
    const { el } = createDocument()
    applyFont(el, 'serif')
    applyTheme(el, { theme: sampleTheme('mare'), scheme: 'light' })
    expect(el.getAttribute('data-font')).toBe('serif')
    applyFont(el, 'mono')
    expect(el.getAttribute('data-theme')).toBe('mare')
  })
})

describe('copyTheme', () => {
  test('carries attributes and variables (the font too) to another root, and removes the ones the source does not have', () => {
    const a = createDocument().el
    const b = createDocument().el
    applyTheme(a, { theme: sampleTheme('oliva'), scheme: 'dark' })
    applyFont(a, 'atkinson')
    b.setAttribute('data-checks', 'round')
    b.style.setProperty(FONT_VARIABLE, 'Georgia')
    copyTheme(a, b)
    for (const name of THEME_ATTRIBUTES) expect(b.getAttribute(name), name).toBe(a.getAttribute(name))
    for (const name of THEME_VARIABLES) expect(b.style.getPropertyValue(name), name).toBe(a.style.getPropertyValue(name))
    applyFont(a, DEFAULT_FONT)
    copyTheme(a, b)
    expect(b.hasAttribute('data-font')).toBe(false)
    expect(b.style.getPropertyValue(FONT_VARIABLE)).toBe('')
  })
})

// A tone is offered only where it shows.
import { toneHasEffect as toneShows } from '../src'
import { paletteTheme as paletteOf, COLORS as SEED_COLORS, PALETTE_COMBOS as COMBOS, BASE_THEME as GRAY } from '../src'
test('the tone changes nothing on the gray baseline and something on every theme with a hue', () => {
  for (const scheme of ['light', 'dark'] as const) {
    expect(toneShows({ theme: GRAY, scheme })).toBe(false)
    for (const combo of COMBOS) expect(toneShows({ theme: paletteOf({ seed: SEED_COLORS[1]!, combo }), scheme }), `${combo} ${scheme}`).toBe(true)
  }
})
