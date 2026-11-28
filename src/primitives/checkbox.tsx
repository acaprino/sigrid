// Park UI (MIT) checkbox 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/checkbox.ts)
// From Park's `checkbox` recipe comes the form of the control (its sm size: an 18px box with l1 corners, its solid
// variant: when checked the box is a fill with the mark in the contrast color). The border at rest stays our `input`
// token (3:1, WCAG 1.4.11): Park's is its hairline `border`. The fill is the accent, with the label colour the engine
// pairs with it for the mark (the owner's design of 2026-11-22; it was the ink). An app may round its own boxes in its own CSS, through the shape token `--radius-check`.
// Behaviour: Ark UI's Checkbox (`@ark-ui/react/checkbox`: a hidden `<input type="checkbox">` inside a `<label>`, with
// native Space toggle, Enter ignored, and native `"indeterminate"` state). With `animated` the mark grows once, with
// the Web animation from `motion-impl` (`popCheck`), only after the user's click, never on a mark already present at
// mount and never with `prefers-reduced-motion`.
// With `label` the box comes with its words: one `<label>` around both, so a press on the words checks it too, the
// row as tall as the smallest control (44px with a finger), in the text of what is around it.
import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@ark-ui/react/checkbox"
import { cn } from "../lib/utils"
import { useMotion } from "../internal/motion"
import { useMergedRef } from "../lib/refs"

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
  /** Its words, beside it: a press on them checks it too, and they name it for screen readers. */
  label?: React.ReactNode
}

/** The `<input>` attributes (ref, `aria-*`, `data-*`, handlers) go on the hidden checkbox control. */
type CheckboxNativeProps = Omit<
  React.ComponentPropsWithRef<"input">,
  keyof CheckboxOwnProps | "children" | "defaultValue" | "onChange" | "type"
>

const CONTROL_CLASS =
  "peer relative grid size-4.5 shrink-0 place-content-center rounded-sm after:absolute after:-inset-1.5 after:content-[''] pointer-coarse:after:-inset-4.5 border border-input not-data-disabled:data-[state=unchecked]:hover:border-ink-soft not-data-disabled:data-[state=checked]:hover:border-accent-hover not-data-disabled:data-[state=checked]:hover:bg-accent-hover not-data-disabled:data-[state=indeterminate]:hover:border-accent-hover not-data-disabled:data-[state=indeterminate]:hover:bg-accent-hover data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[invalid]:border-destructive data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground outline-hidden data-[focus-visible]:outline-solid data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-ring"

function CheckPop({
  checked,
  toggled,
  motion,
  svg,
}: {
  checked: boolean
  toggled: React.RefObject<boolean>
  motion: ReturnType<typeof useMotion>
  svg: React.RefObject<SVGSVGElement | null>
}) {
  const prev = React.useRef(checked)
  React.useLayoutEffect(() => {
    const becameChecked = checked && !prev.current
    prev.current = checked
    if (becameChecked && toggled.current && motion && svg.current) {
      motion.popCheck(svg.current)
    }
    if (toggled.current) toggled.current = false
  }, [checked, motion, svg, toggled])
  return null
}

function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
  name,
  value,
  id,
  className,
  animated,
  label,
  ref: outerRef,
  ...props
}: CheckboxOwnProps & CheckboxNativeProps) {
  const motion = useMotion(animated)
  const hasLabel = label != null && label !== false && label !== ""
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true"
  const input = React.useRef<HTMLInputElement>(null)
  const inputRef = useMergedRef(input, outerRef)
  const checkSvg = React.useRef<SVGSVGElement>(null)
  const toggled = React.useRef(false)

  // Without a visible label Ark still points the input at its label part (`aria-labelledby`), which is not on the page:
  // the pointer is taken off, and the name is the caller's `aria-label` or the `<label htmlFor>` elsewhere.
  React.useLayoutEffect(() => {
    if (!hasLabel) input.current?.removeAttribute("aria-labelledby")
  })

  return (
    <CheckboxPrimitive.Root
      data-slot={hasLabel ? "checkbox-label" : "checkbox"}
      className={
        hasLabel
          ? "flex min-h-(--control-xs) min-w-0 items-center gap-2 text-sm pointer-coarse:min-h-11"
          : "relative inline-flex items-center align-middle"
      }
      {...(checked !== undefined ? { checked } : {})}
      {...(defaultChecked !== undefined ? { defaultChecked } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      {...(invalid ? { invalid: true } : {})}
      {...(required !== undefined ? { required } : {})}
      {...(name !== undefined ? { name } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(id !== undefined ? { ids: { hiddenInput: id } } : {})}
      onCheckedChange={(details) => {
        if (details.checked === true) toggled.current = true
        onCheckedChange?.(details.checked)
      }}
    >
      <CheckboxPrimitive.Context>
        {(api) => {
          const state = api.indeterminate ? "indeterminate" : api.checked ? "checked" : "unchecked"
          return (
            <>
              <CheckPop checked={api.checked} toggled={toggled} motion={motion} svg={checkSvg} />
              <CheckboxPrimitive.HiddenInput ref={inputRef} data-state={state} aria-checked={api.indeterminate ? "mixed" : api.checked} {...props} />
              <CheckboxPrimitive.Control data-slot="checkbox-control" className={cn(CONTROL_CLASS, className)}>
                <CheckboxPrimitive.Indicator
                  data-slot="checkbox-indicator"
                  className="grid place-content-center text-current transition-none"
                  style={{ pointerEvents: "none" }}
                >
                  <svg
                    ref={checkSvg}
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
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </CheckboxPrimitive.Indicator>
                <CheckboxPrimitive.Indicator
                  indeterminate
                  data-slot="checkbox-indicator"
                  className="grid place-content-center text-current transition-none"
                  style={{ pointerEvents: "none" }}
                >
                  <svg
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
                    <path d="M5 12h14" />
                  </svg>
                </CheckboxPrimitive.Indicator>
              </CheckboxPrimitive.Control>
              {hasLabel ? (
                <CheckboxPrimitive.Label className="min-w-0">
                  {label}
                </CheckboxPrimitive.Label>
              ) : null}
            </>
          )
        }}
      </CheckboxPrimitive.Context>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
