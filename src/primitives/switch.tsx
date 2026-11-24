// Park UI (MIT) switch 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/switch.ts)
// From Park's `switch` recipe comes the form (its md size, its solid variant): a round 40x20px track and a round thumb
// of 16px (Park's 20px thumb at scale 0.8), 2px from the edge, that sits at the start when off and at the end when on.
// Ours: the track at rest is the `input` token (3:1 on every background, WCAG 1.4.11; Park's is its subtle gray) and
// the track when on is the ink, as the checkbox's fill: the accent is kept for the primary action (R2). The thumb is
// the paper in both states. No shadow on the thumb (R4: the track is a fill, the thumb a flat dot). The hit area grows
// with a pseudo-element, as the checkbox's: 28px on every pointer, 44px on a coarse one.
// Behaviour: Ark UI's Switch (a hidden checkbox with `role="switch"` inside a `<label>`; Space toggles). Without
// `animated` the thumb changes place at once; with it (or under a `MotionProvider`) it slides in 100 ms, never with
// `prefers-reduced-motion`.
import * as React from "react"
import { Switch as SwitchPrimitive } from "@ark-ui/react/switch"
import { cn } from "../lib/utils"
import { useMotionAllowed } from "../internal/motion"

export type SwitchProps = {
  /** On (controlled). */
  checked?: boolean | undefined
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean | undefined
  /** Called with the new state when the user turns it on or off. */
  onCheckedChange?: ((checked: boolean) => void) | undefined
  disabled?: boolean | undefined
  invalid?: boolean | undefined
  required?: boolean | undefined
  name?: string | undefined
  /** The id of the control itself, for a `<label htmlFor>` elsewhere. */
  id?: string | undefined
  /** The name for screen readers when there is no visible label. */
  "aria-label"?: string | undefined
  "aria-describedby"?: string | undefined
  /** The visible label, after the control: a click on it toggles too. */
  children?: React.ReactNode
  className?: string | undefined
  /** The thumb slides to its new place (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

function Switch({ checked, defaultChecked, onCheckedChange, disabled, invalid, required, name, id, children, className, animated, ...aria }: SwitchProps) {
  // The thumb moves with CSS alone: whether it may is all that is asked, and the Motion chunk is not loaded for it.
  const moving = useMotionAllowed(animated)
  // Without a visible label Ark still points the input at its label part (`aria-labelledby`), which is not on the page:
  // the pointer is taken off, and the name is the caller's `aria-label` or the `<label htmlFor>` elsewhere.
  const input = React.useRef<HTMLInputElement>(null)
  React.useLayoutEffect(() => {
    if (children == null) input.current?.removeAttribute("aria-labelledby")
  })
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn("relative inline-flex items-center gap-3 align-middle data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50", className)}
      {...(checked !== undefined ? { checked } : {})}
      {...(defaultChecked !== undefined ? { defaultChecked } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      {...(invalid !== undefined ? { invalid } : {})}
      {...(required !== undefined ? { required } : {})}
      {...(name !== undefined ? { name } : {})}
      {...(id !== undefined ? { ids: { hiddenInput: id } } : {})}
      onCheckedChange={(details) => onCheckedChange?.(details.checked)}
    >
      {/* Ark leaves the input a plain checkbox: the role says what it is, as WAI-ARIA asks of an on/off control. */}
      <SwitchPrimitive.HiddenInput ref={input} role="switch" {...aria} />
      <SwitchPrimitive.Control
        data-slot="switch-control"
        className="relative inline-flex h-5 w-10 shrink-0 items-center rounded-full bg-input not-data-disabled:data-[state=unchecked]:hover:bg-ink-mute not-data-disabled:data-[state=checked]:hover:bg-accent-hover outline-hidden after:absolute after:-inset-1 after:content-[''] pointer-coarse:after:-inset-3 data-[disabled]:cursor-not-allowed data-[focus-visible]:outline-solid data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-ring data-[invalid]:bg-destructive data-[state=checked]:bg-primary"
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn("size-4 translate-x-0.5 rounded-full bg-paper data-[state=checked]:translate-x-5.5 data-[state=checked]:bg-primary-foreground", moving && "motion-safe:transition-transform motion-safe:duration-(--motion-faster) motion-safe:ease-(--motion-ease-move)")}
        />
      </SwitchPrimitive.Control>
      {children != null ? (
        <SwitchPrimitive.Label data-slot="switch-label" className="text-sm leading-none font-medium select-none">
          {children}
        </SwitchPrimitive.Label>
      ) : null}
    </SwitchPrimitive.Root>
  )
}

export { Switch }
