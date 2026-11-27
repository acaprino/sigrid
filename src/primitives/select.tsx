// Park UI (MIT) select 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/select.ts)
// From Park's `select` recipe comes the form: its outline variant at the md size for the button (40px, l2 corners, 12px
// of side padding, a border and no fill, as the fields; 36px at `size="sm"`; R4: a border, never a shadow too; open, the
// border is the ink), and its list (l2 corners, md elevation in place
// of a border, 4px of padding, items 40px tall with l1 corners and a quiet fill on the highlighted one). The text is
// 14px, not Park's 16px (the type scale of the app). The button's border stays `border-input` (3:1, WCAG 1.4.11):
// Park's outline border is lighter.
// Behaviour: Ark UI's Select (`@ark-ui/react/select`: Root, Control, Trigger, Indicator, Positioner, Content,
// ItemGroup, ItemGroupLabel, Item, ItemText, ItemIndicator) for keyboard (arrows, type-ahead, Enter, Esc), ARIA roles
// and portaled positioning. The list uses the shared Motion entrance from the trigger.
// States from Park's recipe (the owner's decision of 2026-11-20): `disabled` is the toolkit's disabled look (half
// opacity, no pointer, out of the Tab order), `invalid` sets `aria-invalid` and turns the 3:1 control border into the
// destructive colour, also while the list is open (Park's `_invalid`).
// A value that is not among the options leaves the button empty (like `<option hidden>`) and cannot be chosen.
import * as React from "react"
import { Select as SelectPrimitive, createListCollection } from "@ark-ui/react/select"
import { ChevronDown } from "../internal/sigrid-icons"
import { Icon } from "../icons"
import { cn } from "../lib/utils"
import { GROUP_LABEL, LIST_CARD, LIST_ROW } from "../lib/rows"
import { FOCUS_FIELD } from "../lib/focus"
import { FIELD_HOVER, FIELD_OFF_NOW, FIELD_SURFACE, FIELD_TEXT } from "../lib/field"
import { OverlayPortal } from "../internal/portal"
import { useEntrance } from "../internal/motion"
import { useMergedRef } from "../lib/refs"

/**
 * An option: a value and its label. An app can add its own fields (`O extends SelectOption`) and draw them before the
 * label with `renderMark` (a coloured shape, for example): the mark is the app's, the list is the toolkit's. `style`
 * is put on the label in the list: a font shown in its own face, for example.
 */
export type SelectOption = { value: string; label: string; style?: React.CSSProperties | undefined }
export type SelectGroup<O extends SelectOption = SelectOption> = { label: string; options: O[] }

export type SelectProps<O extends SelectOption = SelectOption> = {
  options: O[]
  animated?: boolean | undefined
  value: string
  onValueChange: (value: string) => void
  id?: string
  "aria-label"?: string
  /** The ids of the texts that describe the select (a `FormField`'s helper or error). */
  "aria-describedby"?: string | undefined
  /** As `invalid`: what a `FormField` with an error passes to its control. */
  "aria-invalid"?: boolean | "true" | "false" | undefined
  className?: string
  size?: "sm" | "default"
  /** Grouped options, with a non-selectable heading (Ark UI's `Select.ItemGroup`), after `options`. */
  groups?: SelectGroup<O>[] | undefined
  /** The button text when the value is not among the options (default: empty, as before). */
  placeholder?: string | undefined
  /** The mark drawn before an option's label in the list (`aria-hidden`), or null for none. Absent: no mark. */
  renderMark?: ((option: O) => React.ReactNode) | undefined
  /** The value cannot be changed: half opacity, no pointer, not reachable with Tab. */
  disabled?: boolean | undefined
  /** The value is not accepted: `aria-invalid` and the control border in the destructive colour. */
  invalid?: boolean | undefined
}

/** The row of every list (`LIST_ROW`), with room at its end for the check of the chosen one. */
const ITEM_CLASS = cn(LIST_ROW, "pe-8")

const POSITIONING = { placement: "bottom-start", gutter: 4 } as const

