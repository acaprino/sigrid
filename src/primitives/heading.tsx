// The title of a part of a screen, at the size DESIGN.md gives it (Typography): a page 24px, a section 20px, a card 18px,
// a small title 16px (a dialog, a message in a card), all in the ink and in the titles' font (`font-heading`: the
// interface font at 600 unless the app names another with `applyHeadingFont`); or the small label over a group (12px,
// medium, muted, always in the interface font: «Now», «In the stack»). The level of the element is the screen's outline, chosen apart from the size.
// An icon before it (R6) sits in a muted 16px slot. It takes no class or style: an app that titles a part with it
// writes none (the owner's rule of 2026-11-23). With `truncate` it is one line, cut where its place ends.
import type * as React from "react"
import { cn } from "../lib/utils"
import type { LayoutAttributes } from "./layout"

const SIZE = {
  page: "text-2xl font-heading text-ink",
  section: "text-xl font-heading text-ink",
  card: "text-lg font-heading text-ink",
  small: "text-base font-heading text-ink",
  label: "text-2xs font-medium text-ink-mute",
} as const

/** The level each size takes when none is given. */
const LEVEL = { page: 1, section: 2, card: 3, small: 3, label: 3 } as const

export type HeadingProps = Omit<LayoutAttributes, "title"> & {
  /** `page` 24px, `section` 20px (the default), `card` 18px, `small` 16px; `label` the small muted label over a group. */
  size?: keyof typeof SIZE | undefined
  /** The level of the heading in the screen's outline (1 to 6). Absent: 1 for a page, 2 for a section, 3 for the others. */
  level?: 1 | 2 | 3 | 4 | 5 | 6 | undefined
  /** An icon before the words (an `Icon`), muted. */
  icon?: React.ReactNode
  /** One line, cut with an ellipsis where its place ends (the name of a thing, as long as the user made it); the whole title is its hint when it is plain words. */
  truncate?: boolean | undefined
  children?: React.ReactNode
}

/** A title of a page, a section, a card or a group: one size for each, from the type scale. */
function Heading({ size = "section", level, icon, truncate = false, children, ...props }: HeadingProps) {
  const Tag = `h${level ?? LEVEL[size]}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  // A class or a style passed in spite of the types is dropped.
  const { className: _class, style: _style, ...rest } = props as HeadingProps & { className?: unknown; style?: unknown }
  return (
    <Tag
      {...rest}
      title={truncate && typeof children === "string" ? children : undefined}
      data-slot="heading"
      data-size={size}
      className={cn("min-w-0", SIZE[size], icon ? "flex items-center gap-2" : truncate ? "truncate" : undefined)}
    >
      {icon ? (
        <span aria-hidden="true" data-slot="heading-icon" className="inline-flex size-4 shrink-0 items-center justify-center text-ink-mute [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      {icon && truncate ? <span className="min-w-0 truncate">{children}</span> : children}
    </Tag>
  )
}

export { Heading }
