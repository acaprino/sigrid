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

/** The height of a one-line field: a control tall (`--control-md`), 44px with a finger. */
export const FIELD_HEIGHT = 'h-(--control-md) pointer-coarse:min-h-11'

/** The text: 14px, and 16px below 860px so iOS does not zoom the page when the field takes the focus. The placeholder is muted. */
export const FIELD_TEXT = 'text-base md:text-sm placeholder:text-muted-foreground'

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
