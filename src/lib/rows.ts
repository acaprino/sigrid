// What every list of the toolkit shares, so a menu, a select, a combo box, a navigation, a list of things and a tree
// speak one language.

/**
 * A row under the pointer, or reached with the arrows: a share of the selection tint and the strongest text. It reads
 * as "about to be chosen", a step below the chosen row, which has the whole tint. The same on the page and on a raised
 * card. (On the sidebar the tint is the sidebar's own: `nav-list.tsx`.)
 */
export const ROW_HIGHLIGHT = 'bg-selected/60 text-ink'

/** `ROW_HIGHLIGHT` under the pointer: the row of a list of things (`ItemRow`, `Tree`), which is a button or a link. */
export const ROW_HOVER = 'hover:bg-selected/60 hover:text-ink'

/**
 * The chosen row of a list of things (R1), for a row that says it with `aria-current="true"` (`ItemRow`, `Tree`): the
 * whole selection tint, its ink, and a short bar in the accent at its start, 16px tall, 3px wide, round, centred on the
 * row. The row is `relative`, so the bar sits on its edge. (A navigation says `aria-current="page"`, in two tones: `NavItem`
 * draws the same bar in its own classes.)
 */
export const ROW_CHOSEN =
  "aria-[current=true]:bg-selected aria-[current=true]:text-selected-ink aria-[current=true]:before:absolute aria-[current=true]:before:top-1/2 aria-[current=true]:before:left-0 aria-[current=true]:before:h-4 aria-[current=true]:before:w-0.75 aria-[current=true]:before:-translate-y-1/2 aria-[current=true]:before:rounded-full aria-[current=true]:before:bg-primary aria-[current=true]:before:content-['']"

/**
 * The heading of a group of rows (in a menu, a select, the sidebar, a section of files): a 12px semibold overline in
 * the muted ink, in capitals with wide tracking. Small and quiet, so the rows under it stay what the eye lands on.
 */
export const GROUP_LABEL = 'text-2xs font-semibold tracking-[0.07em] uppercase'
