// A choice of a settings page (docs/patterns.md, «Sidebar and page»): its name, and a line under it if it needs one, at
// the start; its control at the end (a `Switch`, a `ToggleGroup`, a `Select`); a hairline under it, so a page of them
// reads as one list. The choice takes effect at once: no Save. A row that opens more (a page of its own, «Advanced»)
// has no control: the whole row is the button, with a chevron at its end.
// It is at least 48px tall, and 44px with a finger at any density. The control names itself (`aria-label` with the
// row's name): the row only lays it out.
import type * as React from "react"
import { Icon } from "../icons"
import { cn } from "../lib/utils"
import { FOCUS_RING_INSET } from "../lib/focus"

export type SettingRowProps = {
  /** The name of the choice («Reminders»). */
  label: React.ReactNode
  /** A line under the name: what it does, what it is set to. */
  description?: React.ReactNode
  /** The control at the end. Absent with `onClick`: the row opens more. */
  control?: React.ReactNode
  /** The row is a button that opens more, with a chevron at its end, and holds no control. */
  onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined
}

// 48px: room for a name and the line under it. (Taller than the 44px a finger needs, so no rule for a finger.)
const ROW = "flex min-h-12 w-full min-w-0 items-center justify-between gap-4 border-b border-line py-2 text-start text-sm text-ink"

/** One choice of a settings page: the name at the start, the control at the end. */
function SettingRow({ label, description, control, onClick }: SettingRowProps) {
  const words = (
    <span data-slot="setting-row-words" className="flex min-w-0 flex-col">
      <span>{label}</span>
      {description ? <span className="text-xs text-ink-mute">{description}</span> : null}
    </span>
  )
  if (onClick && !control) {
    return (
      // A row that opens more answers the pointer as a quiet control does: the fill reaches a little past its words, to the row's edges.
      <button type="button" data-slot="setting-row" onClick={onClick} className={cn(ROW, "-mx-(--pad-xs) w-auto cursor-default rounded-md px-(--pad-xs) hover:bg-ink/6 active:bg-ink/9", FOCUS_RING_INSET)}>
        {words}
        <Icon name="chevron" className="size-4 text-ink-mute" />
      </button>
    )
  }
  return (
    <div data-slot="setting-row" className={ROW}>
      {words}
      {control}
    </div>
  )
}

export { SettingRow }
