// SmoothUI (MIT) smooth-button 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/smooth-button.json)
// Park UI (MIT) button 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/button.ts)
// From SmoothButton we keep: the plain `<button>` with `type="button"` by default and `asChild` without Radix's Slot
// (here with Base UI's `useRender`, which merges classes, styles, handlers and ref like the Slot). Our variant and size
// names stay (the ones the package uses).
// From Park's `button` recipe comes the form: l2 corners, and its variants and sizes under our names. The label is
// medium (Park's is semibold: lighter here).
// Variants: `default` is Park's solid, `secondary` its subtle in the neutral gray, `outline` its outline (with the 3:1
// control border), `ghost` its plain, `destructive` its subtle in red; `link` is ours. A neutral subtle chip is
// `QUIET_CHIP` below, for an app's chips: it is not a public variant.
// Sizes: `default`, `sm` and `xs` are 36, 32 and 28px at normal density, one 4px step under Park's md, sm and xs (40, 36
// and 32px, which is the large density); `lg` is the default height with a 16px label; the `icon-*` sizes are the same
// heights, square. Colors are the theme engine's
// tokens, not Park's palettes. Focus: the toolkit's ring (`lib/focus.ts`, R8).
// The variant `secondary` is Park's subtle in the neutral gray (R4: no border and shadow together).
// Motion, only with `animated` true and without prefers-reduced-motion: the button goes down a little while pressed
// (`tapScale`) and, if asked, grows under the pointer (`hoverScale`). The gestures are attached to the `<button>` that is
// already there (`pressable` in `motion-impl`), so the element is the same with animations on or off and nothing
// remounts when the Motion chunk arrives. With `animated` false the DOM is the same as before.
// Park's `loading` state, without its spinner (the owner's decision of 2026-11-20: no looping animation, as the
// attachment viewer): a busy button keeps its size and its place, is `aria-busy` and `aria-disabled` (it keeps focus,
// unlike `disabled`), ignores clicks and the pointer, and may show the caller's `loadingText` ("Saving…") in place of
// its label. With `loadingText` the label and the loading text share one grid cell (`SwapLabel`), so the width is the
// wider of the two before, during and after the wait.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "../../lib/utils"
import { FOCUS_RING } from "../../lib/focus"
import { useMotion } from "../../internal/motion"
import { useMergedRef } from "../../lib/refs"
import { SwapLabel } from "../../internal/swap-label"

