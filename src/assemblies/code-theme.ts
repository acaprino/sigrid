// The colours of a code view, made from the toolkit's tokens, as a CodeMirror theme. A CodeMirror theme is a set of
// style rules, and the highlighting of the syntax is another (`HighlightStyle`): both are built here from the colours
// the tokens resolve to where the view is (`readColor`), and built again when the page's look changes (the view
// reconfigures its theme compartment with the new extension). The ink, the ground, the lines, the selection and the
// accent are the page's own; the syntax uses the status colours the page already has: info for keywords, success for
// strings, warning for numbers, destructive for what is wrong; comments and punctuation are the muted ink.
// The font and the size are the page's too (`--font-mono`, `--text-xs`), written as the variables, so a font or a
// density change moves the code with everything else; the room around the text is the page's (`--pad-sm`).
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { isDarkColor, readColor, type Hex } from '../internal/look'
import { over, themeTokens } from '../theme-engine'
import { BASE_THEME } from '../themes'

/** The tokens a code view reads, as the names of the colours of the theme engine (`--color-<name>`). */
const TOKENS = {
  paper: 'paper',
  sunken: 'paper-2',
  raised: 'raised',
  ink: 'ink',
  soft: 'ink-soft',
  mute: 'ink-mute',
  line: 'line',
  accent: 'accent',
  selected: 'selected',
  info: 'info',
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
} as const satisfies Record<string, string>

/** What the tokens are when the page has not loaded the theme (a bare test page): the engine's baseline in light. */
const BASELINE = themeTokens(BASE_THEME, 'light').colors

/** The colours a code view is drawn in, resolved, as `#rrggbb`. */
export type CodeColors = { readonly [Name in keyof typeof TOKENS]: Hex } & { readonly dark: boolean; readonly type: Hex; readonly activeLine: Hex; readonly match: Hex; readonly matchChosen: Hex; readonly selectionMatch: Hex }

/** The colours of the tokens as they resolve where `el` is. */
export function codeColors(el: Element): CodeColors {
  const c = Object.fromEntries(Object.entries(TOKENS).map(([key, name]) => [key, readColor(el, `--color-${name}`, BASELINE[name] as Hex)])) as Record<keyof typeof TOKENS, Hex>
  const ground = c.paper.slice(0, 7)
  const blend = (color: Hex, share: number): Hex => over(color.slice(0, 7), ground, share) as Hex
  return {
    ...c,
    dark: isDarkColor(ground),
    // Types sit between a keyword and a string.
    type: over(c.info.slice(0, 7), c.success.slice(0, 7), 0.55) as Hex,
    activeLine: c.sunken,
    match: blend(c.warning, 0.22),
    matchChosen: blend(c.accent, 0.3),
    selectionMatch: blend(c.info, 0.14),
  }
}

/** The highlighting of the syntax in these colours. */
export function codeHighlight(c: CodeColors): Extension {
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier, t.definitionKeyword, t.moduleKeyword], color: c.info },
      { tag: [t.string, t.special(t.string), t.regexp, t.character], color: c.success },
      { tag: [t.number, t.bool, t.null, t.atom, t.unit], color: c.warning },
      { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: c.mute, fontStyle: 'italic' },
      { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: c.accent },
      { tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName)], color: c.type },
      { tag: [t.propertyName, t.attributeName], color: c.soft },
      { tag: [t.tagName, t.angleBracket], color: c.accent },
      { tag: [t.macroName, t.annotation, t.meta, t.processingInstruction], color: c.warning },
      { tag: [t.punctuation, t.separator, t.bracket, t.operator], color: c.mute },
      { tag: [t.heading, t.strong], color: c.ink, fontWeight: '600' },
      { tag: t.emphasis, fontStyle: 'italic' },
      { tag: [t.link, t.url], color: c.info, textDecoration: 'underline' },
      { tag: [t.inserted], color: c.success },
      { tag: [t.deleted], color: c.destructive },
      { tag: t.invalid, color: c.destructive },
    ]),
  )
}

/** The look of the editor itself: the ground, the ink, the gutter, the lines, the selection, the panels. */
export function codeEditorTheme(c: CodeColors): Extension {
  return EditorView.theme(
    {
      '&': { height: '100%', color: c.ink, backgroundColor: c.paper, fontSize: 'var(--text-xs)' },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6', overflow: 'auto' },
      '.cm-content': { caretColor: c.accent, padding: 'var(--pad-sm) 0' },
      '.cm-line': { padding: '0 var(--pad-md) 0 var(--pad-sm)' },
      '.cm-gutters': { backgroundColor: c.paper, color: c.mute, border: 'none', borderRight: `1px solid ${c.line}` },
      '.cm-lineNumbers .cm-gutterElement': { padding: '0 var(--pad-sm) 0 var(--pad-md)', minWidth: '4ch', fontVariantNumeric: 'tabular-nums' },
      '.cm-activeLine': { backgroundColor: c.activeLine },
      '.cm-activeLineGutter': { backgroundColor: c.activeLine, color: c.soft },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: c.accent },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: c.selected },
      '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': { backgroundColor: 'transparent', outline: `1px solid ${c.mute}` },
      '.cm-selectionMatch': { backgroundColor: c.selectionMatch },
      '.cm-searchMatch': { backgroundColor: c.match, outline: `1px solid ${c.warning}` },
      '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: c.matchChosen },
      '.cm-foldPlaceholder': { backgroundColor: 'transparent', border: `1px solid ${c.line}`, color: c.soft, padding: '0 var(--pad-xs)' },
      '.cm-foldGutter .cm-gutterElement': { padding: '0 var(--pad-xs)', color: c.mute },
      '.cm-panels': { backgroundColor: c.raised, color: c.ink },
      '.cm-panels.cm-panels-top': { borderBottom: `1px solid ${c.line}` },
      '.cm-panels.cm-panels-bottom': { borderTop: `1px solid ${c.line}` },
      '.cm-panel input, .cm-panel button': { font: 'inherit' },
      '.cm-tooltip': { backgroundColor: c.raised, color: c.ink, border: `1px solid ${c.line}` },
    },
    { dark: c.dark },
  )
}

/** The whole theme of a code view drawn inside `el`, from the tokens as they are now. */
export function codeTheme(el: Element): Extension {
  const colors = codeColors(el)
  return [codeEditorTheme(colors), codeHighlight(colors)]
}
