// The colours and the font of a terminal, made from the toolkit's tokens. xterm cannot take `var()`: it paints its text
// on a canvas or sets inline colours, so it needs concrete values. They are read from the element the terminal is in
// (`readColor`: the resolved token, whatever theme, scheme and tone the page wears) and put in xterm's `ITheme`: the
// ground, the ink, the cursor and the selection from the tokens of the page; the sixteen ANSI colours from the twelve
// steps of a tint (`hueScale`: the text step on the page, so every colour holds 4.5:1) and from the page's own grays
// for black and white. «Black» is the colour of the ground and «white» the ink, as the page has them, so a program that
// writes black on a coloured cell or white text stays readable in a light scheme as well as in a dark one.
import type { ITheme } from '@xterm/xterm'
import { hueScale, type HueName } from '../hues'
import { isDarkColor, readColor, readLength, readText, type Hex } from '../internal/look'
import { over, themeTokens, type ThemeScheme, type TonePreset } from '../theme-engine'
import { BASE_THEME } from '../themes'

/** The six colours of ANSI, each the tint it is drawn in. */
const ANSI_HUES = { red: 'red', green: 'green', yellow: 'amber', blue: 'blue', magenta: 'magenta', cyan: 'teal' } as const satisfies Record<string, HueName>

/**
 * The tokens a terminal reads, as the names of the colours of the theme engine (`--color-<name>`). A page that has not
 * loaded the theme (a bare test page) gets the engine's baseline in light.
 */
const TOKENS = {
  paper: 'paper',
  sunken: 'paper-2',
  ink: 'ink',
  soft: 'ink-soft',
  mute: 'ink-mute',
  accent: 'accent',
  accentSoft: 'accent-soft',
  selected: 'selected',
  selectedInk: 'selected-ink',
} as const satisfies Record<string, string>

const BASELINE = themeTokens(BASE_THEME, 'light').colors

/** The sixteen ANSI colours for a scheme: the six tints at their text step (the normal ones) and a step apart (the bright ones). */
export function ansiColors(scheme: ThemeScheme, tone: TonePreset, grays: { black: string; white: string; brightBlack: string; brightWhite: string }) {
  const pick = (hue: HueName) => {
    const steps = hueScale(hue, tone, scheme).steps
    // Step 11 is the text of a tint (4.5:1 on the page). Bright is the step beside it that the scheme can spare: in
    // dark the pale step 12, in light the livelier step 10.
    return { normal: steps[10]!, bright: scheme === 'dark' ? steps[11]! : steps[9]! }
  }
  const red = pick(ANSI_HUES.red)
  const green = pick(ANSI_HUES.green)
  const yellow = pick(ANSI_HUES.yellow)
  const blue = pick(ANSI_HUES.blue)
  const magenta = pick(ANSI_HUES.magenta)
  const cyan = pick(ANSI_HUES.cyan)
  return {
    black: grays.black, red: red.normal, green: green.normal, yellow: yellow.normal, blue: blue.normal, magenta: magenta.normal, cyan: cyan.normal, white: grays.white,
    brightBlack: grays.brightBlack, brightRed: red.bright, brightGreen: green.bright, brightYellow: yellow.bright, brightBlue: blue.bright, brightMagenta: magenta.bright, brightCyan: cyan.bright, brightWhite: grays.brightWhite,
  }
}

/** The families of CSS that are a kind of font and not a name: written bare, never in quotes. */
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong'])

