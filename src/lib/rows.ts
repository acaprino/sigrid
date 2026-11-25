// What every list of the toolkit shares, so a menu, a select, a combo box, a navigation, a list of things and a tree
// speak one language. Tailwind reads the classes as they are written here, so a class with a variant (`hover:`,
// `data-highlighted:`) is a constant of its own, not a prefix added at run time.

/**
 * A row under the pointer, or reached with the arrows: a share of the selection tint and the strongest text. It reads
 * as "about to be chosen", a step below the chosen row, which has the whole tint. The same on the page and on a raised
 * card. (On the sidebar the tint is the sidebar's own: `nav-list.tsx`.)
 */
export const ROW_HIGHLIGHT = 'bg-selected/60 text-ink'

/** `ROW_HIGHLIGHT` under the pointer: the row of a list of things (`ItemRow`, `Tree`, a table's row), which is a button or a link. */
export const ROW_HOVER = 'hover:bg-selected/60 hover:text-ink'

/**
 * `ROW_HOVER` for a row of a list whose hover is one background that follows the pointer (`HoverFollow`, with motion
 * on): the row keeps the stronger text and leaves the fill to that background, which is under it.
 */
export const ROW_HOVER_FOLLOWED = 'hover:text-ink'

/** The fill of `ROW_HIGHLIGHT` alone: what the background that follows the pointer is made of (`HoverFollow`). */
export const ROW_HIGHLIGHT_FILL = 'bg-selected/60'

/**
 * `ROW_HIGHLIGHT` on the row the primitive marks `data-highlighted` (Base UI's menu and select, Ark's combo box): the
 * one under the pointer or reached with the arrows, while the focus stays in the list or in the text box.
 */
export const ROW_HIGHLIGHTED = 'data-highlighted:bg-selected/60 data-highlighted:text-ink'

/** `ROW_HIGHLIGHT` on the row whose own list is open beside it (a menu's row with a submenu). */
export const ROW_POPUP_OPEN = 'data-popup-open:bg-selected/60 data-popup-open:text-ink'

/**
 * The list that floats under a field (a select, a combo box, the suggestions of the labels field): the popover card
 * with l2 corners and the md elevation in place of a border (R4), 4px of padding, 2px between the rows, 14px text, and
 * at most 320px tall before it scrolls. A menu is the same card with l3 corners (`dropdown-menu.tsx`).
 */
export const LIST_CARD = 'flex max-h-80 flex-col gap-0.5 overflow-y-auto rounded-md bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none'

/**
 * A row of that list: a row tall (44px with a finger, `--row-height`), the density's padding above and below, 8px at
 * the sides, l1 corners, the highlight of every list, and a row that is off fades and takes no pointer. A menu's row
 * is the same with l2 corners.
 */
export const LIST_ROW = `relative flex min-h-(--row-height) cursor-default items-center gap-2 rounded-sm px-2 py-(--row-pad) text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${ROW_HIGHLIGHTED}`

/**
 * The chosen row of a list of things (R1), for a row that says it with `aria-current="true"` (`ItemRow`, `Tree`): the
 * whole selection tint, its ink, and a short bar in the accent at its start, 16px tall, 3px wide, round, centred on the
 * row. The row is `relative`, so the bar sits on its edge. (A navigation says `aria-current="page"`, in two tones: `NavItem`
 * draws the same bar in its own classes.)
 */
export const ROW_CHOSEN =
  "aria-[current=true]:bg-selected aria-[current=true]:text-selected-ink aria-[current=true]:before:absolute aria-[current=true]:before:top-1/2 aria-[current=true]:before:start-0 aria-[current=true]:before:h-4 aria-[current=true]:before:w-0.75 aria-[current=true]:before:-translate-y-1/2 aria-[current=true]:before:rounded-full aria-[current=true]:before:bg-primary aria-[current=true]:before:content-['']"

/**
 * The heading of a group of rows (in a menu, a select, the sidebar, a section of files): a 12px semibold overline in
 * the muted ink, in capitals with wide tracking. Small and quiet, so the rows under it stay what the eye lands on.
 */
export const GROUP_LABEL = 'text-2xs font-semibold tracking-[0.07em] uppercase'
