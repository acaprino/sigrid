// Park UI (MIT) combobox 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/combobox.ts)
// From Park's `combobox` recipe comes the form (its md size, its outline variant): the field is the toolkit's input
// (40px, l2 corners, the 3:1 border) with the chevron at its end, and the list is the select's (l2 corners, the md
// elevation, 4px of padding, a 2px gap, rows at least 40px tall with 8px of side padding and l1 corners). The row
// under the pointer or the arrows is the quiet fill; the chosen one carries a check, in the ink (Park's is its accent).
// Behaviour: Ark UI's Combobox: typing filters, the arrows move, Enter chooses, Esc closes the list first. The text
// must end as one of the options: on leaving, a text that is none goes back to the chosen one.
// Ours: the options are filtered here by their label, ignoring case, unless the caller answers `onQuery` with a new
// list (people from a server); the list is not moved to a portal (as the date field's card: it stays inside the sheet
// that holds it, and `fixed` keeps a scrolling body from clipping it). No animation.
import * as React from "react"
import { Combobox as ComboboxPrimitive, createListCollection } from "@ark-ui/react/combobox"
import { Check } from "lucide-react"
import { Icon } from "../icons"
import { cn } from "../lib/utils"
import { useEntrance } from "../internal/motion"
import { useWords } from "../words"
import { FOCUS_FIELD } from "../lib/focus"
import { FIELD_HEIGHT, FIELD_HOVER, FIELD_OFF, FIELD_SURFACE, FIELD_TEXT } from "../lib/field"
import { LIST_CARD, LIST_ROW } from "../lib/rows"

export type ComboboxOption = {
  value: string
  label: string
  /** A second line of muted text (a person's address under the name). */
  detail?: string | undefined
  disabled?: boolean | undefined
}

export type ComboboxProps<O extends ComboboxOption = ComboboxOption> = {
  /** The list enters with a movement, as a select's does. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  options: readonly O[]
  /** The chosen value, or null. */
  value: string | null
  onValueChange: (value: string | null) => void
  /**
   * The text being typed: with it the caller filters (and may fetch) and passes the new `options`; the list here is
   * then shown as given. Without it the options are filtered by their label.
   */
  onQuery?: ((text: string) => void) | undefined
  /** The id of the text box, for the field's `<label>`. */
  id?: string | undefined
  "aria-label"?: string | undefined
  "aria-describedby"?: string | undefined
  "aria-invalid"?: boolean | "true" | "false" | undefined
  placeholder?: string | undefined
  /** What the list says when nothing matches. Absent: the toolkit's words («No results»). */
  emptyText?: string | undefined
  /** The name of the button that opens the list. Absent: the toolkit's words («Show the options»). */
  triggerLabel?: string | undefined
  disabled?: boolean | undefined
  invalid?: boolean | undefined
  required?: boolean | undefined
  className?: string | undefined
}

const POSITIONING = { placement: "bottom-start", sameWidth: true, gutter: 4, strategy: "fixed" } as const

