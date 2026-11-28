// Park UI (MIT) tooltip 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tooltip.ts)
// From Park's `tooltip` recipe comes the form: a solid ink card with l2 corners, the sm elevation, 12px semibold text,
// 8px by 6px of padding.
// Behaviour: Ark UI's Tooltip (`@ark-ui/react/tooltip`: Root, Trigger with `asChild`, Positioner, Content). Adapted to
// icon-only buttons: the text is the button's accessible name (`label`, the same as its `aria-label`), not free
// content; each hint has its own hover delay (500 ms). With `animated` true (off by default, never with
// prefers-reduced-motion) the card fades in a few pixels from its button in 100 ms (`enterTooltip` in `motion-impl`).
// The hint does not capture the pointer (`pointer-events-none`, `interactive={false}`), closes on click on the button
// and with Esc, and sits below sheets and windows (`z-[45]`: above the drawer, z-40, below the sheets, z-50). The
// accessible name stays only the `aria-label`: the card is `aria-hidden`, so a screen reader does not hear it twice.
import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@ark-ui/react/tooltip"
import { cn } from "../lib/utils"
import { KEY_CAP, KEY_CAP_IN_TEXT } from "./kbd"
import { useEntrance } from "../internal/motion"
import { OverlayPortal } from "../internal/portal"

/** The delay before the hint appears, on pointer hover. On focus (Tab) it appears right away. */
export const TOOLTIP_DELAY_MS = 500

export type TooltipProps = {
  /** The hint text: the button's accessible name, in English. */
  label: string
  /** The key that does the same («Ctrl K»): plain text after the name, never a boxed key (R5). */
  shortcut?: string | undefined
  /** The button (a single element): it receives the hint's handlers via Ark's `asChild`, without an extra node. */
  children: React.ReactElement
  /** Where it sits, if there is room. Default below. */
  side?: "top" | "right" | "bottom" | "left" | undefined
  /** Distance from the button in px. */
  sideOffset?: number | undefined
  /** Hover delay in ms. Default 500. */
  delay?: number | undefined
  /** The card fades in quickly (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  /**
   * The button's id, when another part owns the same button (the trigger of a menu or a popover): both find it by
   * this id. Without it each would write its own id on the button and one of them would lose it. A menu's or a
   * popover's `hint` passes it; an app does not need it.
   */
  triggerId?: string | undefined
  className?: string | undefined
}

/**
 * The hint of an icon-only button: it repeats its name on pointer hover and on focus.
 * The button stays the same as before (same `aria-label`, same Tab), without `title`.
 */
function Tooltip({ label, shortcut, children, side = "bottom", sideOffset = 6, delay = TOOLTIP_DELAY_MS, animated, triggerId, className }: TooltipProps) {
  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterTooltip(el))
  const positioning = React.useMemo(
    () => ({ placement: side, gutter: sideOffset, overflowPadding: 8 }),
    [side, sideOffset],
  )
  return (
    <TooltipPrimitive.Root
      {...(triggerId !== undefined ? { ids: { trigger: triggerId } } : {})}
      openDelay={delay}
      closeDelay={0}
      interactive={false}
      closeOnClick
      closeOnEscape
      lazyMount
      unmountOnExit
      positioning={positioning}
    >
      <TooltipPrimitive.Trigger asChild aria-describedby={undefined}>
        {children}
      </TooltipPrimitive.Trigger>
      <OverlayPortal>
        <TooltipPrimitive.Positioner data-slot="tooltip-positioner" className="pointer-events-none z-[45] outline-none">
          <TooltipPrimitive.Content
            data-slot="tooltip-content"
            aria-hidden="true"
            ref={enter}
            className={cn(
              "pointer-events-none max-w-80 rounded-md bg-ink px-2 py-1.5 text-2xs font-semibold text-paper shadow-sm outline-none select-none",
              className,
            )}
          >
            {label}
            {shortcut ? (
              <span data-slot="tooltip-shortcut" className={cn("ms-2 font-medium opacity-80", KEY_CAP, KEY_CAP_IN_TEXT)}>
                {shortcut}
              </span>
            ) : null}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Positioner>
      </OverlayPortal>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip }
