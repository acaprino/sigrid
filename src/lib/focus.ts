// The focus ring of every control (R8 of the owner's rules, DESIGN.md "Accessibility"): a 2px outline in the accent as
// text (`--color-ring`, at least 3:1 on every background of every theme). On a control without a border it is 2px
// away from the control. On a field, which has a border of its own, it sits on that border (`FOCUS_FIELD`): 2px away
// the two read as a double frame (the owner, 2026-11-23, on the quick field of the to-do app). `outline-hidden`
// keeps a transparent outline for Windows forced colours, where theme.css draws the system's own.

/** Keyboard focus on the control itself. */
export const FOCUS_RING = 'outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/** Keyboard focus anywhere inside a composite field (the labels field): the ring goes around the whole field. */
export const FOCUS_WITHIN_RING = 'outline-hidden focus-within:outline-solid focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring'

/**
 * A scroll region that fills its sheet: an offset outside it would be cut by the sheet, so the ring sits 2px inside
 * the edge (the one approved exception to the 2px outside offset).
 */
export const FOCUS_RING_INSET = 'outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'

/**
 * Keyboard focus on a field (a text box, a select, a date): the ring sits on the field's own border, 1px inside it
 * and 1px outside, so a field in focus has one line and not two (the owner, 2026-11-23: the ring 2px away from a
 * border read as a double frame). Everything without a border keeps the ring 2px away.
 */
export const FOCUS_FIELD = 'outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring'

/** The same for a field made of several parts (labels, formatted text): the ring is on the border of the whole field. */
export const FOCUS_WITHIN_FIELD = 'outline-hidden focus-within:outline-solid focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-ring'