function Combobox<O extends ComboboxOption = ComboboxOption>({
  options,
  value,
  onValueChange,
  onQuery,
  id,
  placeholder,
  emptyText,
  triggerLabel,
  disabled,
  invalid: invalidProp = false,
  required,
  animated,
  className,
  ...aria
}: ComboboxProps<O>) {
  const words = useWords()
  // The list comes from the side of its field, as a select's and a menu's do.
  const control = React.useRef<HTMLDivElement>(null)
  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterPopup(el, control.current))
  const invalid = invalidProp || aria["aria-invalid"] === true || aria["aria-invalid"] === "true"
  // What was typed since the list opened: empty again when it closes, so the next opening shows every option.
  const [query, setQuery] = React.useState("")
  const shown = React.useMemo(() => {
    const text = query.trim().toLowerCase()
    if (onQuery || text === "") return options
    return options.filter((o) => o.label.toLowerCase().includes(text))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `onQuery` matters only as present or absent
  }, [options, query, onQuery !== undefined])
  const collection = React.useMemo(
    () => createListCollection<O>({ items: [...shown], itemToValue: (o) => o.value, itemToString: (o) => o.label, isItemDisabled: (o) => o.disabled === true }),
    [shown],
  )
  const ids = React.useMemo(() => (id ? { input: id } : undefined), [id])
  const chosen = React.useMemo(() => (value === null ? [] : [value]), [value])
  return (
    <ComboboxPrimitive.Root<O>
      data-slot="combobox"
      collection={collection}
      value={chosen}
      onValueChange={(details) => {
        const next = details.value[0] ?? null
        if (next !== value) onValueChange(next)
      }}
      onInputValueChange={(details) => {
        // Ark writes the chosen label into the box too: that is not a search.
        if (details.reason !== "input-change") return
        setQuery(details.inputValue)
        onQuery?.(details.inputValue)
      }}
      onOpenChange={(details) => {
        if (details.open) return
        setQuery("")
        onQuery?.("")
      }}
      inputBehavior="autohighlight"
      openOnClick
      positioning={POSITIONING}
      lazyMount
      unmountOnExit
      {...(ids ? { ids } : {})}
      {...(placeholder !== undefined ? { placeholder } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      {...(required !== undefined ? { required } : {})}
      invalid={invalid}
      className={cn("flex w-full min-w-0 flex-col", className)}
    >
      <ComboboxPrimitive.Control ref={control} data-slot="combobox-control" className="relative">
        <ComboboxPrimitive.Input
          data-slot="combobox-input"
          aria-label={aria["aria-label"]}
          aria-describedby={aria["aria-describedby"]}
          // `Input`'s field (`lib/field.ts`), with room at its end for the chevron. Ark puts `aria-invalid` on the box.
          className={cn(FIELD_SURFACE, FIELD_HEIGHT, "w-full min-w-0 truncate py-1 pe-(--control-md) ps-(--pad-sm)", FIELD_TEXT, FIELD_OFF, FOCUS_FIELD, FIELD_HOVER)}
        />
        <ComboboxPrimitive.Trigger
          data-slot="combobox-trigger"
          aria-label={triggerLabel ?? words.combobox.trigger}
          // Out of the Tab order: the box opens the list with the arrows, and this button is for the pointer.
          tabIndex={-1}
          className="absolute inset-y-0 end-0 flex w-(--control-md) items-center justify-center text-ink-mute hover:text-ink disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon name="chevronDown" className="size-4" />
        </ComboboxPrimitive.Trigger>
      </ComboboxPrimitive.Control>
      <ComboboxPrimitive.Positioner className="z-50">
        <ComboboxPrimitive.Content
          ref={enter}
          data-slot="combobox-content"
          // Esc closes the list (Ark hears it first): it must not go on to the sheet that holds the field.
          onKeyDown={(event) => {
            if (event.key === "Escape") event.stopPropagation()
          }}
          className={LIST_CARD}
        >
          {shown.length === 0 ? (
            <ComboboxPrimitive.Empty data-slot="combobox-empty" className="flex min-h-(--row-height) items-center px-2 text-ink-mute">
              {emptyText ?? words.combobox.empty}
            </ComboboxPrimitive.Empty>
          ) : null}
          {shown.map((option) => (
            <ComboboxPrimitive.Item
              key={option.value}
              item={option}
              data-slot="combobox-item"
              className={cn(LIST_ROW, "justify-between")}
            >
              <span className="flex min-w-0 flex-col">
                <ComboboxPrimitive.ItemText className="truncate">{option.label}</ComboboxPrimitive.ItemText>
                {option.detail ? <span className="truncate text-xs text-ink-mute">{option.detail}</span> : null}
              </span>
              <ComboboxPrimitive.ItemIndicator className="shrink-0 text-ink">
                <Check aria-hidden="true" className="size-4" />
              </ComboboxPrimitive.ItemIndicator>
            </ComboboxPrimitive.Item>
          ))}
        </ComboboxPrimitive.Content>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Root>
  )
}

// The labels field (`components/ChipsInput.tsx`) builds its list of suggestions on the same primitive: it takes it from
// here, so this is the one file that rests on Ark's Combobox.
export { Combobox, ComboboxPrimitive, createListCollection }
