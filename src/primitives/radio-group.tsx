// Radio group on Ark UI (`@ark-ui/react/radio-group`): `role="radiogroup"`, single Tab stop, arrows wrapping at the
// ends, Home and End to jump and select, and two variants: "radio" (18px circle, Park's sm control, accent dot) and
// "swatch" (24px filled pill, 44px with touch, detached 2px ink ring when chosen and focus outline 6px away). No motion.
import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "@ark-ui/react/radio-group"
import { cn } from "../lib/utils"
import { useMergedRef } from "../lib/refs"

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

/** Passes the caller's optional form `name` to items so unnamed groups stay out of FormData. */
const GroupNameContext = React.createContext<string | undefined>(undefined)

const INPUT_SELECTOR = 'input[data-slot="radio-group-item-input"]'

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
  ref: outerRef,
  ...props
}: RadioGroupProps) {
  const root = React.useRef<HTMLDivElement>(null)
  const rootRef = useMergedRef(root, outerRef)
  const hasLabelledBy = props["aria-labelledby"] !== undefined

  // Without an internal `RadioGroup.Label` Ark still points `aria-labelledby` at its label id: remove the dangling id
  // when the caller names the group with `aria-label`. Also keep a single Tab stop across the group's radios.
  React.useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    if (!hasLabelledBy) el.removeAttribute("aria-labelledby")
    const inputs = Array.from(el.querySelectorAll<HTMLInputElement>(INPUT_SELECTOR))
    const enabled = inputs.filter((i) => !i.disabled)
    const active = enabled.find((i) => i.getAttribute("aria-checked") === "true") ?? enabled[0]
    for (const i of inputs) i.tabIndex = i === active ? 0 : -1
  })

  const onGroupKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    const key = event.key
    if (
      key !== "ArrowRight" &&
      key !== "ArrowDown" &&
      key !== "ArrowLeft" &&
      key !== "ArrowUp" &&
      key !== "Home" &&
      key !== "End"
    ) {
      return
    }
    const radios = Array.from(
      event.currentTarget.querySelectorAll<HTMLInputElement>(`${INPUT_SELECTOR}:not(:disabled)`)
    )
    if (radios.length === 0) return
    const current = radios.indexOf(document.activeElement as HTMLInputElement)
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    const forward = key === "ArrowDown" || (rtl ? key === "ArrowLeft" : key === "ArrowRight")
    let target: HTMLInputElement | undefined
    if (key === "Home") target = radios[0]
    else if (key === "End") target = radios[radios.length - 1]
    else if (forward) {
      target = radios[current === -1 ? 0 : (current + 1) % radios.length]
    } else {
      target = radios[current === -1 ? radios.length - 1 : (current - 1 + radios.length) % radios.length]
    }
    if (!target) return
    event.preventDefault()
    for (const r of radios) r.tabIndex = r === target ? 0 : -1
    target.focus()
    if (!target.checked) target.click()
  }

  return (
    <GroupNameContext.Provider value={name}>
      <RadioGroupPrimitive.Root
        {...props}
        ref={rootRef}
        data-slot="radio-group"
        className={cn(orientation === "vertical" ? "grid gap-3" : "flex items-center gap-4", className)}
        {...(value !== undefined ? { value } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        onValueChange={
          onValueChange === undefined
            ? undefined
            : (details) => {
                if (details.value !== null) onValueChange(details.value)
              }
        }
        disabled={disabled}
        {...(required !== undefined ? { required } : {})}
        {...(name !== undefined ? { name } : {})}
        orientation={orientation}
        onKeyDown={onGroupKeyDown}
      >
        {children}
      </RadioGroupPrimitive.Root>
    </GroupNameContext.Provider>
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
    "outline-hidden data-[focus-visible]:outline-solid data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-ring",
    // Under the pointer the ring goes one step darker, as a field's border and a checkbox do.
    "not-data-disabled:data-[state=unchecked]:hover:border-ink-soft data-[invalid]:border-destructive data-[state=checked]:border-primary not-data-disabled:data-[state=checked]:hover:border-accent-hover"
  ),
  // 24 px, 44 with touch; `ink` selection ring on `paper` (2 px, detached by 2 px) and the focus ring (accent text, R8)
  // at 6 px: the 2px offset of R8 is taken by the selection ring, so focus sits outside it (approved exception).
  swatch: cn(
    "relative inline-flex size-6 shrink-0 rounded-full pointer-coarse:size-11",
    "outline-hidden data-[focus-visible]:outline-solid data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-6 data-[focus-visible]:outline-ring",
    // `SWATCH_CHOSEN`, on the radio Ark marks checked.
    "data-[state=checked]:ring-2 data-[state=checked]:ring-ink data-[state=checked]:ring-offset-2 data-[state=checked]:ring-offset-paper"
  ),
} as const

/**
 * The selection of a colour swatch: a 2px ring in the ink, 2px away from the swatch on the page's paper. For a swatch
 * that is not a `RadioGroupItem` (one among other kinds of choices), with `FOCUS_RING_SWATCH` for its focus.
 */
export const SWATCH_CHOSEN = "ring-2 ring-ink ring-offset-2 ring-offset-paper"

/** The `<input>` attributes (ref, `aria-*`, `data-*`, `style`, handlers) passed to the item. */
type RadioNativeProps = Omit<
  React.ComponentPropsWithRef<"input">,
  keyof RadioOwnProps | "defaultValue" | "onChange" | "type"
>

export type RadioGroupItemProps = RadioOwnProps & RadioNativeProps

function RadioGroupItem({
  value,
  disabled = false,
  className,
  id,
  children,
  variant = "radio",
  style,
  title,
  ref: outerRef,
  ...props
}: RadioGroupItemProps) {
  const groupName = React.useContext(GroupNameContext)
  const input = React.useRef<HTMLInputElement>(null)
  const inputRef = useMergedRef(input, outerRef)
  const hasLabel = children != null && children !== false && children !== ""

  // Without visible text, remove Ark's dangling `aria-labelledby` so `aria-label` names the radio cleanly.
  // Without an explicit group `name`, remove Ark's auto-generated `name` so the radio stays out of FormData.
  React.useLayoutEffect(() => {
    const el = input.current
    if (!el) return
    if (!hasLabel) el.removeAttribute("aria-labelledby")
    if (groupName === undefined) el.removeAttribute("name")
  })

  // Visual data attributes (such as `data-color` and `data-mark-hue` on swatches) go on the visible control too.
  const controlData: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("data-")) controlData[k] = v
  }

  return (
    <RadioGroupPrimitive.Item
      value={value}
      disabled={disabled}
      title={title}
      className={cn("relative inline-flex items-center", hasLabel && "gap-2", disabled && "cursor-not-allowed")}
    >
      <RadioGroupPrimitive.ItemContext>
        {(item) => (
          <>
            <RadioGroupPrimitive.ItemHiddenInput
              ref={inputRef}
              data-slot="radio-group-item-input"
              aria-checked={item.checked}
              name={groupName ?? ""}
              {...(id !== undefined ? { id } : {})}
              {...props}
            />
            <RadioGroupPrimitive.ItemControl
              data-slot="radio-group-item"
              data-variant={variant}
              style={style}
              {...controlData}
              className={cn(ITEM_CLASSES[variant], "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50", className)}
            >
              {variant === "radio" && item.checked ? (
                <span data-slot="radio-group-indicator" className="flex size-full items-center justify-center">
                  <span aria-hidden="true" className="block size-2 rounded-full bg-primary" />
                </span>
              ) : null}
            </RadioGroupPrimitive.ItemControl>
          </>
        )}
      </RadioGroupPrimitive.ItemContext>
      {hasLabel ? (
        <RadioGroupPrimitive.ItemText className={cn("text-sm leading-none font-medium", disabled && "cursor-not-allowed opacity-50")}>
          {children}
        </RadioGroupPrimitive.ItemText>
      ) : null}
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