function OptionItem<O extends SelectOption>({ o, renderMark }: { o: O; renderMark?: ((option: O) => React.ReactNode) | undefined }) {
  return (
    <SelectPrimitive.Item item={o} data-slot="select-item" className={ITEM_CLASS}>
      {renderMark ? renderMark(o) : null}
      <SelectPrimitive.ItemText style={o.style}>{o.label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute end-2 flex size-4 items-center justify-center">
        <Icon name="check" className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function Select<O extends SelectOption = SelectOption>({ options, value, onValueChange, id, className, size = "default", groups, placeholder, renderMark, disabled = false, invalid: invalidProp = false, animated, ...aria }: SelectProps<O>) {
  const invalid = invalidProp || aria["aria-invalid"] === true || aria["aria-invalid"] === "true"
  const trigger = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)
  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterPopup(el, trigger.current), open)
  const mergedContentRef = useMergedRef(contentRef, enter)
  const all = React.useMemo(() => (groups ? [...options, ...groups.flatMap((g) => g.options)] : options), [options, groups])
  const collection = React.useMemo(
    () => createListCollection<O>({ items: all, itemToValue: (o) => o.value, itemToString: (o) => o.label }),
    [all],
  )
  const chosen = React.useMemo(() => (all.some((o) => o.value === value) ? [value] : []), [all, value])
  const label = all.find((o) => o.value === value)?.label ?? placeholder ?? ""
  const ids = React.useMemo(() => (id ? { trigger: id } : undefined), [id])

  // Without an internal `Select.Label`, remove Ark's dangling `aria-labelledby` so `aria-label` names trigger and listbox.
  // Also omit `aria-invalid="false"` when valid so callers checking attribute presence match native fields.
  React.useLayoutEffect(() => {
    if (aria["aria-label"]) {
      trigger.current?.removeAttribute("aria-labelledby")
      contentRef.current?.removeAttribute("aria-labelledby")
    }
    if (!invalid) trigger.current?.removeAttribute("aria-invalid")
  })

  return (
    <SelectPrimitive.Root<O>
      collection={collection}
      value={chosen}
      disabled={disabled}
      invalid={invalid || undefined}
      ids={ids}
      lazyMount
      unmountOnExit
      immediate
      positioning={POSITIONING}
      onOpenChange={(details) => setOpen(details.open)}
      onValueChange={(details) => {
        const next = details.value[0]
        if (typeof next === "string" && next !== value) onValueChange(next)
      }}
    >
      <SelectPrimitive.Control className={size === "sm" ? "inline-flex" : "w-full"}>
        <SelectPrimitive.Trigger
          ref={trigger}
          tabIndex={disabled ? -1 : undefined}
          aria-label={aria["aria-label"]}
          aria-describedby={aria["aria-describedby"]}
          aria-invalid={invalid || undefined}
          data-slot="select-trigger"
          // The field's surface, text, hover and invalid border (`lib/field.ts`); open, the border is the ink.
          className={cn(
            "flex w-full items-center justify-between gap-2 pe-(--pad-xs) ps-(--pad-sm) text-start pointer-coarse:min-h-11",
            FIELD_SURFACE,
            FIELD_TEXT,
            FIELD_HOVER,
            "not-aria-invalid:data-[state=open]:border-ring",
            disabled && FIELD_OFF_NOW,
            FOCUS_FIELD,
            size === "sm" ? "h-(--control-sm) w-auto" : "h-(--control-md)",
            className,
          )}
        >
          <span data-slot="select-value" className="truncate">
            {label}
          </span>
          <SelectPrimitive.Indicator className="shrink-0 text-ink-mute" aria-hidden>
            <ChevronDown className="size-4" />
          </SelectPrimitive.Indicator>
        </SelectPrimitive.Trigger>
      </SelectPrimitive.Control>
      <OverlayPortal>
        <SelectPrimitive.Positioner data-slot="select-positioner" className="z-50 outline-none">
          <SelectPrimitive.Content
            ref={mergedContentRef}
            data-slot="select-content"
            hidden={!open}
            aria-label={aria["aria-label"]}
            className={cn(LIST_CARD, "min-w-[max(var(--reference-width),10rem)]")}
          >
            {options.map((o) => (
              <OptionItem key={o.value} o={o} renderMark={renderMark} />
            ))}
            {groups?.map((g) =>
              g.options.length ? (
                <SelectPrimitive.ItemGroup key={g.label} data-slot="select-group" className="mt-1 first:mt-0">
                  <SelectPrimitive.ItemGroupLabel data-slot="select-group-label" className={cn("flex h-(--row-height) items-center px-2 text-ink-mute", GROUP_LABEL)}>
                    {g.label}
                  </SelectPrimitive.ItemGroupLabel>
                  {g.options.map((o) => (
                    <OptionItem key={o.value} o={o} renderMark={renderMark} />
                  ))}
                </SelectPrimitive.ItemGroup>
              ) : null,
            )}
          </SelectPrimitive.Content>
        </SelectPrimitive.Positioner>
      </OverlayPortal>
    </SelectPrimitive.Root>
  )
}

export { Select }
