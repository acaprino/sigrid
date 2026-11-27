// A count beside a name (R5 of the owner's rules): a number in tabular figures, in the 12px label size and the muted
// ink. On a row of a navigation the row draws it as a pill (`NavItem`: the accent on the chosen row, neutral on the
// others); anywhere else it is the plain number. Zero, or nothing, shows nothing and takes no room; the caller that wants a
// column of counts to stay aligned passes `reserve`. With `rolling` a number set by events (things caught, unread)
// rolls its new value in from below when it changes, an odometer, where the app turned motion on and the system allows
// it (the stylesheet moves it, at the app's pace: `theme.css`); it never rolls when it first appears.
import { useState } from "react"
import { cn } from "../lib/utils"
import { useMotionAllowed } from "../internal/motion"

export type CountProps = {
  /** The number, or a text already formatted («99+»). */
  value: number | string | null | undefined
  /** What the number counts, for screen readers («unread»): read after the number. Without it the number is read alone. */
  label?: string | undefined
  /** Keep the room of a number when there is nothing to show, so a column of counts stays aligned. */
  reserve?: boolean | undefined
  /**
   * A number set by events rolls its new value in from below when it changes (an odometer), with motion on (`animated`
   * or `MotionProvider`) and not reduced; otherwise it changes at once. Never on its first appearance.
   */
  rolling?: boolean | undefined
  /** Motion for this count only, over `MotionProvider`. */
  animated?: boolean | undefined
  className?: string | undefined
}

function Count({ value, label, reserve, rolling = false, animated, className }: CountProps) {
  const allowed = useMotionAllowed(animated)
  // The value last drawn: a new one, after the first, is a change that may roll (state adjusted while rendering, so the
  // rolling mark and the new value reach the page together).
  const [shown, setShown] = useState(value)
  const [changed, setChanged] = useState(false)
  if (shown !== value) {
    setShown(value)
    setChanged(true)
  }
  const empty = value == null || value === 0 || value === ""
  if (empty && !reserve) return null
  const roll = rolling && allowed && changed && !empty
  return (
    <span data-slot="count" data-rolling={roll || undefined} aria-hidden={empty || undefined} className={cn("text-2xs text-ink-mute tabular-nums", empty && "invisible", className)}>
      {roll ? (
        // A new element for each value: the stylesheet brings it in from below when it appears.
        <span key={String(value)} data-slot="count-value">
          {value}
        </span>
      ) : empty ? (
        0
      ) : (
        value
      )}
      {label && !empty ? <span className="sr-only"> {label}</span> : null}
    </span>
  )
}

export { Count }
