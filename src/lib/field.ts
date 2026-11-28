// What every field of the toolkit shares, so a text box, a select, a combo box, a date, the labels field and the
// formatted text look and answer alike. `Input` is the original (Park's md field, outline variant); the others take
// these parts and add what is their own. The focus ring is in `focus.ts` (`FOCUS_FIELD` and its forms). Tailwind reads
// the classes as they are written here, so a part with a variant is a constant of its own, in each form it is used.

/**
 * Under a theme that asks for strong control borders (`ThemeDef.controls: 'strong'`, `data-controls="strong"` on the
 * root): the control border (`input`, 3:1) in place of the light divider, on fields and on the outline button. The
 * one approved exception to the light divider of 2026-11-22 (the owner, 2026-11-24), off unless the theme asks.
 * `:where()` keeps it as weak as the divider it replaces, so the invalid red and every state still win over it.
 */
export const STRONG_BORDER = '[:where([data-controls=strong])_&]:border-input'

/** The surface: l2 corners, the light divider border (as an outline button) and no fill; the control border under `controls: 'strong'`. */
export const FIELD_SURFACE = `rounded-md border border-line bg-transparent ${STRONG_BORDER}`

/** The height of a one-line field: a control tall (`--control-md`), with a finger too (a text field has no area around it). */
export const FIELD_HEIGHT = 'h-(--control-md)'

/**
 * The text: 14px at every width, as the labels beside it (the owner, 2026-11-28). The placeholder is muted.
 * shortcut: Safari on iOS zooms the page when a field under 16px takes the focus; an app that runs there asks for
 * `maximum-scale=1` in its viewport meta, or this goes back to 16px below `md`.
 */
export const FIELD_TEXT = 'text-sm placeholder:text-muted-foreground'

/**
 * Under the pointer the border goes one step darker (the field answers before it is pressed); invalid, it is the
 * destructive colour and stays so. For the element that carries `aria-invalid` itself.
 */
export const FIELD_HOVER = 'not-aria-invalid:hover:border-input aria-invalid:border-destructive'

/**
 * The same for a field made of several parts, which says it is invalid with `data-invalid` on its frame and off with
 * `data-disabled` (an off field does not answer the pointer).
 */
export const FIELD_HOVER_DATA = 'not-data-invalid:not-data-disabled:hover:border-input data-invalid:border-destructive'

/** Off: half opacity, and no pointer (no hover, no press). For a native control that is `disabled`. */
export const FIELD_OFF = 'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

/** The same, written out for a field that the caller's prop turns off (a select's button, whose primitive decides). */
export const FIELD_OFF_NOW = 'pointer-events-none cursor-not-allowed opacity-50'

/**
 * The corners of the quiet field (`FIELD_QUIET`): the one place that says how round it is. Round ends, half its
 * height at every density (the owner, 2026-11-24, after trying it in an app beside 8px and 12px): the one field off
 * the radii of R7, because in a bar the shape is what says «search».
 */
export const FIELD_QUIET_RADIUS = 'rounded-full'

/**
 * A field that does not ask to be looked at, for a search in a bar, where a full frame would weigh as much as the
 * page's own fields: Park's `subtle` variant of the same `input` recipe (a clear 1px border, a quiet fill, the ring
 * inside), as a well (the owner's design of 2026-11-24). Laid over the classes of `Input`, each written on the same
 * chain as the one it replaces, so only these are left.
 * - The surface is the toolkit's quiet fill, the ink at 6% over whatever it lies on (darker than the bar in light, a
 *   step apart from it in dark, where a bar is too near black to go darker), in place of a border: the border is
 *   still there, clear, so the field is as tall as every field and Windows' forced colours draw it.
 * - A faint line of shade inside its top edge sets it into the bar: 1px down, 1px soft, the `drop` colour at 7%. It
 *   is not an elevation (R4 keeps those for what is raised), and in dark it is next to nothing, as the drop is there.
 * - In focus the fill gives way to the page and the shade goes: the field is where the user writes, with the ring
 *   of every field (`FOCUS_FIELD`), which follows its round ends.
 * - Under the pointer the light divider shows; a theme's strong control border does not apply to it; invalid, it is
 *   the destructive colour.
 */
export const FIELD_QUIET = `${FIELD_QUIET_RADIUS} border-transparent bg-ink/6 inset-shadow-xs inset-shadow-drop/7 focus:bg-paper focus:inset-shadow-none [:where([data-controls=strong])_&]:border-transparent not-aria-invalid:hover:border-line`