/** The names of a list of font families (`"Cascadia Mono", Consolas, monospace`), without their quotes: split at the commas that are not inside a name in quotes. */
function familyNames(list: string): { name: string; quoted: boolean }[] {
  const names: { name: string; quoted: boolean }[] = []
  let name = ''
  let quote = ''
  let quoted = false
  const push = () => {
    // A control character (a new line) ends a string of CSS: it is a blank here, and blanks count once.
    // eslint-disable-next-line no-control-regex
    const clean = name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
    if (clean) names.push({ name: clean, quoted })
    name = ''
    quoted = false
  }
  for (let at = 0; at < list.length; at++) {
    const char = list[at]!
    if (quote) {
      if (char === '\\' && at + 1 < list.length) name += list[++at]
      else if (char === quote) quote = ''
      else name += char
    } else if ((char === '"' || char === "'") && !name.trim()) {
      quote = char
      quoted = true
    } else if (char === ',') push()
    else name += char
  }
  push()
  return names
}

/**
 * The font of a terminal: the families the app asked for first, then the monospace stack of the page, so a name the
 * machine does not have leaves the terminal with the toolkit's own font and never with a proportional one. xterm writes
 * the list into a stylesheet as it is, so it is written again here, safe whatever the names hold: every name in double
 * quotes with its own quotes and backslashes escaped (a name with spaces or digits, `3270 Nerd Font`, is one name), and
 * the kinds of font (`monospace`, `ui-monospace`) bare. Nothing asked for, or nothing left of it: the stack of the page as it is.
 */
export function terminalFontStack(family: string | undefined, mono: string): string {
  const asked = familyNames(family ?? '').map(({ name, quoted }) => (!quoted && GENERIC_FAMILIES.has(name.toLowerCase()) ? name.toLowerCase() : `"${name.replace(/[\\"]/g, '\\$&')}"`))
  return asked.length ? `${asked.join(', ')}, ${mono}` : mono
}

export interface TerminalLook {
  /** What xterm takes as its `theme`. */
  readonly theme: ITheme
  /** The scheme the page is in, read from its ground. */
  readonly scheme: ThemeScheme
  /** The font: the families asked for (`fontFamily`), if any, then the monospace stack of the page (`--font-mono`). */
  readonly fontFamily: string
  /** The size of code on the page (`--text-xs`, the 13px of `code-sm`), in pixels. */
  readonly fontSize: number
}

/**
 * The look of a terminal drawn inside `el`: its theme and its font, read from the tokens as they are now. `transparent`
 * leaves the ground clear, so what is behind the terminal (a glass window) shows through; `quietCursor` draws the cursor in the colour of the ground, for a terminal that takes no input;
 * `fontFamily` is a list of font families that goes before the monospace stack of the page (`terminalFontStack`).
 */
export function terminalLook(el: Element, options: { tone?: TonePreset | undefined; transparent?: boolean | undefined; quietCursor?: boolean | undefined; fontFamily?: string | undefined } = {}): TerminalLook {
  const c = Object.fromEntries(Object.entries(TOKENS).map(([key, name]) => [key, readColor(el, `--color-${name}`, BASELINE[name] as Hex)])) as Record<keyof typeof TOKENS, Hex>
  const ground = c.paper.slice(0, 7)
  const scheme: ThemeScheme = isDarkColor(ground) ? 'dark' : 'light'
  const slider = (share: number) => over(c.mute.slice(0, 7), ground, share)
  const theme: ITheme = {
    background: options.transparent ? `${ground}00` : c.paper,
    foreground: c.ink,
    cursor: options.quietCursor ? ground : c.accent,
    cursorAccent: c.paper,
    selectionBackground: c.selected,
    selectionForeground: c.selectedInk,
    selectionInactiveBackground: c.accentSoft,
    scrollbarSliderBackground: slider(0.3),
    scrollbarSliderHoverBackground: slider(0.5),
    scrollbarSliderActiveBackground: slider(0.7),
    overviewRulerBorder: c.paper,
    ...ansiColors(scheme, options.tone ?? 'vivid', { black: c.sunken, white: c.soft, brightBlack: c.mute, brightWhite: c.ink }),
  }
  return { theme, scheme, fontFamily: terminalFontStack(options.fontFamily, readText(el, '--font-mono', 'monospace')), fontSize: readLength(el, '--text-xs', 13) }
}
