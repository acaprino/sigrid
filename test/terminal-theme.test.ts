// The colours and the font of a terminal from the toolkit's tokens (src/assemblies/terminal-theme.ts): xterm cannot take
// `var()`, so the tokens are read where the terminal is and put in its theme. Here: each role takes its token, the
// ANSI colours are the steps of the tints in the scheme the ground says, the page's gray makes black and white, a theme
// of the engine in either scheme gives a readable terminal, and no source of the two entries writes a colour.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { hueScale } from '../src/hues'
import { contrast, themeTokens } from '../src/theme-engine'
import { BASE_THEME, applyTheme } from '../src/themes'
import { ansiColors, terminalLook } from '../src/assemblies/terminal-theme'
import { root, walk } from './helpers'
import { THEMES } from './fixtures/sample-themes'

const html = document.documentElement
afterEach(() => {
  html.removeAttribute('style')
  for (const name of [...html.getAttributeNames()]) if (name.startsWith('data-')) html.removeAttribute(name)
})

const TOKENS: Record<string, string> = {
  paper: '#14181c', 'paper-2': '#0c0e10', ink: '#e6eaee', 'ink-soft': '#b4bcc4', 'ink-mute': '#8a949e', accent: '#e0a030',
  'accent-soft': '#2a2418', selected: '#26323e', 'selected-ink': '#f4f8fc',
}
const paint = (tokens: Record<string, string> = TOKENS) => { for (const [name, value] of Object.entries(tokens)) html.style.setProperty(`--color-${name}`, value) }

