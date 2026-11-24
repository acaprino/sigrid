// A curated palette that asks for the four theme hooks, as an app's shell would pass it: blue-slate surfaces, a stated
// control border (`Surfaces.input`), boxed keys, strong control borders, and one accent hue for each app. Test data
// only: the toolkit ships no themes. It is the preset the hooks were approved for (the owner, 2026-11-24), so the
// contrast of its pairs is measured here by the engine, not by hand (test/theme-hooks.test.tsx).
import type { ThemeDef } from '../../src/theme-catalog'
import type { ThemeTone } from '../../src/theme-engine'

/** The accent of each app: its hue, and the accent as written for the dark and the light scheme. */
export const SHELL_ACCENTS = [
  { id: 'hue-235', hue: 235, dark: '#6ed0ff', light: '#006398' },
  { id: 'hue-75', hue: 75, dark: '#f2b966', light: '#844c00' },
  { id: 'hue-170', hue: 170, dark: '#68ddb8', light: '#00714f' },
  { id: 'hue-355', hue: 355, dark: '#ffa3c8', light: '#90355e' },
  { id: 'hue-300', hue: 300, dark: '#d0b2ff', light: '#674698' },
] as const

/** The control borders the preset states. */
export const SHELL_INPUT = { dark: '#8791a6', light: '#767e8b' } as const

/** The preset passes the Balanced tone: its accents are the colours as written. */
export const SHELL_TONE: ThemeTone = { intensity: 'theme', light: 'theme' }

/** The preset for one accent. `stated: false` leaves the control border to the engine, as before the hook. */
export function shellPreset(accent: (typeof SHELL_ACCENTS)[number], stated = true): ThemeDef {
  return {
    id: accent.id, label: accent.id, hue: 80, chroma: 0, accent: [0.12, accent.hue], sidebar: 'tenue', palette: 'crisp',
    shape: 'soft',
    radii: { sm: 4, md: 6, lg: 10, xl: 10, chip: 4 },
    keys: 'boxed',
    controls: 'strong',
    tabs: 'bold',
    statusStrip: 'tall',
    surfaces: {
      dark: { paper: '#1a202c', sidebar: '#12161e', raised: '#232834', line: '#2a3240', ink: '#e8ecf3', accent: accent.dark, fill: accent.dark, ...(stated ? { input: SHELL_INPUT.dark } : {}) },
      light: { paper: '#ffffff', sidebar: '#f6f7f9', raised: '#ffffff', line: '#e3e6ea', ink: '#111827', accent: accent.light, fill: accent.light, ...(stated ? { input: SHELL_INPUT.light } : {}) },
    },
  }
}
