/**
 * The eighteen free colors (for what the user colours: a folder, a group, a mark), in hue order (from red to pink). They are medium tints: the color is
 * user data, the same in both themes, so it holds up on both the light and the dark paper. An app that keeps the list
 * elsewhere too (on its server) keeps the same hex values there. A color that is already saved never falls out of the list.
 */
export const COLORS = [
  '#e34432',
  '#ee6449',
  '#e8772e',
  '#a0714a',
  '#f5a623',
  '#9bb53a',
  '#78a271',
  '#2f9e6e',
  '#6b9fa0',
  '#1fa3b4',
  '#297abc',
  '#6b7a8f',
  '#4452c4',
  '#7b68ee',
  '#a35fd0',
  '#c64fb5',
  '#e5659a',
  '#b83a58',
] as const

/** The name of each color, for those who cannot see it: it is the picker's accessible name (never the hex value). */
export const COLOR_NAMES: Readonly<Record<(typeof COLORS)[number], string>> = {
  '#e34432': 'Red',
  '#ee6449': 'Coral',
  '#e8772e': 'Orange',
  '#a0714a': 'Brown',
  '#f5a623': 'Amber',
  '#9bb53a': 'Lime',
  '#78a271': 'Green',
  '#2f9e6e': 'Emerald',
  '#6b9fa0': 'Teal',
  '#1fa3b4': 'Turquoise',
  '#297abc': 'Blue',
  '#6b7a8f': 'Slate',
  '#4452c4': 'Indigo',
  '#7b68ee': 'Violet',
  '#a35fd0': 'Orchid',
  '#c64fb5': 'Magenta',
  '#e5659a': 'Pink',
  '#b83a58': 'Burgundy',
}

const COLOR_INDEX: Readonly<Record<string, number>> = Object.fromEntries(COLORS.map((c, i) => [c, i + 1]))

/** Position `1..18` in the `COLORS` palette if `color` is one of the eighteen hex values, otherwise `null`. */
export function colorHue(color: string | null | undefined): number | null {
  if (typeof color !== 'string') return null
  return COLOR_INDEX[color.toLowerCase()] ?? null
}

/** The attribute that links a palette color to the theme's adaptive `--color-mark-N` and `--color-mark-icon-N` tokens. */
export function markHueAttrs(color: string | null | undefined): { 'data-mark-hue'?: string } {
  const h = colorHue(color)
  return h === null ? {} : { 'data-mark-hue': String(h) }
}
