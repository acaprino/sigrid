// SmoothUI (MIT) tooltip 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/tooltip.json)
// Park UI (MIT) tooltip 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tooltip.ts)
// From Park's `tooltip` recipe comes the form: a solid ink card with l2 corners, the sm elevation, 12px semibold text,
// 8px by 6px of padding.
// From SmoothUI we keep the primitive (Base UI's `Tooltip`: Root, Trigger with `render`, Portal, Positioner, Popup) and the
// shape of the card (ink on paper, small text). Adapted to icon-only buttons: the text is the button's accessible
// name (`label`, the same as its `aria-label`), not free content; no Provider (each
// hint has its own delay, 500 ms), no controlled state. Removed: SmoothUI's CSS transitions
// (the opacity and transform transition with the entrance scale): with `animated` true (off by default, never with
// prefers-reduced-motion) the card fades in a few pixels from its button in 100 ms (`enterTooltip` in `motion-impl`).
// Base UI places and labels it.
// The hint does not capture the pointer (`pointer-events-none`, `disableHoverablePopup`), closes on click on the
// button and with Esc, and sits below sheets and windows (`z-[45]`: above the drawer, z-40, below the sheets, z-50). The accessible
// name stays only the `aria-label`: the card is `aria-hidden` (Base UI does not add `aria-describedby`), so a
// screen reader does not hear it twice.
import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "../../lib/utils"
import { useEntrance } from "../../internal/motion"
import { usePortalContainer } from "../PortalContainer"

/** The delay before the hint appears, on pointer hover. On focus (Tab) it appears right away, as in Base UI. */
export const TOOLTIP_DELAY_MS = 500

export type TooltipProps = {
  /** The hint text: the button's accessible name, in English. */
  label: string
  /** The button (a single element): it receives the hint's handlers via Base UI's `render`, without an extra node. */
  children: React.ReactElement
  /** Where it sits, if there is room. Default below. */
  side?: "top" | "right" | "bottom" | "left" | undefined
  /** Distance from the button in px. */
  sideOffset?: number | undefined
  /** Hover delay in ms. Default 500. */
  delay?: number | undefined
  /** The card fades in quickly (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  className?: string | undefined
}

/**
 * The hint of an icon-only button: it repeats its name on pointer hover and on focus.
 * The button stays the same as before (same `aria-label`, same Tab), without `title`.
 */
function Tooltip({ label, children, side = "bottom", sideOffset = 6, delay = TOOLTIP_DELAY_MS, animated, className }: TooltipProps) {
  const container = usePortalContainer()
  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterTooltip(el))
  return (
    <TooltipPrimitive.Root disableHoverablePopup>
      <TooltipPrimitive.Trigger delay={delay} render={children} />
      <TooltipPrimitive.Portal container={container}>
        <TooltipPrimitive.Positioner
          data-slot="tooltip-positioner"
          className="pointer-events-none z-[45] outline-none"
          side={side}
          sideOffset={sideOffset}
          collisionPadding={8}
        >
          <TooltipPrimitive.Popup
            data-slot="tooltip-content"
            aria-hidden="true"
            ref={enter}
            className={cn(
              "pointer-events-none max-w-80 rounded-md bg-ink px-2 py-1.5 text-2xs font-semibold text-paper shadow-sm outline-none select-none",
              className
            )}
          >
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip }
