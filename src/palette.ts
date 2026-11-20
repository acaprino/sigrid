// Palettes from one base colour (owner, 2026-11-20: "selezionando un colore di base deve in automatico creare una
// palette complementare + accento, e far scegliere solo tra 3 combinazioni"). Material Color Utilities finds the hues
// that go with the colour (its complement by temperature, its tertiary); the theme engine then builds the theme from
// them, so every contrast threshold holds as for the catalogue's themes. Two mood colours set the theme, the accent
// makes it the user's.
import { Hct, SchemeTonalSpot, TemperatureCache, argbFromHex, hexFromArgb } from '@material/material-color-utilities'
import type { ThemeDef } from './theme-catalog'
import { fromHex, isAccentColor } from './theme-engine'

/**
 * The three combinations, in the order Settings shows them: `clean` a light page with the bar and the accents in the
 * colour; `bold` a solid bar in the colour and the complement as the accent; `soft` the selection in the colour and
 * the tertiary as the accent.
 */
export const PALETTE_COMBOS = ['clean', 'bold', 'soft'] as const
export type PaletteCombo = (typeof PALETTE_COMBOS)[number]

/** The user's palette: one base colour (`#rrggbb`) and how the rest follows from it. */
export interface PalettePick {
  readonly seed: string
  readonly combo: PaletteCombo
}

/** A palette read from anywhere (a saved value): only a real colour and a real combination pass. */
export function palettePick(value: unknown): PalettePick | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (!isAccentColor(v['seed']) || !(PALETTE_COMBOS as readonly unknown[]).includes(v['combo'])) return null
  return { seed: v['seed'].toLowerCase(), combo: v['combo'] as PaletteCombo }
}

/** Below this the base colour reads as a gray: the accent still needs some colour to be seen. */
const MIN_ACCENT_CHROMA = 0.08

/** A Material colour at a mid tone, as OKLCH: where its hue and chroma read best. */
function midTone(hue: number, chroma: number) {
  return fromHex(hexFromArgb(Hct.from(hue, chroma, 50).toInt()))
}

/** The theme the engine builds a palette's tokens from. */
export function paletteTheme(pick: PalettePick): ThemeDef {
  const seed = fromHex(pick.seed)
  const source = Hct.fromInt(argbFromHex(pick.seed))
  const chroma = Math.max(seed.C, MIN_ACCENT_CHROMA)
  const base = { id: 'palette', label: 'Your palette', hue: seed.h }
  if (pick.combo === 'bold') {
    const complement = new TemperatureCache(source).complement
    const accent = midTone(complement.hue, Math.max(complement.chroma, 40))
    const accentChroma = Math.max(accent.C, 0.12)
    return { ...base, chroma: 0.02, accent: [accentChroma, accent.h], fill: [0.6, Math.min(accentChroma, 0.22)], second: [chroma, seed.h], sidebar: 'piena', palette: 'crisp' }
  }
  if (pick.combo === 'soft') {
    const tertiary = new SchemeTonalSpot(source, false, 0).tertiaryPalette
    const accent = midTone(tertiary.hue, Math.max(tertiary.chroma, 40))
    return { ...base, chroma: 0.02, accent: [Math.max(accent.C, 0.1), accent.h], second: [chroma, seed.h], sidebar: 'tenue', palette: 'soft' }
  }
  return { ...base, chroma: 0.014, accent: [chroma, seed.h], sidebar: 'tenue', palette: 'crisp' }
}
