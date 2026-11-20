// SmoothUI (MIT) badge 4.0.0 — adapted for @acaprino/toolkit (https://smoothui.dev/r/base-nova/badge.json)
// Park UI (MIT) badge 102769c — recipe translated to Tailwind for @acaprino/toolkit (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/badge.ts)
// From Park's `badge` recipe comes the form (its md size: 20px tall, 12px medium text, 8px of side padding, l2 corners,
// tabular numbers) and the variants under our names: `default` is its solid, `secondary` its subtle, `outline` its
// outline, all in the neutral gray (R2: labels never take the accent; R5: a badge is for a label, never a count).
// Icons are 14px (R7).
// From SmoothUI's Badge we keep the plain `<span>` with `data-slot` and `data-variant` and the 12 px icons. Our variants stay (with the tokens from `theme.css`, not SmoothUI's colors) and so does `asChild`, here with
// Base UI's `useRender` instead of Radix's Slot. Removed: `size`, the success/warning variants and `StatusDot` with its
// looping pulse (nobody uses them; no loops, ADR-0009). The badge does not animate.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "../../lib/utils"
import { FOCUS_RING } from "../../lib/focus"

const badgeVariants = cva(
  cn(
    "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 text-2xs leading-none font-medium whitespace-nowrap tabular-nums motion-safe:transition-[color,box-shadow] aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3.5",
    FOCUS_RING
  ),
  {
    variants: {
      variant: {
        // Park's solid, in the neutral gray: the ink as a fill (R2: a label is never in the accent).
        default: "bg-ink text-paper [a&]:hover:bg-ink-soft",
        secondary:
          "bg-ink/6 text-ink [a&]:hover:bg-ink/9",
        destructive:
          "bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-paper-2 [a&]:hover:text-ink",
        ghost: "[a&]:hover:bg-paper-2 [a&]:hover:text-ink",
        link: "text-ink underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const own = {
    "data-slot": "badge",
    "data-variant": variant,
    className: cn(badgeVariants({ variant }), className),
  }
  // With `asChild` the child takes classes, attributes and handlers (its own win, handlers add up, the ref is merged);
  // without a child element nothing is rendered, like the Slot.
  const child = asChild && React.isValidElement(children) ? children : null
  const slotted = useRender({ render: child ?? undefined, props: { ...own, ...props }, enabled: child !== null })
  if (asChild) return slotted

  return (
    <span {...own} {...props}>
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
