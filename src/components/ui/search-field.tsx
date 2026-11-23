// A search box: the toolkit's `Input` as a `type="search"` field, with the magnifier at the start (functional chrome,
// 16px, muted) and, while there is text, a button at the end that empties the field and gives it the focus back. The
// browser's own clear button is hidden, so there is one, with a name and the toolkit's focus ring. The field has no
// label of its own: the caller names it (`aria-label`, or a `FormField` around it).
import * as React from "react"
import { Search, X } from "lucide-react"
import { Input } from "./input"
import { cn } from "../../lib/utils"
import { useWords } from "../../words"
import { Button, QUIET_ICON } from "./button"
import { useMergedRef } from "../../lib/refs"

export type SearchFieldProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange" | "defaultValue"> & {
  /** The text searched for. */
  value: string
  onValueChange: (value: string) => void
  /** The name of the button that empties the field. Absent: the toolkit's words («Clear the search»). */
  clearLabel?: string | undefined
}

function SearchField({ value, onValueChange, clearLabel, className, ref, disabled, ...props }: SearchFieldProps) {
  const words = useWords()
  const own = React.useRef<HTMLInputElement | null>(null)
  const setRef = useMergedRef(own, ref)
  return (
    <div data-slot="search-field" className={cn("relative flex w-full min-w-0 items-center", className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-(--pad-sm) size-4 text-ink-mute" />
      <Input
        {...props}
        ref={setRef}
        type="search"
        disabled={disabled}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        // design-check-ignore-next-line dimension-value: the icon's 16px and its 8px gap after the field's own side padding
        className="pr-(--control-md) pl-[calc(var(--pad-sm)_+_1.5rem)] [&::-webkit-search-cancel-button]:appearance-none"
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
          className={cn("absolute right-1 pointer-coarse:right-0", QUIET_ICON)}
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}

export { SearchField }
