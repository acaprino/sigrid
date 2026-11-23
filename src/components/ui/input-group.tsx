// A one-line field with fixed parts inside it, before or after the text: words that are always there («https://»,
// «.com», a unit), an icon, or a small button that acts on what is written (copy it, show it, empty it). The whole is
// one field: one border, one height and one focus ring, around the parts and the text together (R4: no border inside
// a border). It takes the props of `Input` and has its look, so a `FormField` wires it as it wires an `Input`:
// the `id`, the note and the invalid state go to the `<input>`. A press on a part that is not a button puts the
// caret in the field, as a press on the field would.
// A button beside a field, with a border of its own («Subscribe» after an e-mail), is not this: it is an `Input` and
// a `Button` in a `Cluster`.
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { Button } from "./button"
import { Tooltip } from "./tooltip"
import { cn } from "../../lib/utils"

/** The buttons of a field that is off are off too. */
const GroupDisabledContext = React.createContext(false)

export type InputGroupProps = Omit<React.ComponentProps<"input">, "children"> & {
  /** What stands before the text: an `InputGroupText`, an `InputGroupButton`, or a few of them. */
  start?: React.ReactNode
  /** What stands after the text: the same parts. */
  end?: React.ReactNode
}

// The ring is the field's own (`FOCUS_FIELD`, on the border), shown when the keyboard focus is in the text: a button
// of the group shows its own ring, so the two are never drawn together. Under the pointer the border goes one step
// darker, as on `Input`. Off: the whole fades once (a button inside does not fade again). Invalid: the red border, unless a `FormField` around it says what is wrong in its own box.
const GROUP_CLASS =
  "flex h-(--control-md) w-full min-w-0 items-center rounded-md border border-line bg-transparent pointer-coarse:min-h-11 outline-hidden has-[input:focus-visible]:outline-solid has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-1 has-[input:focus-visible]:outline-ring has-[input:disabled]:opacity-50 [&:has(input:disabled)_button]:opacity-100 [&:not(:has(input[aria-invalid=true])):hover]:border-input [&:has(input[aria-invalid=true]):not([data-invalid]_*)]:border-destructive"

// The text of `Input` (14px, 16px on a phone so iOS does not zoom), with no border, corners or ring of its own: those
// are the group's.
const INPUT_CLASS =
  "h-full w-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm"

const SLOT_CLASS = "flex h-full shrink-0 items-center gap-0.5 text-ink-mute"

function InputGroup({ start, end, className, disabled, ref, ...props }: InputGroupProps) {
  const own = React.useRef<HTMLInputElement | null>(null)
  const setRef = React.useCallback(
    (el: HTMLInputElement | null) => {
      own.current = el
      if (typeof ref === "function") return ref(el)
      if (ref) ref.current = el
    },
    [ref],
  )
  const has = (part: React.ReactNode) => part !== undefined && part !== null && part !== false
  return (
    <GroupDisabledContext.Provider value={disabled === true}>
      <div
        data-slot="input-group"
        className={cn(GROUP_CLASS, className)}
        // A press on the words or on the room around a part is a press on the field.
        onMouseDown={(event) => {
          if ((event.target as Element).closest("input, button, a")) return
          event.preventDefault()
          own.current?.focus()
        }}
      >
        {has(start) ? (
          <div data-slot="input-group-start" className={cn(SLOT_CLASS, "ps-1")}>
            {start}
          </div>
        ) : null}
        <InputPrimitive
          data-slot="input"
          {...props}
          ref={setRef as React.Ref<HTMLElement>}
          disabled={disabled}
          className={cn(INPUT_CLASS, has(start) ? "ps-0" : "ps-(--pad-sm)", has(end) ? "pe-0" : "pe-(--pad-sm)")}
        />
        {has(end) ? (
          <div data-slot="input-group-end" className={cn(SLOT_CLASS, "pe-1")}>
            {end}
          </div>
        ) : null}
      </div>
    </GroupDisabledContext.Provider>
  )
}

export type InputGroupTextProps = {
  /** The words («https://», «kg»), or an `Icon` that says what the field holds. */
  children: React.ReactNode
  className?: string | undefined
}

/** Words or an icon that are part of the field and are not pressed. Muted, in the field's own text size. */
function InputGroupText({ children, className }: InputGroupTextProps) {
  return (
    <span data-slot="input-group-text" className={cn("flex items-center px-(--pad-xs) text-base whitespace-nowrap select-none md:text-sm [&_svg]:size-4", className)}>
      {children}
    </span>
  )
}

export type InputGroupButtonProps = Omit<React.ComponentProps<"button">, "children"> & {
  /** The name of the action. With an `icon` it is the accessible name and the hint; without one it is the word shown. */
  label: string
  /** The drawing, 16px (an `Icon`). With it the button shows the icon alone. */
  icon?: React.ReactNode
  /** A switch (show the password): on or off. Absent: a plain action. */
  pressed?: boolean | undefined
  /** The hint fades in (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

/**
 * A small quiet button inside the field (copy, show, empty). Never the solid action of the screen (R3): it has no
 * fill and no border. It is off when its field is.
 */
function InputGroupButton({ label, icon, pressed, animated, disabled, className, ...props }: InputGroupButtonProps) {
  const groupDisabled = React.useContext(GroupDisabledContext)
  const off = disabled || groupDisabled
  if (icon === undefined || icon === null || icon === false) {
    return (
      <Button variant="ghost" size="xs" data-slot="input-group-button" aria-pressed={pressed} disabled={off} className={className} {...props}>
        {label}
      </Button>
    )
  }
  return (
    <Tooltip label={label} animated={animated}>
      <Button variant="ghost" size="icon-xs" data-slot="input-group-button" aria-label={label} aria-pressed={pressed} disabled={off} className={className} {...props}>
        {icon}
      </Button>
    </Tooltip>
  )
}

export { InputGroup, InputGroupButton, InputGroupText }
