// A list of things to read and act on (messages, files, records): the content of the «list and detail» layout. Each
// row has a title and, if the app has them, a second line under it, something before the title (an avatar, an icon), a
// short fact at the end (a date, a size) and whatever else the caller adds there (a `Count`, a label).
// It speaks the one language of every list of the toolkit:
// - the row the user chose has the selection tint, stronger text and a short accent bar at its start (R1), and under
//   the pointer a row takes a share of that tint;
// - a row not read yet has a dot in the accent before its title and the title in semibold (R2: unread is one of the
//   accent's places); the dot's slot stays when empty, so the titles line up;
// - a row is one line as tall as the density's row, or two lines; with a finger it is at least 44px.
// With `animated` the share of the tint under the pointer is one background for the whole list, which follows the
// pointer from row to row (`HoverFollow`); the chosen row keeps its own tint over it, and the keyboard's focus ring
// is the row's own, as without it.
// The second line is a sentence (`description`), or short facts side by side (`facts`: a label with its dot, a project,
// the day, a count of steps), which wrap rather than cut.
// A row is a button, or a link with `href`, so nothing in it is a control: a button cannot hold a button. A thing one
// both ticks and opens (a task, a file to clean) carries its one control beside the button (`control`, at the start or
// the end): the list item is then the row, with the tint, the bar and the hover, and the control and the button are
// two tab stops with their own names; a press on the control is the control's and never opens the row.
// The rows of a navigation are `NavItem`: those are places, these are things.
// A row only to read (`plain`: what a dictation has caught so far, as it arrives) is the same row without the button:
// no press, no hover, no focus, not chosen; its words and facts are drawn the same.
import * as React from "react"
import { cn } from "../lib/utils"
import { FOCUS_RING_INSET } from "../lib/focus"
import { ROW_CHOSEN, ROW_HOVER, ROW_HOVER_FOLLOWED } from "../lib/rows"
import { useMotion } from "../internal/motion"
import { useWords } from "../words"
import { Dot } from "../primitives/dot"
import { HoverFollow } from "../primitives/hover-follow"

