// One row that opens in place: what most people do not need on most visits stays behind it, and the first view holds
// the rest (progressive disclosure). The row is named for what it holds («Add a coupon»; «More options» only for a
// mix). What is inside stays in the page while closed, so what was written there is kept, and the page does not move
// the reader anywhere: it grows under the row. Base UI's `Collapsible` gives the behaviour (a button with
// `aria-expanded` that names its panel); the form is the toolkit's: a quiet row with the chevron in the icon slot,
// 44px with a finger. Never inside another `Disclosure` that is itself inside one: two levels at most.
// Never put behind it what people need before they commit: a price, a required field, what a delete removes.
import * as React from "react"
import { Collapsible } from "@base-ui/react/collapsible"
import { Icon } from "../../icons"
import { cn, isEmptyNode } from "../../lib/utils"
import { FOCUS_RING } from "../../lib/focus"

export type DisclosureProps = {
  /** What the row holds, in the words people would look for («Add a coupon», «Advanced»). */
  label: string
  /** A fact about what is inside, at the end of the row while it tells something («3 set», «Off»). */
  summary?: React.ReactNode
  /** Open at first, for a row that keeps its own state. Default closed. */
  defaultOpen?: boolean | undefined
  /** Open or closed, when the app keeps it. */
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  disabled?: boolean | undefined
  className?: string | undefined
  /** What opens under the row. */
  children: React.ReactNode
}

function Disclosure({ label, summary, defaultOpen = false, open, onOpenChange, disabled, className, children }: DisclosureProps) {
  return (
    <Collapsible.Root
      data-slot="disclosure"
      defaultOpen={defaultOpen}
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange ? { onOpenChange: (next: boolean) => onOpenChange(next) } : {})}
      disabled={disabled}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <Collapsible.Trigger
        data-slot="disclosure-row"
        className={cn(
          "group/disclosure -mx-(--pad-xs) flex min-h-(--control-sm) items-center gap-2 self-start rounded-md px-(--pad-xs) text-start text-sm font-medium text-ink-soft pointer-coarse:min-h-11 hover:bg-ink/6 hover:text-ink disabled:pointer-events-none disabled:opacity-50",
          FOCUS_RING,
        )}
      >
        <span className="inline-flex shrink-0 group-data-panel-open/disclosure:rotate-90">
          <Icon name="chevron" />
        </span>
        <span className="min-w-0">{label}</span>
        {isEmptyNode(summary) ? null : (
          <span data-slot="disclosure-summary" className="ms-2 text-xs font-normal text-ink-mute tabular-nums">
            {summary}
          </span>
        )}
      </Collapsible.Trigger>
      <Collapsible.Panel data-slot="disclosure-panel" keepMounted className="pt-2 data-closed:hidden">
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

export { Disclosure }