describe('terminalLook: the theme of xterm from the tokens', () => {
  test('the ground, the ink, the cursor and the selection are the page\'s own', () => {
    paint()
    const { theme } = terminalLook(html)
    expect(theme).toMatchObject({
      background: TOKENS['paper'], foreground: TOKENS['ink'], cursor: TOKENS['accent'], cursorAccent: TOKENS['paper'],
      selectionBackground: TOKENS['selected'], selectionForeground: TOKENS['selected-ink'], selectionInactiveBackground: TOKENS['accent-soft'],
    })
  })

  test('black is the sunken ground, white the soft ink, bright white the ink, bright black the muted ink', () => {
    paint()
    const { theme } = terminalLook(html)
    expect(theme).toMatchObject({ black: TOKENS['paper-2'], white: TOKENS['ink-soft'], brightWhite: TOKENS['ink'], brightBlack: TOKENS['ink-mute'] })
  })

  test('the scheme is read from the ground: a dark ground is the dark scale of the tints', () => {
    paint()
    const look = terminalLook(html)
    expect(look.scheme).toBe('dark')
    // The text step of each tint, and the pale step beside it for bright.
    expect(look.theme.red).toBe(hueScale('red', 'vivid', 'dark').steps[10])
    expect(look.theme.brightRed).toBe(hueScale('red', 'vivid', 'dark').steps[11])
    expect(look.theme.yellow).toBe(hueScale('amber', 'vivid', 'dark').steps[10])
    expect(look.theme.cyan).toBe(hueScale('teal', 'vivid', 'dark').steps[10])
    expect(look.theme.magenta).toBe(hueScale('magenta', 'vivid', 'dark').steps[10])
  })

  test('a light ground is the light scale, and bright is the livelier step', () => {
    paint({ ...TOKENS, paper: '#fafcfc', 'paper-2': '#eeeeee', ink: '#161616', 'ink-soft': '#3d3d3d', 'ink-mute': '#626262' })
    const look = terminalLook(html)
    expect(look.scheme).toBe('light')
    expect(look.theme.green).toBe(hueScale('green', 'vivid', 'light').steps[10])
    expect(look.theme.brightGreen).toBe(hueScale('green', 'vivid', 'light').steps[9])
    expect(look.theme.blue).toBe(hueScale('blue', 'vivid', 'light').steps[10])
  })

  test('the tone moves the six colours', () => {
    paint()
    expect(terminalLook(html, { tone: 'calm' }).theme.red).toBe(hueScale('red', 'calm', 'dark').steps[10])
    expect(terminalLook(html, { tone: 'calm' }).theme.red).not.toBe(terminalLook(html, { tone: 'vivid' }).theme.red)
  })

  test('a clear ground keeps its colour and loses its opacity; a quiet cursor is the colour of the ground', () => {
    paint()
    const { theme } = terminalLook(html, { transparent: true, quietCursor: true })
    expect(theme.background).toBe(`${TOKENS['paper']}00`)
    expect(theme.cursor).toBe(TOKENS['paper'])
  })

  test('a page with no theme gets the engine\'s baseline in light, not a colour written here', () => {
    const base = themeTokens(BASE_THEME, 'light').colors
    const look = terminalLook(html)
    expect(look.theme).toMatchObject({ background: base['paper'], foreground: base['ink'], black: base['paper-2'] })
    expect(look.scheme).toBe('light')
  })

  test('the font is the page\'s monospace stack and the size its code size', () => {
    html.style.setProperty('--font-mono', '"Cascadia Mono", monospace')
    html.style.setProperty('--text-xs', '0.875rem')
    const look = terminalLook(html)
    expect(look.fontFamily).toBe('"Cascadia Mono", monospace')
    expect(look.fontSize).toBe(14)
    html.removeAttribute('style')
    expect(terminalLook(html)).toMatchObject({ fontFamily: 'monospace', fontSize: 13 })
  })

  test('the scrollbar is the muted ink over the ground, more or less of it', () => {
    paint()
    const { theme } = terminalLook(html)
    expect(theme.scrollbarSliderBackground).toMatch(/^#[0-9a-f]{6}$/)
    expect(new Set([theme.scrollbarSliderBackground, theme.scrollbarSliderHoverBackground, theme.scrollbarSliderActiveBackground]).size).toBe(3)
  })
})

describe('a theme of the engine, in both schemes, written on the root: the terminal is read from it', () => {
  test.each(THEMES.flatMap((theme) => (['light', 'dark'] as const).map((scheme) => [theme.id, theme, scheme] as const)))('%s, %s: the text holds 4.5:1 on the ground, the ANSI colours 3:1', (_id, theme, scheme) => {
    applyTheme(html, { theme, scheme })
    const { theme: x, scheme: read } = terminalLook(html)
    expect(read).toBe(scheme)
    const ground = x.background!
    expect(contrast(x.foreground!, ground)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(x.selectionForeground!, x.selectionBackground!)).toBeGreaterThanOrEqual(4.5)
    for (const name of ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightBlack', 'white'] as const) {
      expect(contrast(x[name]!, ground), `${name} on the ground`).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('ansiColors', () => {
  test('is sixteen colours, each a hex', () => {
    const colors = ansiColors('dark', 'balanced', { black: '#000000', white: '#cccccc', brightBlack: '#555555', brightWhite: '#ffffff' })
    expect(Object.keys(colors)).toHaveLength(16)
    for (const value of Object.values(colors)) expect(value).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('no colour is written in the sources of the terminal and the code view: they are read from the tokens', () => {
  const SOURCES = [
    'src/assemblies/Terminal.tsx', 'src/assemblies/terminal-theme.ts', 'src/assemblies/terminal-links.ts', 'src/assemblies/OverviewStrip.tsx',
    'src/assemblies/CodeView.tsx', 'src/assemblies/code-theme.ts', 'src/assemblies/code-languages.ts', 'src/internal/look.ts', 'src/terminal.ts', 'src/code.ts',
  ]
  const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

  test('no hex, no colour function, no white or black in a string', () => {
    expect(walk(join(root, 'src')).map((f) => f.slice(root.length)).filter((f) => SOURCES.includes(f)).sort()).toEqual([...SOURCES].sort())
    for (const file of SOURCES) {
      const text = code(readFileSync(join(root, file), 'utf8'))
      // The patterns that read a hex are regular expressions, not colours: they have no `#` followed by a literal run of digits.
      expect(text, file).not.toMatch(/['"`]#[0-9a-fA-F]{3,8}\b/)
      expect(text, file).not.toMatch(/\b(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color-mix)\(/)
      // The names of the tints (`red`, `amber`) are the engine's hue names, not CSS colours.
      expect(text, file).not.toMatch(/['"`](?:white|black|gray|grey)['"`]/)
    }
  })
})
