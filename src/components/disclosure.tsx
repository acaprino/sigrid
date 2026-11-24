// One row that opens in place: what most people do not need on most visits stays behind it, and the first view holds
// the rest (progressive disclosure). The row is named for what it holds («Add a coupon»; «More options» only for a
// mix). What is inside stays in the page while closed, so what was written there is kept, and the page does not move
// the reader anywhere: it grows under the row. Base UI's `Collapsible` gives the behaviour (a button with
// `aria-expanded` that names its panel); the form is the toolkit's: a quiet row with the chevron in the icon slot,
// 44px with a finger. Never inside another `Disclosure` that is itself inside one: two levels at most.
// Never put behind it what people need before they commit: a price, a required field, what a delete removes.
// The arrow is the one of every row that opens (a branch of the tree, a group of the sidebar): 14px in a 16px slot,
// a quarter turn when open. With motion on it turns (`Turn`) when the reader pressed the row, and only then: a row
// the app opens or closes by itself (a reasoning that ends) changes at once, since nothing moves without a gesture.
// The panel glides open and shut the same way (`internal/reveal.ts`, theme.css).
import * as React from "react"
import { Collapsible } from "@base-ui/react/collapsible"
import { Icon } from "../icons"
import { cn, isEmptyNode } from "../lib/utils"
import { FOCUS_RING } from "../lib/focus"
import { useMotion } from "../internal/motion"
import { useReveal } from "../internal/reveal"

export type DisclosureProps = {
  /** What the row holds, in the words people would look for («Add a coupon», «Advanced»). */
  label: React.ReactNode
  /** A fact about what is inside, at the end of the row while it tells something («3 set», «Off»). */
  summary?: React.ReactNode
  /** Open at first, for a row that keeps its own state. Default closed. */
  defaultOpen?: boolean | undefined
  /** Open or closed, when the app keeps it. */
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  disabled?: boolean | undefined
  /** The arrow turns when the reader opens or closes the row. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  className?: string | undefined
  /** What opens under the row. */
  children: React.ReactNode
}

/** The row of everything that opens in place: quiet, the arrow's slot at the start, 44px with a finger. */
const DISCLOSURE_ROW = "flex min-h-(--control-sm) min-w-0 items-center gap-2 text-start text-sm font-medium text-ink-soft pointer-coarse:min-h-11"
/** The 16px slot of the arrow; a row that does not open keeps it, empty, so the rows line up. */
const DISCLOSURE_SLOT = "inline-flex size-4 shrink-0 items-center justify-center"

function Disclosure({ label, summary, defaultOpen = false, open, onOpenChange, disabled, animated, className, children }: DisclosureProps) {
  const motion = useMotion(animated)
  const [own, setOwn] = React.useState(defaultOpen)
  const isOpen = open ?? own
  // Whether the last change was the reader's press: a change that was not is drawn at once (a new arrow, with no
  // turn; a panel that does not glide).
  const reveal = useReveal(isOpen)
  const arrow = <Icon name="chevron" className="size-3.5" />
  return (
    <Collapsible.Root
      data-slot="disclosure"
      open={isOpen}
      onOpenChange={(next: boolean) => {
        reveal.pressed()
        setOwn(next)
        onOpenChange?.(next)
      }}
      disabled={disabled}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <Collapsible.Trigger
        data-slot="disclosure-row"
        className={cn(DISCLOSURE_ROW, "-mx-(--pad-xs) max-w-full self-start rounded-md px-(--pad-xs) hover:bg-ink/6 hover:text-ink active:bg-ink/9 disabled:pointer-events-none disabled:opacity-50", FOCUS_RING)}
      >
        <span aria-hidden="true" data-slot="disclosure-chevron" className={DISCLOSURE_SLOT}>
          {motion ? (
            <motion.Turn key={reveal.changes} open={isOpen}>
              {arrow}
            </motion.Turn>
          ) : (
            <span className={cn("inline-flex", isOpen && "rotate-90")}>{arrow}</span>
          )}
        </span>
        <span data-slot="disclosure-label" className="flex min-w-0 items-center gap-2">
          {label}
        </span>
        {isEmptyNode(summary) ? null : (
          <span data-slot="disclosure-summary" className="ms-2 min-w-0 truncate text-2xs font-normal text-ink-mute tabular-nums">
            {summary}
          </span>
        )}
      </Collapsible.Trigger>
      <Collapsible.Panel data-slot="disclosure-panel" keepMounted {...reveal.attrs} className="pt-2 data-closed:hidden">
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

export { DISCLOSURE_ROW, DISCLOSURE_SLOT, Disclosure }