const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap pointer-coarse:min-h-11 pointer-coarse:min-w-11 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    FOCUS_RING
  ),
  {
    variants: {
      variant: {
        // Park solid.
        default: "bg-primary text-primary-foreground hover:bg-accent-hover",
        // Park solid, in red: a destructive action is a filled red button (the owner's design of 2026-11-22).
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Park outline: a border, no fill; a quiet fill under the pointer. The border is the light divider colour, as
        // on fields and selects (the owner's design of 2026-11-22): the label says it is a button, not the border.
        outline: "border border-line text-ink hover:bg-ink/4 active:bg-ink/6",
        // Park subtle, in the neutral gray: a quiet fill, no border and no shadow (R4: a control has a border or a
        // shadow, never both; Park's surface added both).
        secondary: "bg-ink/6 text-ink hover:bg-ink/9 active:bg-ink/12",
        // Park plain: text only; a quiet fill under the pointer. A step quieter than Park's (soft ink): here it
        // is the weakest action of a row, next to a solid or a surface one.
        ghost: "text-ink-soft hover:bg-ink/6 hover:text-ink active:bg-ink/9",
        // A link is underlined at rest, as a link in a text is (`md-link`): without the line it reads as plain text
        // until the pointer finds it. The line is muted, and takes the text colour under the pointer.
        link: "text-ink underline decoration-ink-mute underline-offset-2 hover:decoration-current",
      },
      size: {
        // A control is 36px tall (44px with a finger, from the base classes). The heights and the side padding are the
        // density tokens (`src/density.ts`): 36/32/28px and 12/10/8px at `normal`.
        default: "h-(--control-md) min-w-(--control-md) px-(--pad-md)",
        // Park xs and sm: only inside a dense row.
        xs: "h-(--control-xs) min-w-(--control-xs) px-(--pad-xs)",
        sm: "h-(--control-sm) min-w-(--control-sm) px-(--pad-sm)",
        // R7 caps a control at the default height: `lg` keeps its name for compatibility and differs from `default` only by its 16px label.
        lg: "h-(--control-md) min-w-(--control-md) px-4 text-base",
        icon: "size-(--control-md)",
        "icon-xs": "size-(--control-xs)",
        "icon-sm": "size-(--control-sm)",
        // As `icon` (R7): kept for compatibility.
        "icon-lg": "size-(--control-md)",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the child in place of the `<button>` (for a link that looks like a button). */
    asChild?: boolean
    /** The button goes down a little while pressed (off by default, never with prefers-reduced-motion). */
    animated?: boolean | undefined
    /** Scale under the pointer, with `animated`. Default 1: still. */
    hoverScale?: number | undefined
    /** Override the default press scale (0.96 with at most 2px of travel per edge). */
    tapScale?: number | undefined
    /**
     * Waiting for the result of its action: the button keeps its size, is `aria-busy="true"` and `aria-disabled="true"`,
     * keeps focus and ignores clicks. No spinner and no looping animation.
     */
    loading?: boolean | undefined
    /**
     * The label while `loading` ("Saving…"), written by the caller. The button reserves the room of the wider of the two
     * texts, so it does not change size when the wait starts or ends. Absent: the label stays.
     */
    loadingText?: React.ReactNode
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  animated,
  hoverScale,
  tapScale,
  loading = false,
  loadingText,
  type = "button",
  ref: outer,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const motion = useMotion(animated)
  const [el, setEl] = React.useState<HTMLElement | null>(null)
  // One ref for the caller and for the gestures; without `animated` the state is never set and nothing re-renders.
  const gestures = React.useCallback(
    (node: HTMLButtonElement | null) => {
      if (motion) setEl(node)
    },
    [motion]
  )
  const ref = useMergedRef(gestures, outer)
  React.useEffect(() => {
    if (!motion || !el) return
    return motion.pressable(el, { ...(hoverScale === undefined ? {} : { hoverScale }), ...(tapScale === undefined ? {} : { tapScale }) })
  }, [motion, el, hoverScale, tapScale])
  const own = {
    "data-slot": "button",
    "data-variant": variant,
    "data-size": size,
    className: cn(buttonVariants({ variant, size, className }), loading && BUSY),
  }
  // While busy a click (or the Enter and Space that become one, or a form's implicit submit) does nothing.
  const busy = loading
    ? {
        "aria-busy": true as const,
        "aria-disabled": true as const,
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
      }
    : onClick
      ? { onClick }
      : {}
  // With `asChild` the child takes classes, attributes and handlers (its own win, handlers add up, the ref is merged);
  // without a child element nothing is rendered, like the Slot.
  const child = asChild && React.isValidElement(children) ? children : null
  const slotted = useRender({ render: child ?? undefined, props: { ...own, ...props, ...busy }, ref, enabled: child !== null })
  if (asChild) return slotted

  return (
    <button ref={ref} {...own} type={type} {...props} {...busy}>
      {loadingText === undefined ? children : <SwapLabel slot="button-label" first={children} second={loadingText} showSecond={loading} />}
    </button>
  )
}

/** A busy button: no pointer (no hover, no press, no click), the label at full contrast. */
const BUSY = "pointer-events-none"

/**
 * The neutral quiet chip: Park's subtle variant for chips (a row of quick choices in an app), on top of the `ghost`
 * variant. R2 keeps the accent for the primary action, the selection, today and focus: chips are neutral, so the fill is
 * the subtle fill (the ink at 6%) with the ink as text; the pressed chip is the caller's selection tint.
 */
const QUIET_CHIP = "bg-ink/6 font-semibold text-ink hover:bg-ink/9 hover:text-ink active:bg-ink/12"

/**
 * A quiet icon button that is the toolkit's own chrome, not an action of the screen (the close of a window, the button
 * that empties a field, the handle that drags a row): a `ghost` icon button, one step quieter at rest (the muted ink),
 * with the ink and the quiet fill under the pointer and while pressed, as every ghost button. Its class, on top of
 * `variant="ghost"` and an `icon-*` size.
 */
const QUIET_ICON = "text-ink-mute"

export { Button, buttonVariants, QUIET_CHIP, QUIET_ICON }
