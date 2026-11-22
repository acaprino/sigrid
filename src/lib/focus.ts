// The focus ring of every control (R8 of the owner's rules, DESIGN.md "Accessibility"): a 2px outline in the accent as
// text (`--color-ring`, at least 3:1 on every background of every theme), 2px away from the control. On a control with
// a border the two do not read as a double frame, because that border is the light divider colour (the owner's design
// of 2026-11-22; for some hours the ring sat on the border instead). `outline-hidden`
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
