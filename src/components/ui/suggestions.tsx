// A row of ready-made requests, for a conversation that has not started or an answer that can be followed up: quiet
// chips (the neutral fill, never the accent: R2), which wrap to more lines when the row is short. Choosing one tells
// the app, which usually puts its text in the `PromptInput` for the user to send or change, rather than sending it at
// once: a suggestion is a start, not a commitment.
import type * as React from "react"
import { cn } from "../../lib/utils"
import { Icon, type IconName } from "../../icons"
import { useWords } from "../../words"
import { Button, QUIET_CHIP } from "./button"

/** One ready-made request. */
export type Suggestion = {
  id: string
  /** What the chip says, and usually the text put in the field. */
  label: string
  /** An icon that tells what kind of request it is; none for most. */
  icon?: IconName | undefined
}

export type SuggestionsProps = {
  items: readonly Suggestion[]
  onSelect: (item: Suggestion) => void
  /** The name of the row for screen readers. Absent: the toolkit's word («Suggestions»). */
  label?: string | undefined
  disabled?: boolean | undefined
  className?: string | undefined
}

/** A row of quiet chips, one per ready-made request. An empty list shows nothing. */
function Suggestions({ items, onSelect, label, disabled, className }: SuggestionsProps): React.ReactNode {
  const words = useWords().chat
  if (items.length === 0) return null
  return (
    <div data-slot="suggestions" role="group" aria-label={label ?? words.suggestions} className={cn("flex min-w-0 flex-wrap gap-2", className)}>
      {items.map((item) => (
        <Button key={item.id} variant="ghost" size="sm" disabled={disabled} className={cn(QUIET_CHIP, "max-w-full")} onClick={() => onSelect(item)}>
          {item.icon ? <Icon name={item.icon} /> : null}
          <span className="truncate">{item.label}</span>
        </Button>
      ))}
    </div>
  )
}

export { Suggestions }
