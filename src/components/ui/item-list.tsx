// A list of things to read and act on (messages, files, records): the content of the «list and detail» layout. Each
// row has a title and, if the app has them, a second line under it, something before the title (an avatar, an icon), a
// short fact at the end (a date, a size) and whatever else the caller adds there (a `Count`, a label).
// It speaks the one language of every list of the toolkit:
// - the row the user chose has the selection tint, stronger text and a short accent bar at its start (R1), and under
//   the pointer a row takes a share of that tint;
// - a row not read yet has a dot in the accent before its title and the title in semibold (R2: unread is one of the
//   accent's places); the dot's slot stays when empty, so the titles line up;
// - a row is one line as tall as the density's row, or two lines; with a finger it is at least 44px.
// A row is a button, or a link with `href`, so nothing in it is a control: a button cannot hold a button.
// The rows of a navigation are `NavItem`: those are places, these are things.
import * as React from "react"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"
import { ROW_CHOSEN, ROW_HOVER } from "../../lib/rows"
import { useWords } from "../../words"

export type ItemListProps = {
  /** Name of the list for screen readers («Messages»). */
  "aria-label": string
  className?: string | undefined
  children?: React.ReactNode
}

function ItemList({ className, children, ...props }: ItemListProps) {
  return (
    <ul role="list" data-slot="item-list" {...props} className={cn("flex flex-col gap-0.5", className)}>
      {children}
    </ul>
  )
}

export type ItemRowProps = {
  /** What the thing is: one line, cut with an ellipsis. */
  title: React.ReactNode
  /** A second line under the title: who, where, the first words. */
  description?: React.ReactNode
  /** Before the title: an avatar, an icon. Not a control: the row is itself a button or a link. */
  leading?: React.ReactNode
  /** A short fact at the end of the row, in tabular figures: a date, a size. */
  meta?: React.ReactNode
  /** After the fact: a `Count`, a label. Not a control: the row is itself a button or a link. */
  end?: React.ReactNode
  /** This row is the one shown in the detail. */
  current?: boolean | undefined
  /** Not read yet: a dot in the accent and a stronger title. Absent: the list has no such state and keeps no slot for it. */
  unread?: boolean | undefined
  /** With it the row is a link. */
  href?: string | undefined
  onClick?: React.MouseEventHandler<HTMLElement> | undefined
  disabled?: boolean | undefined
  className?: string | undefined
}

const ROW = cn(
  "relative flex min-h-(--row-height) w-full cursor-default items-center gap-3 rounded-md px-3 py-1.5 text-start text-sm text-ink-soft pointer-coarse:min-h-11",
  // The one look of a row of things, shared with `Tree` (`lib/rows.ts`).
  ROW_HOVER,
  ROW_CHOSEN,
  "disabled:pointer-events-none disabled:opacity-50",
  FOCUS_RING_INSET,
)

function ItemRow({ title, description, leading, meta, end, current = false, unread, href, onClick, disabled, className }: ItemRowProps) {
  const words = useWords()
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
        <span data-slot="item-row-title" className={cn("truncate", (unread || current) && "font-semibold", unread && !current && "text-ink")}>
          {title}
        </span>
        {description ? (
          <span data-slot="item-row-description" className={cn("truncate text-xs", current ? "opacity-80" : "text-ink-mute")}>
            {description}
          </span>
        ) : null}
      </span>
      {meta ? (
        <span data-slot="item-row-meta" className={cn("shrink-0 text-2xs tabular-nums", current ? "opacity-80" : "text-ink-mute")}>
          {meta}
        </span>
      ) : null}
      {end}
    </>
  )
  const shared = { "data-slot": "item-row", "aria-current": current ? ("true" as const) : undefined, className: cn(ROW, className) }
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
