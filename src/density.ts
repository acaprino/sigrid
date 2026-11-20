/**
 * Density: how tall the controls are, how much side padding they have and how much room a list row takes. Like the
 * themes it is data: the toolkit ships three presets (`DENSITIES`) and an app may pass a definition of its own, or a
 * preset with some measures changed (`densityWith`). `applyDensity` writes the measures on an element as CSS variables
 * (`--density-*`) and the id as `data-density`; `styles/theme.css` turns them into the tokens the components use
 * (`--control-md`, `--pad-md`, `--row-height`…), with `normal` as the value before any script runs and 44px as the
 * floor of every control and row with a coarse pointer.
 */

/** The measures of a density, in px. */
export interface DensityDef {
  /** Goes on the element as `data-density`. */
  readonly id: string
  readonly label: string
  /** Control heights: `md` is the default control; `sm` and `xs` only inside a dense row. */
  readonly control: { readonly md: number; readonly sm: number; readonly xs: number }
  /** Side padding of a control: `md` buttons and segment items, `sm` fields and selects, `xs` the smallest button. */
  readonly pad: { readonly md: number; readonly sm: number; readonly xs: number }
  /** A row of a list or of a menu: its least height and its padding above and below. */
  readonly row: { readonly height: number; readonly pad: number }
}

/** Some measures of a density: the rest stays as the base has it. */
export interface DensityOverride {
  readonly id?: string
  readonly label?: string
  readonly control?: Partial<DensityDef['control']>
  readonly pad?: Partial<DensityDef['pad']>
  readonly row?: Partial<DensityDef['row']>
}

/**
 * The three presets. `normal` is Park UI's md form (40/36/32px controls, 14/12/10px side padding, 40px menu rows);
 * `compact` and `large` move every height one 4px step, every side padding one 2px step, and a row two steps.
 */
export const DENSITIES = [
  { id: 'compact', label: 'Compact', control: { md: 36, sm: 32, xs: 28 }, pad: { md: 12, sm: 10, xs: 8 }, row: { height: 32, pad: 4 } },
  { id: 'normal', label: 'Normal', control: { md: 40, sm: 36, xs: 32 }, pad: { md: 14, sm: 12, xs: 10 }, row: { height: 40, pad: 8 } },
  { id: 'large', label: 'Large', control: { md: 44, sm: 40, xs: 36 }, pad: { md: 16, sm: 14, xs: 12 }, row: { height: 48, pad: 12 } },
] as const satisfies readonly DensityDef[]

export type DensityId = (typeof DENSITIES)[number]['id']
/** A density to apply: a preset by its id, or a definition. */
export type Density = DensityId | DensityDef

export const DEFAULT_DENSITY: DensityId = 'normal'

/** The least height of a control or a row with a coarse pointer, whatever the density (`--touch-target` in `theme.css`). */
export const TOUCH_TARGET = 44

/**
 * What a definition may ask for, in px: a control and a row are never shorter than the 24px hit area of a fine
 * pointer, a side padding never less than one 4px step. A measure outside these bounds is brought to the nearest one.
 */
export const DENSITY_LIMITS = {
  control: { min: 24, max: 64 },
  pad: { min: 4, max: 32 },
  rowHeight: { min: 24, max: 72 },
  rowPad: { min: 0, max: 24 },
} as const

const NORMAL: DensityDef = DENSITIES[1]

export function isDensityId(value: unknown): value is DensityId {
  return DENSITIES.some((d) => d.id === value)
}
export function densityById(id: DensityId): DensityDef {
  return (DENSITIES as readonly DensityDef[]).find((d) => d.id === id) ?? NORMAL
}

/** A base density (a preset or a definition) with some measures changed: an app's own density. */
export function densityWith(base: Density, override: DensityOverride): DensityDef {
  const from = densityOf(base)
  return {
    id: override.id ?? from.id,
    label: override.label ?? from.label,
    control: { ...from.control, ...override.control },
    pad: { ...from.pad, ...override.pad },
    row: { ...from.row, ...override.row },
  }
}

/** A whole number of px inside the bounds; a value that is not a number is the fallback. */
function measure(value: unknown, limits: { readonly min: number; readonly max: number }, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)))
}

/** An id that can go in an attribute and be matched by a selector: letters, digits, `-` and `_`. */
function safeId(value: unknown): string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,40}$/.test(value) ? value : 'custom'
}

/**
 * The definition behind a choice, made safe: an unknown id is `normal`; in a definition every measure is a whole number
 * inside `DENSITY_LIMITS`, and one that is missing or not a number is `normal`'s.
 */
export function densityOf(density: unknown): DensityDef {
  if (isDensityId(density)) return densityById(density)
  if (typeof density !== 'object' || density === null || Array.isArray(density)) return NORMAL
  const d = density as { id?: unknown; label?: unknown; control?: Record<string, unknown>; pad?: Record<string, unknown>; row?: Record<string, unknown> }
  const id = safeId(d.id)
  const { control, pad, rowHeight, rowPad } = DENSITY_LIMITS
  return {
    id,
    label: typeof d.label === 'string' ? d.label : id,
    control: {
      md: measure(d.control?.['md'], control, NORMAL.control.md),
      sm: measure(d.control?.['sm'], control, NORMAL.control.sm),
      xs: measure(d.control?.['xs'], control, NORMAL.control.xs),
    },
    pad: {
      md: measure(d.pad?.['md'], pad, NORMAL.pad.md),
      sm: measure(d.pad?.['sm'], pad, NORMAL.pad.sm),
      xs: measure(d.pad?.['xs'], pad, NORMAL.pad.xs),
    },
    row: {
      height: measure(d.row?.['height'], rowHeight, NORMAL.row.height),
      pad: measure(d.row?.['pad'], rowPad, NORMAL.row.pad),
    },
  }
}

/** The CSS variables of a density, as an inline style (a preview, or the root). */
export function densityVariables(density: Density): Record<string, string> {
  const d = densityOf(density)
  return {
    '--density-control-md': `${d.control.md}px`,
    '--density-control-sm': `${d.control.sm}px`,
    '--density-control-xs': `${d.control.xs}px`,
    '--density-pad-md': `${d.pad.md}px`,
    '--density-pad-sm': `${d.pad.sm}px`,
    '--density-pad-xs': `${d.pad.xs}px`,
    '--density-row-height': `${d.row.height}px`,
    '--density-row-pad': `${d.row.pad}px`,
  }
}

/** The names of the variables that `applyDensity` writes: the same for every density. */
export const DENSITY_VARIABLES: readonly string[] = Object.keys(densityVariables(DEFAULT_DENSITY))

/**
 * Puts a density on an element: its measures as an inline style (`--density-*`) and its id as `data-density`. A value
 * that is neither a preset nor a definition is `normal`; a definition is made safe first (`densityOf`).
 */
export function applyDensity(el: HTMLElement, density: Density): void {
  const d = densityOf(density)
  for (const [k, v] of Object.entries(densityVariables(d))) el.style.setProperty(k, v)
  el.setAttribute('data-density', d.id)
}
