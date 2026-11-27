// A one-line field with fixed parts inside it, before or after the text: words that are always there («https://»,
// «.com», a unit), an icon, or a small button that acts on what is written (copy it, show it, empty it). The whole is
// one field: one border, one height and one focus ring, around the parts and the text together (R4: no border inside
// a border). It takes the props of `Input` and has its look, so a `FormField` wires it as it wires an `Input`:
// the `id`, the note and the invalid state go to the `<input>`. A press on a part that is not a button puts the
// caret in the field, as a press on the field would.
// A button beside a field, with a border of its own («Subscribe» after an e-mail), is not this: it is an `Input` and
// a `Button` in a `Cluster`.
import * as React from "react"
import { Field } from "@ark-ui/react/field"
import { Button } from "../primitives/button"
import { Tooltip } from "../primitives/tooltip"
import { cn, isEmptyNode } from "../lib/utils"
import { useMergedRef } from "../lib/refs"
import { FIELD_HEIGHT, FIELD_SURFACE, FIELD_TEXT } from "../lib/field"
import { FOCUS_FIELD_HAS_INPUT } from "../lib/focus"

/** Inside a group, and whether its field is off: the buttons of a field that is off are off too. `null` outside one. */
const InputGroupContext = React.createContext<{ disabled: boolean } | null>(null)

/** For a button of the toolkit that may stand in a group (`CopyButton`): the group around it, or `null`. */
export function useInputGroup(): { disabled: boolean } | null {
  return React.useContext(InputGroupContext)
}

export type InputGroupProps = Omit<React.ComponentProps<"input">, "children"> & {
  /** What stands before the text: an `InputGroupText`, an `InputGroupButton`, or a few of them. */
  start?: React.ReactNode
  /** What stands after the text: the same parts. */
  end?: React.ReactNode
}

// The ring is the field's own (`FOCUS_FIELD`, on the border), shown when the keyboard focus is in the text: a button
// of the group shows its own ring, so the two are never drawn together. Under the pointer the border goes one step
// darker, as on `Input`. Off: the whole fades once (a button inside does not fade again). Invalid: the red border, unless a `FormField` around it says what is wrong in its own box.
// The surface and the height are every field's (`lib/field.ts`); the states are read from the `<input>` inside.
const GROUP_CLASS = cn(
  FIELD_SURFACE,
  FIELD_HEIGHT,
  "flex w-full min-w-0 items-center",
  FOCUS_FIELD_HAS_INPUT,
  "has-[input:disabled]:opacity-50 [&:has(input:disabled)_button]:opacity-100 [&:not(:has(input[aria-invalid=true])):hover]:border-input [&:has(input[aria-invalid=true]):not([data-invalid]_*)]:border-destructive",
)

// The text of `Input` (14px, 16px on a phone so iOS does not zoom), with no border, corners or ring of its own: those
// are the group's.
const INPUT_CLASS = cn("h-full w-full min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed", FIELD_TEXT)

const SLOT_CLASS = "flex h-full shrink-0 items-center gap-0.5 text-ink-mute"

function InputGroup({ start, end, className, disabled, ref, ...props }: InputGroupProps) {
  const own = React.useRef<HTMLInputElement | null>(null)
  const setRef = useMergedRef(own, ref)
  const group = React.useMemo(() => ({ disabled: disabled === true }), [disabled])
  const has = (part: React.ReactNode) => !isEmptyNode(part)
  return (
    <InputGroupContext.Provider value={group}>
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
        <Field.Input
          data-slot="input"
          {...props}
          ref={setRef}
          disabled={disabled}
          className={cn(INPUT_CLASS, has(start) ? "ps-0" : "ps-(--pad-sm)", has(end) ? "pe-0" : "pe-(--pad-sm)")}
        />
        {has(end) ? (
          <div data-slot="input-group-end" className={cn(SLOT_CLASS, "pe-1")}>
            {end}
          </div>
        ) : null}
      </div>
    </InputGroupContext.Provider>
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
    <span data-slot="input-group-text" className={cn("flex items-center px-(--pad-xs) whitespace-nowrap select-none [&_svg]:size-4", FIELD_TEXT, className)}>
      {children}
    </span>
  )
}

export type InputGroupButtonProps = Omit<React.ComponentProps<"button">, "children"> & {
  /** The name of the action. With an `icon` it is the accessible name and the hint; without one it is the word shown. */
  label: string
  /**
   * The drawing, 16px (an `Icon`). With it the button shows the icon alone: only for a drawing everyone reads the same
   * way (search, close, copy, empty). Any other action shows its word.
   */
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
  const off = disabled || useInputGroup()?.disabled === true
  if (isEmptyNode(icon)) {
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
