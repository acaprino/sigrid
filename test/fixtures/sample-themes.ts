// A varied set of theme definitions to exercise the engine: calm themes, strong accents, two colours, solid sidebars
// and curated palettes. Test data only: the toolkit ships no themes, each app passes its own.
import type { Surfaces, ThemeDef } from '../../src/theme-catalog'
import { themeTokens as tokensOfDef } from '../../src/theme-engine'
import type { OwnTheme, ThemeScheme, ThemeTokens, ThemeTone } from '../../src/theme-engine'

const S = (paper: string, sidebar: string, raised: string, line: string, ink: string, accent: string, fill: string): Surfaces => ({ paper, sidebar, raised, line, ink, accent, fill })

export const THEMES = [
  { id: 'neutro', label: 'Neutral', hue: 85, chroma: 0.0025, accent: [0.09, 190], sidebar: 'tenue', palette: 'crisp' },
  { id: 'inchiostro', label: 'Ink', hue: 0, chroma: 0, accent: [0, 0], sidebar: 'tenue', palette: 'mono' },
  { id: 'professionale', label: 'Professional blue', hue: 255, chroma: 0.011, accent: [0.16, 258], sidebar: 'tenue', palette: 'crisp' },
  { id: 'ardesia', label: 'Slate', hue: 235, chroma: 0.012, accent: [0.1, 228], sidebar: 'tenue', palette: 'crisp' },
  { id: 'grafite', label: 'Graphite and indigo', hue: 270, chroma: 0.011, accent: [0.14, 275], sidebar: 'tenue', palette: 'crisp' },
  { id: 'notte', label: 'Night and amber', hue: 258, chroma: 0.011, accent: [0.125, 62], sidebar: 'tenue', palette: 'crisp' },
  { id: 'petrolio', label: 'Petrol', hue: 186, chroma: 0.013, accent: [0.115, 182], sidebar: 'tenue', palette: 'crisp' },
  { id: 'mare', label: 'Sea', hue: 215, chroma: 0.012, accent: [0.115, 212], sidebar: 'tenue', palette: 'crisp' },
  { id: 'salvia', label: 'Sage', hue: 148, chroma: 0.012, accent: [0.085, 150], sidebar: 'tenue', palette: 'calm' },
  { id: 'bosco', label: 'Forest', hue: 154, chroma: 0.013, accent: [0.11, 154], sidebar: 'tenue', palette: 'calm' },
  { id: 'oliva', label: 'Olive and stone', hue: 118, chroma: 0.013, accent: [0.09, 125], sidebar: 'tenue', palette: 'calm' },
  { id: 'sabbia', label: 'Sand and cobalt', hue: 82, chroma: 0.013, accent: [0.16, 260], sidebar: 'tenue', palette: 'calm' },
  { id: 'seppia', label: 'Sepia and coffee', hue: 64, chroma: 0.013, accent: [0.095, 54], sidebar: 'tenue', palette: 'calm' },
  { id: 'ambra', label: 'Amber', hue: 78, chroma: 0.013, accent: [0.115, 66], sidebar: 'tenue', palette: 'calm' },
  { id: 'terracotta', label: 'Terracotta', hue: 48, chroma: 0.012, accent: [0.115, 48], sidebar: 'tenue', palette: 'calm' },
  { id: 'lavanda', label: 'Lavender', hue: 292, chroma: 0.012, accent: [0.145, 290], sidebar: 'tenue', palette: 'soft' },
  { id: 'elettrico', label: 'Electric blue', hue: 258, chroma: 0.008, accent: [0.22, 262], sidebar: 'tenue', palette: 'crisp', fill: [0.55, 0.23] },
  { id: 'fucsia', label: 'Fuchsia', hue: 345, chroma: 0.008, accent: [0.22, 352], sidebar: 'tenue', palette: 'crisp', fill: [0.58, 0.24] },
  { id: 'ultravioletto', label: 'Ultraviolet', hue: 295, chroma: 0.012, accent: [0.23, 298], sidebar: 'piena', palette: 'crisp', fill: [0.55, 0.25] },
  { id: 'arancio', label: 'Signal orange', hue: 60, chroma: 0.008, accent: [0.19, 45], sidebar: 'tenue', palette: 'crisp', fill: [0.68, 0.2] },
  { id: 'smeraldo', label: 'Emerald', hue: 160, chroma: 0.008, accent: [0.17, 155], sidebar: 'tenue', palette: 'crisp', fill: [0.66, 0.19] },
  { id: 'segnale', label: 'Ink and signal', hue: 250, chroma: 0.008, accent: [0.19, 45], sidebar: 'piena', palette: 'crisp', fill: [0.68, 0.2] },
  { id: 'ottanio', label: 'Teal and orange', hue: 188, chroma: 0.014, accent: [0.19, 45], sidebar: 'tenue', palette: 'crisp', fill: [0.68, 0.2], second: [0.1, 188] },
  { id: 'glicine', label: 'Wisteria and green', hue: 295, chroma: 0.013, accent: [0.17, 158], sidebar: 'tenue', palette: 'soft', fill: [0.66, 0.19], second: [0.15, 295] },
  { id: 'diario', label: 'Journal and violet', hue: 72, chroma: 0.014, accent: [0.22, 288], sidebar: 'tenue', palette: 'calm', fill: [0.55, 0.23], second: [0.07, 62] },
  { id: 'blasone', label: 'Navy and gold', hue: 258, chroma: 0.012, accent: [0.14, 82], sidebar: 'piena', palette: 'crisp', fill: [0.7, 0.15], second: [0.1, 258] },
  { id: 'nord', label: 'Nord', hue: 255, chroma: 0.012, accent: [0.07, 230], sidebar: 'tenue', palette: 'soft', surfaces: {
    light: S('#f2f4f8', '#e9ecf2', '#ffffff', '#d8dee9', '#2e3440', '#5e81ac', '#5e81ac'),
    dark: S('#2e3440', '#272c36', '#373e4c', '#434c5e', '#eceff4', '#88c0d0', '#88c0d0') } },
  { id: 'rosepine', label: 'Rosé Pine', hue: 290, chroma: 0.012, accent: [0.1, 5], sidebar: 'tenue', palette: 'soft', surfaces: {
    light: S('#faf4ed', '#f2e9e1', '#fffaf3', '#dfdad9', '#575279', '#286983', '#b4637a'),
    dark: S('#1f1d2e', '#191724', '#2a273f', '#403d52', '#e0def4', '#ebbcba', '#eb6f92') } },
  { id: 'catppuccin', label: 'Catppuccin', hue: 270, chroma: 0.012, accent: [0.2, 300], sidebar: 'tenue', palette: 'soft', surfaces: {
    light: S('#f1f3f8', '#e8ebf2', '#ffffff', '#ccd0da', '#4c4f69', '#8839ef', '#8839ef'),
    dark: S('#1e1e2e', '#181825', '#313244', '#45475a', '#cdd6f4', '#cba6f7', '#cba6f7') } },
  { id: 'gruvbox', label: 'Gruvbox', hue: 85, chroma: 0.014, accent: [0.15, 55], sidebar: 'tenue', palette: 'calm', surfaces: {
    light: S('#f9f5d7', '#f2e5bc', '#fefae6', '#d5c4a1', '#3c3836', '#af3a03', '#af3a03'),
    dark: S('#282828', '#1d2021', '#3c3836', '#504945', '#ebdbb2', '#fabd2f', '#fe8019') } },
  { id: 'solarized', label: 'Solarized', hue: 200, chroma: 0.014, accent: [0.13, 235], sidebar: 'tenue', palette: 'calm', surfaces: {
    light: S('#fdf6e3', '#eee8d5', '#fffcf2', '#ddd6c1', '#073642', '#268bd2', '#cb4b16'),
    dark: S('#002b36', '#00212b', '#073642', '#174652', '#eee8d5', '#2aa198', '#b58900') } },
  { id: 'tokyonight', label: 'Tokyo Night', hue: 275, chroma: 0.012, accent: [0.13, 265], sidebar: 'tenue', palette: 'crisp', surfaces: {
    light: S('#f1f2f8', '#e5e6ee', '#fbfbfd', '#c9cbd6', '#343b58', '#34548a', '#34548a'),
    dark: S('#1a1b26', '#16161e', '#24283b', '#343a52', '#c0caf5', '#7aa2f7', '#7aa2f7') } },
  { id: 'everforest', label: 'Everforest', hue: 130, chroma: 0.012, accent: [0.1, 130], sidebar: 'tenue', palette: 'calm', surfaces: {
    light: S('#fdf6e3', '#efebd4', '#fffbef', '#e0dcc7', '#4b565c', '#35a77c', '#8da101'),
    dark: S('#2d353b', '#232a2e', '#374145', '#4f585e', '#d3c6aa', '#a7c080', '#a7c080') } },
  { id: 'dracula', label: 'Dracula', hue: 265, chroma: 0.012, accent: [0.15, 300], sidebar: 'tenue', palette: 'crisp', surfaces: {
    light: S('#fffbeb', '#f4efdc', '#ffffff', '#e2dcc6', '#1f1f1f', '#644ac9', '#a3144d'),
    dark: S('#282a36', '#21222c', '#343746', '#44475a', '#f8f8f2', '#bd93f9', '#ff79c6') } },
] as const satisfies readonly ThemeDef[]

export type ThemeId = (typeof THEMES)[number]['id']

/** The theme before any choice (the default), in light and in dark. */
export const DEFAULT_THEME: ThemeId = 'neutro'

/** A sample definition by id. */
export function sampleTheme(id: string): ThemeDef {
  const t = (THEMES as readonly ThemeDef[]).find((x) => x.id === id)
  if (!t) throw new Error(`no sample theme: ${id}`)
  return t
}

/** The tokens of a sample theme, by id: the engine takes the definition. */
export function themeTokens(id: ThemeId, scheme: ThemeScheme, own?: OwnTheme | string | null, tone?: ThemeTone | null): ThemeTokens {
  return tokensOfDef(sampleTheme(id), scheme, own, tone)
}
