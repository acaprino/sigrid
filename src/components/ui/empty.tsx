// SmoothUI (MIT) empty 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/empty.json)
// From SmoothUI we keep the structure (container, optional icon, title, sentence, action) and the `data-slot`s
// (`empty`, `empty-icon`, `empty-title`, `empty-description`, `empty-action`). Adapted: words only, no
// illustration by default (the icon stays optional and nobody passes it); `theme.css` tokens (`text-ink`,
// `text-ink-soft`, `bg-paper-2`) instead of `foreground`/`muted-foreground`; the title is a `<div>` and not an `<h3>`:
// empty states sit inside views that already have their own titles, and the title can be markup from the caller
// (the Stack accepts any `ReactNode`, even a `<p>`), which would not be valid inside an `<h3>` or a `<p>`.
// One need, one look: it says that there is nothing here. Something that failed (a view that could not load) is a
// `Note` with `tone="error"`, with «Retry» when it can be tried again.
// Spacing and size are chosen by whoever uses it with `className`/`titleClassName` (tailwind-merge). The title is 16px
// (the toolkit's title size, R7); the optional icon is a plain 16px muted icon, not a tile (R6, R7). No animation.
import type * as React from "react"
import { cn } from "../../lib/utils"

export type EmptyProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** The title of the empty state (text or markup). */
  title: React.ReactNode
  /** A sentence below the title. */
  description?: React.ReactNode
  /** An action below the text (a button). */
  action?: React.ReactNode
  /** An icon above the title (decorative, `aria-hidden`). */
  icon?: React.ReactNode
  /** Classes for the title, in place of the default ones where they overlap. */
  titleClassName?: string | undefined
}

/** The empty state of a view or a list, only for «nothing here»: a title, a sentence if needed and an action. A failure is a `Note` with `tone="error"`, never an empty state. */
function Empty({ action, className, description, icon, title, titleClassName, ...props }: EmptyProps) {
  return (
    <div data-slot="empty" className={cn("flex w-full flex-col items-center justify-center gap-2 text-center", className)} {...props}>
      {icon ? (
        <div aria-hidden="true" data-slot="empty-icon" className="mb-1 flex items-center justify-center text-ink-mute [&_svg]:size-4">
          {icon}
        </div>
      ) : null}
      <div data-slot="empty-title" className={cn("text-base font-medium text-ink", titleClassName)}>
        {title}
      </div>
      {description ? (
        <p data-slot="empty-description" className="max-w-sm text-sm text-ink-soft">
          {description}
        </p>
      ) : null}
      {action ? (
        <div data-slot="empty-action" className="mt-2">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export { Empty }
