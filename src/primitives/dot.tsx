// A dot of 8px: a colour the person gave to a thing (a project, a label, an account), never a fill (R10), or the state
// of a thing told by a mark (available, waiting, failed). A colour of the palette (`COLORS`) is drawn in the theme's
// own shade of it (`markHueAttrs`, the dot of `GraphCanvas`), so it keeps 3:1 on the page in every theme; a state takes
// its status colour. A dot is never alone (R2, «A fact by its form»): the word beside it says what it means, so the dot
// itself is hidden from screen readers.
import { markHueAttrs } from "../colors"
import { cn } from "../lib/utils"

const TONE = { neutral: "bg-ink-mute", accent: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-destructive" } as const

export type DotProps = {
  /** A colour the person chose, one of the palette's (`COLORS`): drawn in the theme's shade of it. */
  color?: string | undefined
  /** The state it marks, where there is no `color`: `neutral` (the default), `accent`, `success`, `warning`, `danger`. */
  tone?: keyof typeof TONE | undefined
}

/** An 8px dot in a person's colour or in the colour of a state, beside the word that names it. */
function Dot({ color, tone = "neutral" }: DotProps) {
  return <span aria-hidden="true" data-slot="dot" {...(color ? markHueAttrs(color) : {})} className={cn("size-2 shrink-0 rounded-full", color ? "bg-(--mark-dot)" : TONE[tone])} />
}

export { Dot }
