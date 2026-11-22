// The focus ring of every control (R8 of the owner's rules, DESIGN.md "Accessibility"): a 2px outline in the accent as
// text (`--color-ring`, at least 3:1 on every background of every theme), 2px away from the control, or on its border
// if it has one (`FOCUS_RING_BORDER`). `outline-hidden`
// keeps a transparent outline for Windows forced colours, where theme.css draws the system's own.

/** Keyboard focus on the control itself. */
export const FOCUS_RING = 'outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/**
 * Focus on a control that has a border of its own (a field, a select, a combo box, an outline button): the ring takes
 * the place of the border, which reads as the border turning 2px thick in the accent. A ring 2px away from a bordered
 * control drew a second frame around it (the owner's decision of 2026-11-22).
 */
export const FOCUS_RING_BORDER = 'outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring'

/** The same, for focus anywhere inside a bordered composite field (the labels field). */
export const FOCUS_WITHIN_RING_BORDER = 'outline-hidden focus-within:outline-solid focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-ring'

/** Keyboard focus anywhere inside a composite field (the labels field): the ring goes around the whole field. */
export const FOCUS_WITHIN_RING = 'outline-hidden focus-within:outline-solid focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring'

/**
 * A scroll region that fills its sheet: an offset outside it would be cut by the sheet, so the ring sits 2px inside
 * the edge (the one approved exception to the 2px outside offset).
 */
export const FOCUS_RING_INSET = 'outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'