export type ItemListProps = {
  /** Name of the list for screen readers («Messages»). */
  "aria-label": string
  /** One hover background follows the pointer from row to row (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  className?: string | undefined
  children?: React.ReactNode
}

/** True for the rows of a list whose hover is the one background that follows the pointer: they leave the fill to it. */
const FollowedContext = React.createContext(false)

function ItemList({ animated, className, children, ...props }: ItemListProps) {
  // The same answer `HoverFollow` gets: the rows give up their own hover fill only while it draws the shared one.
  const followed = useMotion(animated) !== null
  const [list, setList] = React.useState<HTMLUListElement | null>(null)
  return (
    <ul ref={setList} role="list" data-slot="item-list" {...props} className={cn("flex flex-col gap-0.5", className)}>
      <FollowedContext.Provider value={followed}>{children}</FollowedContext.Provider>
      {followed ? <HoverFollow container={list} rows='[data-slot="item-row"]:not([data-plain])' as="li" animated={animated} /> : null}
    </ul>
  )
}

/** A short fact of a row, in the line under its title. */
export type ItemFact = {
  /** The words of the fact («@home», «Kitchen renovation», «1/3»). */
  text: React.ReactNode
  /** A colour the person gave to it (a label's, a project's), one of the palette's: an 8px dot before the words (R10). */
  color?: string | undefined
  /**
   * `strong`: the medium weight, for the fact that matters most (a priority). `accent`: semibold in the accent, for one
   * of the accent's places only (today, R2); on the chosen row it is the row's own ink, as every fact there.
   */
  tone?: "strong" | "accent" | undefined
  /** Tabular figures: a count, a time. */
  numeric?: boolean | undefined
}

export type ItemRowProps = {
  /** What the thing is: one line, cut with an ellipsis. */
  title: React.ReactNode
  /** The title takes up to two lines before it is cut: a list on a narrow screen, where a long name would lose its end. */
  wrapTitle?: boolean | undefined
  /** A second line under the title: who, where, the first words. */
  description?: React.ReactNode
  /** Short facts under the title (and under `description`), 8px apart, wrapping to a new line rather than cut. */
  facts?: readonly ItemFact[] | undefined
  /** Before the title: an avatar, an icon. Not a control: the row is itself a button or a link. */
  leading?: React.ReactNode
  /** A short fact at the end of the row, in tabular figures: a date, a size. */
  meta?: React.ReactNode
  /** After the fact: a `Count`, a label. Not a control: the row is itself a button or a link. */
  end?: React.ReactNode
  /**
   * One control beside the row's button (a `Checkbox` with its own `aria-label`, «Complete «Pay the rent»»): the list
   * item holds the two side by side, inside the row's tint. Two tab stops; a press on the control does not open the row.
   */
  control?: React.ReactNode
  /** Where the control is: at the `start` of the row (the default: a box to tick) or at its `end`. */
  controlSide?: "start" | "end" | undefined
  /** This row is the one shown in the detail. */
  current?: boolean | undefined
  /** Not read yet: a dot in the accent and a stronger title. Absent: the list has no such state and keeps no slot for it. */
  unread?: boolean | undefined
  /**
   * Only to read: the row is a plain list item, not a button or a link (what a dictation has caught, shown as it arrives).
   * No hover, no focus, never chosen: `href`, `onClick`, `disabled`, `control` and `current` are not used.
   */
  plain?: boolean | undefined
  /** With it the row is a link. */
  href?: string | undefined
  onClick?: React.MouseEventHandler<HTMLElement> | undefined
  disabled?: boolean | undefined
  className?: string | undefined
}

const ROW_SHAPE = "relative flex min-h-(--row-height) w-full cursor-default items-center gap-3 rounded-md px-3 py-1.5 text-start text-sm text-ink-soft pointer-coarse:min-h-11"
const ROW_STATES = cn(ROW_CHOSEN, "disabled:pointer-events-none disabled:opacity-50", FOCUS_RING_INSET)
// The one look of a row of things, shared with `Tree` (`lib/rows.ts`).
const ROW = cn(ROW_SHAPE, ROW_HOVER, ROW_STATES)
// In a list whose hover background follows the pointer, the fill under the pointer is that background's.
const ROW_FOLLOWED = cn(ROW_SHAPE, ROW_HOVER_FOLLOWED, ROW_STATES)

// A row with a control: the list item is the row. It has the row's height and hover, and the chosen look of
// `ROW_CHOSEN` (the tint, its ink, the accent bar at its start), said here by `data-current`: what is current is the
// button inside, which says it with `aria-current`. The button takes the rest of the width with its own focus ring; the
// 12px between the control and the words are the button's, so a press there opens the row.
const ROW_BOX_SHAPE = "relative flex min-h-(--row-height) w-full cursor-default items-stretch rounded-md text-sm text-ink-soft pointer-coarse:min-h-11"
const ROW_BOX_CHOSEN =
  "data-current:bg-selected data-current:text-selected-ink data-current:before:absolute data-current:before:top-1/2 data-current:before:start-0 data-current:before:h-4 data-current:before:w-0.75 data-current:before:-translate-y-1/2 data-current:before:rounded-full data-current:before:bg-primary data-current:before:content-['']"
const ROW_BOX = cn(ROW_BOX_SHAPE, ROW_HOVER, ROW_BOX_CHOSEN)
const ROW_BOX_FOLLOWED = cn(ROW_BOX_SHAPE, ROW_HOVER_FOLLOWED, ROW_BOX_CHOSEN)
const ROW_BUTTON = cn(
  "flex min-w-0 flex-1 cursor-default items-center gap-3 rounded-md px-3 py-1.5 text-start",
  "disabled:pointer-events-none disabled:opacity-50",
  FOCUS_RING_INSET,
)

function ItemRow({ title, wrapTitle = false, description, facts, leading, meta, end, control, controlSide = "start", current: chosen = false, unread, plain = false, href, onClick, disabled, className }: ItemRowProps) {
  const words = useWords()
  const followed = React.useContext(FollowedContext)
  const current = chosen && !plain
  // On the chosen row the muted ink would not keep its contrast on the tint: the row's own ink, a step quieter.
  const quiet = current ? "opacity-80" : "text-ink-mute"
  const body = (
    <>
      {unread === undefined ? null : (
        <span data-slot="item-row-unread" className="flex size-2 shrink-0 items-center justify-center">
          {unread ? (
            <>
              <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
              <span className="sr-only">{words.list.unread}, </span>
            </>
          ) : null}
        </span>
      )}
      {leading ? <span data-slot="item-row-leading" className="flex shrink-0 items-center [&_svg:not([class*='size-'])]:size-4">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span data-slot="item-row-title" className={cn(wrapTitle ? "line-clamp-2" : "truncate", (unread || current) && "font-semibold", unread && !current && "text-ink")}>
          {title}
        </span>
        {description ? (
          <span data-slot="item-row-description" className={cn("truncate text-xs", quiet)}>
            {description}
          </span>
        ) : null}
        {facts && facts.length > 0 ? (
          <span data-slot="item-row-facts" className={cn("flex min-w-0 flex-wrap items-center gap-x-2 text-xs", quiet)}>
            {facts.map((fact, at) => (
              <span
                // The facts are a row's own, in their order: their place is what tells them apart.
                key={at}
                data-slot="item-row-fact"
                className={cn(
                  "inline-flex min-w-0 items-center gap-1",
                  fact.numeric && "tabular-nums",
                  fact.tone === "strong" && "font-medium",
                  fact.tone === "accent" && !current && "font-semibold text-accent",
                )}
              >
                {fact.color ? <Dot color={fact.color} /> : null}
                <span className="truncate">{fact.text}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      {meta ? (
        <span data-slot="item-row-meta" className={cn("shrink-0 text-2xs tabular-nums", quiet)}>
          {meta}
        </span>
      ) : null}
      {end}
    </>
  )
  if (plain) {
    return (
      <li data-slot="item-row" data-plain="" className={cn(ROW_SHAPE, className)}>
        {body}
      </li>
    )
  }
  const currentAttr = current ? ("true" as const) : undefined
  if (control !== undefined && control !== null && control !== false) {
    const start = controlSide === "start"
    const pressable =
      href !== undefined && !disabled ? (
        <a data-slot="item-row-button" aria-current={currentAttr} href={href} onClick={onClick} className={ROW_BUTTON}>
          {body}
        </a>
      ) : (
        <button data-slot="item-row-button" type="button" aria-current={currentAttr} disabled={disabled} onClick={onClick} className={ROW_BUTTON}>
          {body}
        </button>
      )
    // The control keeps the row's 12px from its edge.
    const held = (
      <span data-slot="item-row-control" className={cn("flex shrink-0 items-center", start ? "ps-3" : "pe-3")}>
        {control}
      </span>
    )
    return (
      <li data-slot="item-row" data-control={controlSide} data-current={current ? "" : undefined} className={cn(followed ? ROW_BOX_FOLLOWED : ROW_BOX, className)}>
        {start ? held : null}
        {pressable}
        {start ? null : held}
      </li>
    )
  }
  const shared = { "data-slot": "item-row", "aria-current": currentAttr, className: cn(followed ? ROW_FOLLOWED : ROW, className) }
  return (
    <li>
      {href !== undefined && !disabled ? (
        <a {...shared} href={href} onClick={onClick}>
          {body}
        </a>
      ) : (
        <button {...shared} type="button" disabled={disabled} onClick={onClick}>
          {body}
        </button>
      )}
    </li>
  )
}

export { ItemList, ItemRow }
