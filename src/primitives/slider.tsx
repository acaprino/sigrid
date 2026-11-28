// Park UI (MIT) slider 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/slider.ts)
// From Park's `slider` recipe comes the form (its md size, its outline variant): a round 8px track, the part up to the
// value filled, and a round 20px thumb with a 2px border, centred on the track. Ours: the track is the `input` token
// (3:1 on every background, WCAG 1.4.11; Park's is its hairline border colour), the filled part and the thumb's
// border are the ink (the accent is kept for the primary action, R2), the thumb is the paper with no shadow (R4: a
// bordered control has no shadow). The thumb's area is 44px with a coarse pointer.
// Behaviour: Ark UI's Slider, one thumb (`role="slider"`): Left and Right move by `step`, PageUp and PageDown by ten
// steps, Home and End go to the ends; Up and Down grow and shrink it, as the ARIA pattern has it. Written from the right
// (the direction Ark is given, `DirectionProvider`) the slider fills from the right and Left grows it. No animation: the
// thumb follows the pointer.
import * as React from "react"
import { Slider as SliderPrimitive } from "@ark-ui/react/slider"
import { cn } from "../lib/utils"
import { resendKey } from "../lib/keys"
import { FOCUS_RING } from "../lib/focus"

export type SliderProps = {
  value: number
  /** Called with each value while the thumb moves. */
  onValueChange: (value: number) => void
  min: number
  max: number
  /** The distance between two values. Default 1. */
  step?: number | undefined
  /** The name of the slider for screen readers. */
  "aria-label": string
  disabled?: boolean | undefined
  className?: string | undefined
}

/**
 * Up and Down grow and shrink the value: sent again from the thumb as the arrow Ark knows for that, which is Left for
 * growing where the slider is written from the right (Ark reads its arrows in its own `dir`, the one on the thumb).
 */
function vertical(event: React.KeyboardEvent<HTMLDivElement>) {
  const rtl = event.currentTarget.dir === "rtl"
  const key = event.key === "ArrowUp" ? (rtl ? "ArrowLeft" : "ArrowRight") : event.key === "ArrowDown" ? (rtl ? "ArrowRight" : "ArrowLeft") : undefined
  if (!key) return
  event.preventDefault()
  event.stopPropagation()
  resendKey(event.currentTarget, key, event)
}

function Slider({ value, onValueChange, min, max, step = 1, disabled, className, ...aria }: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={[value]}
      min={min}
      max={max}
      step={step}
      {...(disabled !== undefined ? { disabled } : {})}
      onValueChange={(details) => {
        const next = details.value[0]
        if (next !== undefined && next !== value) onValueChange(next)
      }}
      className={cn("relative isolate flex w-full touch-none flex-col data-[disabled]:opacity-50", className)}
    >
      {/* Ark names the thumb by its label part (`aria-labelledby`): the name is that part, kept out of sight. */}
      <SliderPrimitive.Label className="sr-only">{aria["aria-label"]}</SliderPrimitive.Label>
      <SliderPrimitive.Control data-slot="slider-control" className="relative inline-flex min-h-5 w-full items-center pointer-coarse:min-h-11">
        <SliderPrimitive.Track data-slot="slider-track" className="h-2 flex-1 overflow-hidden rounded-full bg-input">
          <SliderPrimitive.Range data-slot="slider-range" className="h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          index={0}
          data-slot="slider-thumb"
          onKeyDownCapture={vertical}
          className={cn("top-1/2 z-2 size-5 -translate-y-1/2 rounded-full border-2 border-primary bg-paper hover:border-accent-hover hover:bg-accent-soft after:absolute after:-inset-1 after:content-[''] pointer-coarse:after:-inset-3", FOCUS_RING)}
        >
          <SliderPrimitive.HiddenInput />
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
