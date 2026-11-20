// SmoothUI (MIT) checkbox 4.0.0 — adapted for @acaprino/toolkit (https://smoothui.dev/r/base-nova/checkbox.json)
// Park UI (MIT) checkbox 102769c — recipe translated to Tailwind for @acaprino/toolkit (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/checkbox.ts)
// From Park's `checkbox` recipe comes the form of the control (its sm size: an 18px box with l1 corners, its solid
// variant: when checked the box is a fill with the mark in the contrast color). The border at rest stays our `input`
// token (3:1, WCAG 1.4.11): Park's is its hairline `border`. The fill is the ink, as before: the accent is kept for the
// primary action. An app may round its own boxes in its own CSS, through the shape token `--radius-check`.
// From SmoothUI's Checkbox we keep: Base UI's Root rendered as a real `<button type="button">` (`nativeButton`,
// so a `<label htmlFor>` labels it and Space checks it; Enter does not, per WAI-ARIA), the Indicator with the stroked
// check mark and the dash for the indeterminate state. Our API stays (the one from before: `checked` and `defaultChecked`
// also accept "indeterminate", `onCheckedChange` receives `boolean | "indeterminate"`, `data-state` on the control), the
// tokens from `theme.css` and the enlarged touch area. Removed: SmoothUI's automatic animations (AnimatePresence, spring,
// `pathLength`, exit): with `animated` the mark grows once, with the Web animation from `motion-impl` (`popCheck`),
// only after the user's click, never on a mark already present at mount and never with `prefers-reduced-motion`.
import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "../../lib/utils"
import { FOCUS_RING } from "../../lib/focus"
import { useMotion } from "../../internal/motion"

type CheckedState = boolean | "indeterminate"

type CheckboxOwnProps = {
  /** Checked (controlled). "indeterminate" shows the dash; a click moves it to `true`. */
  checked?: CheckedState | undefined
  /** Initial state when uncontrolled. */
  defaultChecked?: CheckedState | undefined
  /** Called with the new state when the user checks or unchecks. */
  onCheckedChange?: ((checked: CheckedState) => void) | undefined
  disabled?: boolean | undefined
  required?: boolean | undefined
  name?: string | undefined
  value?: string | undefined
  id?: string | undefined
  className?: string | undefined
  /** The mark appears with a short animation when the user checks (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

/** The `<button>` attributes (ref, `aria-*`, `data-*`, handlers) go on the control. */
type CheckboxNativeProps = Omit<
  React.ComponentPropsWithRef<"button">,
  keyof CheckboxOwnProps | "children" | "defaultValue" | "onChange" | "type"
>

function Checkbox({
  checked: checkedProp,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
  name,
  value,
  id,
  className,
  animated,
  ...props
}: CheckboxOwnProps & CheckboxNativeProps) {
  const motion = useMotion(animated)
  // Base UI keeps "indeterminate" outside `checked`: here the state is kept in a single place and Base UI is always
  // controlled. If the caller does not control it, it starts from `defaultChecked` (the initial dash disappears on the first click).
  const controlled = checkedProp !== undefined
  const [own, setOwn] = React.useState<CheckedState>(defaultChecked ?? false)
  const current = controlled ? checkedProp : own
  const indeterminate = current === "indeterminate"
  const isChecked = current === true
  // True between the user's click and the mark appearing: it animates only a gesture, never a mark already present at mount.
  const gesture = React.useRef(false)
  const state = indeterminate ? "indeterminate" : isChecked ? "checked" : "unchecked"
  const onIcon = React.useCallback(
    (el: SVGSVGElement | null) => {
      if (el && gesture.current && motion) motion.popCheck(el)
      if (el) gesture.current = false
    },
    [motion]
  )
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-state={state}
      className={cn(
        "peer relative size-4.5 shrink-0 rounded-sm after:absolute after:-inset-1.5 after:content-[''] pointer-coarse:after:-inset-4.5 border border-input disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-paper data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink data-[state=indeterminate]:text-paper",
        FOCUS_RING,
        className
      )}
      checked={isChecked}
      indeterminate={indeterminate}
      disabled={disabled}
      required={required}
      name={name}
      value={value}
      id={id}
      nativeButton
      onCheckedChange={(next) => {
        gesture.current = next
        if (!controlled) setOwn(next)
        onCheckedChange?.(next)
      }}
      // The native attributes go on the rendered `<button>`: Base UI merges the props and ref of the `render` element.
      render={<button type="button" {...props} />}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        data-state={state}
        className="grid place-content-center text-current transition-none"
        style={{ pointerEvents: "none" }}
      >
        <svg
          ref={indeterminate ? undefined : onIcon}
          className="size-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d={indeterminate ? "M5 12h14" : "M20 6L9 17l-5-5"} />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
