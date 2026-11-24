// A count beside a name (R5 of the owner's rules): a number in tabular figures, in the 12px label size and the muted
// ink. On a row of a navigation the row draws it as a pill (`NavItem`: the accent on the chosen row, neutral on the
// others); anywhere else it is the plain number. Zero, or nothing, shows nothing and takes no room; the caller that wants a
// column of counts to stay aligned passes `reserve`.
import { cn } from "../../lib/utils"

export type CountProps = {
  /** The number, or a text already formatted («99+»). */
  value: number | string | null | undefined
  /** What the number counts, for screen readers («unread»): read after the number. Without it the number is read alone. */
  label?: string | undefined
  /** Keep the room of a number when there is nothing to show, so a column of counts stays aligned. */
  reserve?: boolean | undefined
  className?: string | undefined
}

function Count({ value, label, reserve, className }: CountProps) {
  const empty = value == null || value === 0 || value === ""
  if (empty && !reserve) return null
  return (
    <span data-slot="count" aria-hidden={empty || undefined} className={cn("text-2xs text-ink-mute tabular-nums", empty && "invisible", className)}>
      {empty ? 0 : value}
      {label && !empty ? <span className="sr-only"> {label}</span> : null}
    </span>
  )
}

export { Count }
