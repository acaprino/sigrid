// What every list of the toolkit shares, so a menu, a select, a combo box and a navigation speak one language.

/**
 * A row under the pointer, or reached with the arrows: a share of the selection tint and the strongest text. It reads
 * as "about to be chosen", a step below the chosen row, which has the whole tint. The same on the page and on a raised
 * card. (On the sidebar the tint is the sidebar's own: `nav-list.tsx`.)
 */
export const ROW_HIGHLIGHT = 'bg-selected/60 text-ink'

/**
 * The heading of a group of rows (in a menu, a select, the sidebar, a section of files): a 12px semibold overline in
 * the muted ink, in capitals with wide tracking. Small and quiet, so the rows under it stay what the eye lands on.
 */
export const GROUP_LABEL = 'text-2xs font-semibold tracking-[0.07em] uppercase'
