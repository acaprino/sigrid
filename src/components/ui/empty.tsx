// SmoothUI (MIT) empty 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/empty.json)
// From SmoothUI we keep the structure (container, optional icon, title, sentence, action) and the `data-slot`s
// (`empty`, `empty-icon`, `empty-title`, `empty-description`, `empty-action`). With `fill` it is the whole of a view
// that has nothing to show: as tall as its region, centred in it, with a page's margins, so an app writes no class for it. Adapted: words only, no
// illustration by default (the icon stays optional and nobody passes it); `theme.css` tokens (`text-ink`,
// `text-ink-soft`, `bg-paper-2`) instead of `foreground`/`muted-foreground`; the title is a `<div>` and not an `<h3>`:
// empty states sit inside views that already have their own titles, and the title can be markup from the caller
// (the Stack accepts any `ReactNode`, even a `<p>`), which would not be valid inside an `<h3>` or a `<p>`.
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
  /** The whole of a view: as tall as the region it is in, centred in it, with the margins of a page (24px). */
  fill?: boolean | undefined
}

/**
 * The empty state of a view or a list: a title, a sentence if needed and an action. Also the end of a task of several
 * steps: the title says what happened with its particulars («240 € sent to Sam Lee»), the sentence what happens next,
 * the action moves on. A task of several steps never ends on a notice alone.
 */
function Empty({ action, className, description, icon, title, titleClassName, fill = false, ...props }: EmptyProps) {
  return (
    <div data-slot="empty" data-fill={fill || undefined} className={cn("flex w-full flex-col items-center justify-center gap-2 text-center", fill && "h-full p-6", className)} {...props}>
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
