// A search box: the toolkit's `Input` as a `type="search"` field, with the magnifier at the start (functional chrome,
// 16px, muted) and, while there is text, a button at the end that empties the field and gives it the focus back. The
// browser's own clear button is hidden, so there is one, with a name and the toolkit's focus ring. The field has no
// label of its own: the caller names it (`aria-label`, or a `FormField` around it).
// `variant="quiet"` is the same field for a bar (a header, a toolbar), where the search is always there and must not
// weigh as much as the fields of the page: a quiet fill in place of the border and corners one step rounder
// (`FIELD_QUIET`, lib/field.ts), the light divider only under the pointer, and the focus ring of every field. Its
// height, its text and its parts are the same; what tells it from the bar is the fill, and what says it is a search
// is the magnifier and its words.
import * as React from "react"
import { Search } from "../internal/sigrid-icons"
import { Icon } from "../icons"
import { Input } from "../primitives/input"
import { cn } from "../lib/utils"
import { FIELD_QUIET } from "../lib/field"
import { useWords } from "../words"
import { Button, QUIET_ICON } from "../primitives/button"
import { useMergedRef } from "../lib/refs"

export type SearchFieldProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange" | "defaultValue"> & {
  /** The text searched for. */
  value: string
  onValueChange: (value: string) => void
  /** The name of the button that empties the field. Absent: the toolkit's words («Clear the search»). */
  clearLabel?: string | undefined
  /**
   * `outline` (the default): the field of every form, with its border. `quiet`: for a search in a bar, a
   * quiet fill, rounder corners and no border at rest, so it does not stand out from the bar; the border shows under the pointer.
   */
  variant?: "outline" | "quiet" | undefined
}

function SearchField({ value, onValueChange, clearLabel, variant = "outline", className, ref, disabled, ...props }: SearchFieldProps) {
  const words = useWords()
  const own = React.useRef<HTMLInputElement | null>(null)
  const setRef = useMergedRef(own, ref)
  return (
    <div data-slot="search-field" {...(variant === "quiet" ? { "data-variant": variant } : {})} className={cn("relative flex w-full min-w-0 items-center", className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute start-(--pad-sm) size-4 text-ink-mute" />
      <Input
        {...props}
        ref={setRef}
        type="search"
        disabled={disabled}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        // design-check-ignore-next-line dimension-value: the icon's 16px and its 8px gap after the field's own side padding
        className={cn("pe-(--control-md) ps-[calc(var(--pad-sm)_+_1.5rem)] [&::-webkit-search-cancel-button]:appearance-none", variant === "quiet" && FIELD_QUIET)}
      />
      {value !== "" && !disabled ? (
        <Button
          variant="ghost"
          size="icon-xs"
          data-slot="search-field-clear"
          aria-label={clearLabel ?? words.search.clear}
          onClick={() => {
            onValueChange("")
            own.current?.focus()
          }}
          className={cn("absolute end-1 pointer-coarse:end-0", QUIET_ICON)}
        >
          <Icon name="close" className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}

export { SearchField }
