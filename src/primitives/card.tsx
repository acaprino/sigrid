// A surface that holds a group of content that stands apart from the page: the one thing to do now, the item being
// sorted, a card of a board, a summary beside a message. Two forms (R4): `raised`, the raised surface with the smallest
// shadow and no border (a card that can be picked up, a board's card); `quiet`, the quiet fill of the page with no
// shadow (a lane, a group of rows, a note set apart). The large corner, as every surface that holds controls.
// Not every group is a card («Lines and space, not boxes», docs/design-laws.md): a group is told first by the space
// around it (`Column`, `Section`), then by a line; a card is for the few groups that are a thing of their own.
// Its inside is a pile (`Column`'s steps): what is in it is laid out with no class of the app's own, and a class or a
// style passed in spite of the types never reaches the page.
import type * as React from "react"
import { cn } from "../lib/utils"
import type { LayoutAttributes, Space } from "./layout"

const GAP: Record<Space, string> = { xs: "gap-1", sm: "gap-2", md: "gap-3", lg: "gap-4", xl: "gap-6", "2xl": "gap-8", "3xl": "gap-12", "4xl": "gap-16" }
const PAD: Record<Space, string> = { xs: "p-1", sm: "p-2", md: "p-3", lg: "p-4", xl: "p-6", "2xl": "p-8", "3xl": "p-12", "4xl": "p-16" }
const LOOK = { raised: "bg-raised shadow-xs", quiet: "bg-paper-2" } as const

export type CardProps = LayoutAttributes & {
  /** `raised` (the default): the raised surface and the smallest shadow; `quiet`: the quiet fill, no shadow. Never a border. */
  variant?: keyof typeof LOOK | undefined
  /** The space inside its edges (default `lg`, 16px). */
  pad?: Space | undefined
  /** The space between its parts (default `md`, 12px). */
  gap?: Space | undefined
  /** The element it is: a `div` (the default), a section (name it with `aria-label`), an article, a list item. */
  as?: "div" | "section" | "article" | "li" | undefined
  children?: React.ReactNode
}

/** A group of content on a surface of its own: raised with a shadow, or on the quiet fill. */
function Card({ variant = "raised", pad = "lg", gap = "md", as = "div", children, ...props }: CardProps) {
  const Tag = as
  const { className: _class, style: _style, ...rest } = props as CardProps & { className?: unknown; style?: unknown }
  return (
    <Tag {...rest} data-slot="card" data-variant={variant} className={cn("flex min-w-0 flex-col rounded-lg", LOOK[variant], PAD[pad], GAP[gap])}>
      {children}
    </Tag>
  )
}

export { Card }
