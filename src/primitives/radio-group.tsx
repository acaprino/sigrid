// SmoothUI (MIT) radio-group 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/radio-group.json)
// From SmoothUI's RadioGroup we keep: Base UI's Root and Radio (`role="radiogroup"`/`role="radio"` with
// `aria-checked`, a single Tab stop, arrows that move focus and select, wrapping at the ends), the Radio
// rendered as a real `<button type="button">` (`nativeButton`), the Indicator with the filled dot and the optional label.
// Adapted: Base UI does not handle Home and End in the radio group (`enableHomeAndEndKeys: false`), here they go to the first and
// last enabled radio and select it, like the arrows; `theme.css` tokens (`input` border, dot and selected border
// `ink`, `ring/50` ring), touch area enlarged to 24 px (44 with touch). Removed: all of Motion's animations (cascading
// appearance of the radios, spring on the dot, `useReducedMotion`): the dot is there or it is not, no movement, Motion is not loaded.
import * as React from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "../lib/utils"
import { FOCUS_RING, FOCUS_RING_SWATCH } from "../lib/focus"

type RadioGroupOwnProps = {
  children?: React.ReactNode
  className?: string | undefined
  /** Initial value when uncontrolled. */
  defaultValue?: string | undefined
  /** Selected value (controlled). */
  value?: string | undefined
  /** Called with the value the user chose (click, Space, arrows, Home, End). */
  onValueChange?: ((value: string) => void) | undefined
  disabled?: boolean | undefined
  required?: boolean | undefined
  /** Name for form submission; without a name the group does not enter the form data. */
  name?: string | undefined
  /** Layout only: the arrows work in both directions, as in a WAI-ARIA radio group. */
  orientation?: "horizontal" | "vertical" | undefined
}

/** The `<div>` attributes (ref, `aria-label`, `aria-describedby`, `data-*`, handlers) go on the group. */
type RadioGroupNativeProps = Omit<
  React.ComponentPropsWithRef<"div">,
  keyof RadioGroupOwnProps | "defaultChecked" | "dir" | "onChange"
>

export type RadioGroupProps = RadioGroupOwnProps & RadioGroupNativeProps

function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
  children,
  name,
  required,
  orientation = "vertical",
  onKeyDown,
  ...props
}: RadioGroupProps) {
  const onGroupKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || (event.key !== "Home" && event.key !== "End")) return
    const radios = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[data-slot="radio-group-item"]:not([disabled]):not([data-disabled])')
    )
    const target = event.key === "Home" ? radios[0] : radios[radios.length - 1]
    if (!target) return
    event.preventDefault()
    target.focus()
    // The click goes through Base UI: it selects the radio like a user click and calls `onValueChange`.
    if (target.getAttribute("aria-checked") !== "true") target.click()
  }
  return (
    <RadioGroupPrimitive
      {...props}
      data-slot="radio-group"
      className={cn(orientation === "vertical" ? "grid gap-3" : "flex items-center gap-4", className)}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange === undefined ? undefined : (next) => onValueChange(next as string)}
      disabled={disabled}
      required={required}
      name={name}
      onKeyDown={onGroupKeyDown}
    >
      {children}
    </RadioGroupPrimitive>
  )
}

type RadioOwnProps = {
  /** The value of this choice. */
  value: string
  /** Text of the label next to the radio (optional: without it, `aria-label` is needed). */
  children?: React.ReactNode
  className?: string | undefined
  disabled?: boolean | undefined
  id?: string | undefined
  /**
   * "radio" (default): circle with a border and a filled dot. "swatch": filled pill (the color comes from `style`), the selection
   * is an ink ring detached from the pill and focus a wider outline, so selection and focus remain
   * distinct even together; no dot.
   */
  variant?: "radio" | "swatch" | undefined
}

const ITEM_CLASSES = {
  radio: cn(
    // 18px, as the checkbox (Park's sm control for both).
    "peer relative inline-flex size-4.5 shrink-0 items-center justify-center rounded-full border border-input bg-paper after:absolute after:-inset-1 after:content-[''] pointer-coarse:after:-inset-3.5",
    FOCUS_RING,
    // Under the pointer the ring goes one step darker, as a field's border and a checkbox do.
    "enabled:data-unchecked:hover:border-ink-soft aria-invalid:border-destructive data-checked:border-primary enabled:data-checked:hover:border-accent-hover"
  ),
  // 24 px, 44 with touch; `ink` selection ring on `paper` (2 px, detached by 2 px) and the focus ring (accent text, R8)
  // at 6 px: the 2px offset of R8 is taken by the selection ring, so focus sits outside it (approved exception).
  swatch: cn(
    "relative inline-flex size-6 shrink-0 rounded-full pointer-coarse:size-11",
    FOCUS_RING_SWATCH,
    // `SWATCH_CHOSEN`, on the radio Base UI marks checked.
    "data-checked:ring-2 data-checked:ring-ink data-checked:ring-offset-2 data-checked:ring-offset-paper"
  ),
} as const

/**
 * The selection of a colour swatch: a 2px ring in the ink, 2px away from the swatch on the page's paper. For a swatch
 * that is not a `RadioGroupItem` (one among other kinds of choices), with `FOCUS_RING_SWATCH` for its focus.
 */
export const SWATCH_CHOSEN = "ring-2 ring-ink ring-offset-2 ring-offset-paper"

/** The `<button>` attributes (ref, `aria-*`, `data-*`, `style`, handlers) go on the radio. */
type RadioNativeProps = Omit<
  React.ComponentPropsWithRef<"button">,
  keyof RadioOwnProps | "defaultValue" | "onChange" | "type"
>

export type RadioGroupItemProps = RadioOwnProps & RadioNativeProps

function RadioGroupItem({ value, disabled = false, className, id, children, variant = "radio", ...props }: RadioGroupItemProps) {
  const generatedId = React.useId()
  const radioId = id ?? generatedId
  const radio = (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      data-variant={variant}
      className={cn(ITEM_CLASSES[variant], "disabled:cursor-not-allowed disabled:opacity-50", className)}
      value={value}
      disabled={disabled}
      id={radioId}
      nativeButton
      // The native attributes go on the rendered `<button>`: Base UI merges the props and ref of the `render` element.
      render={<button type="button" {...props} />}
    >
      {variant === "radio" ? (
        <RadioPrimitive.Indicator data-slot="radio-group-indicator" className="flex size-full items-center justify-center">
          <span aria-hidden="true" className="block size-2 rounded-full bg-primary" />
        </RadioPrimitive.Indicator>
      ) : null}
    </RadioPrimitive.Root>
  )
  if (!children) return radio
  return (
    <div className="flex items-center gap-2">
      {radio}
      <label
        htmlFor={radioId}
        className={cn("text-sm leading-none font-medium", disabled && "cursor-not-allowed opacity-50")}
      >
        {children}
      </label>
    </div>
  )
}

export { RadioGroup, RadioGroupItem }
