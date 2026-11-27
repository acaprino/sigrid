// A compact filter bar and a structured rule builder popover for lists and tables. `FilterBar` keeps search, quick
// choices, the advanced filter popover and the «Clear filters» action in stable positions (R14); `FilterPopover` edits
// a controlled list of `{ field, operator, value }` rules in a raised popover (`shadow-lg`, R4) and shows the applied
// count in tabular figures (`Count`, R5). No filter logic runs here: the app filters its own data from `rules`.
import * as React from "react"
import { Button } from "../primitives/button"
import { Count } from "../primitives/count"
import { Input } from "../primitives/input"
import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover"
import { Select, type SelectOption } from "../primitives/select"
import { Separator } from "../primitives/separator"
import { Icon } from "../icons"
import { cn } from "../lib/utils"
import { useWords, type Words } from "../words"
import { SearchField } from "./search-field"

/** The comparison a filter rule makes against a field. */
export type FilterOperator = "is" | "isNot" | "contains" | "gt" | "lt" | "between"

const DEFAULT_OPERATORS: Readonly<Record<FilterField["kind"], readonly FilterOperator[]>> = {
  text: ["contains", "is", "isNot"],
  select: ["is", "isNot"],
  number: ["is", "gt", "lt", "between"],
  date: ["is", "gt", "lt", "between"],
}

/** One filterable column or property offered by `FilterPopover`. */
export type FilterField = {
  id: string
  label: string
  kind: "text" | "select" | "number" | "date"
  /** Allowed operators for this field. Absent: the defaults for `kind`. */
  operators?: readonly FilterOperator[] | undefined
  /** Choices when `kind` is `select`. */
  options?: readonly SelectOption[] | undefined
}

/** One active filter condition: a field, an operator and the value to match. */
export type FilterRule = {
  id: string
  field: string
  operator: FilterOperator
  value: string
}

function operatorLabel(operator: FilterOperator, words: Words["filters"]): string {
  switch (operator) {
    case "is":
      return words.opIs
    case "isNot":
      return words.opIsNot
    case "contains":
      return words.opContains
    case "gt":
      return words.opGt
    case "lt":
      return words.opLt
    case "between":
      return words.opBetween
  }
}

export type FilterBarSearch = {
  value: string
  onChange: (value: string) => void
  /** Accessible name of the search field («Filter issues»). */
  label: string
  placeholder?: string | undefined
}

export type FilterBarProps = {
  /** Search box at the start of the bar. */
  search?: FilterBarSearch | undefined
  /** Always-visible quick controls beside the search (tabs, selects, date range). */
  quick?: React.ReactNode
  /** Advanced filter trigger (typically `FilterPopover`). */
  filters?: React.ReactNode
  /** Trailing actions at the end of the bar (sort, export). Avoid a second solid primary button (R3). */
  actions?: React.ReactNode
  /** How many filters are active: when greater than zero and `onClearAll` is given, shows «Clear filters». */
  appliedCount?: number | undefined
  /** Clears all active filters at once. */
  onClearAll?: (() => void) | undefined
  className?: string | undefined
}

/** A wrapping filter bar: search, quick controls, structured filters, clear-all and trailing actions. */
export function FilterBar({ search, quick, filters, actions, appliedCount = 0, onClearAll, className }: FilterBarProps) {
  const words = useWords()
  return (
    <div data-slot="filter-bar" className={cn("flex min-w-0 flex-wrap items-center justify-between gap-2", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {search ? (
          <SearchField
            value={search.value}
            onValueChange={search.onChange}
            aria-label={search.label}
            placeholder={search.placeholder ?? search.label}
            className="w-full sm:w-64"
          />
        ) : null}
        {quick}
        {filters}
        {appliedCount > 0 && onClearAll ? (
          <Button variant="ghost" size="sm" onClick={onClearAll} data-slot="filter-bar-clear">
            <Icon name="clearFilter" className="size-4" />
            {words.filters.clearAll}
          </Button>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export type FilterPopoverProps = {
  /** The fields a rule can filter on. */
  fields: readonly FilterField[]
  /** Currently applied filter rules. */
  rules: readonly FilterRule[]
  /** Called with the edited rules when the user presses Apply (or clears all). */
  onApply: (rules: FilterRule[]) => void
  /** Count shown on the trigger button. Absent: `rules.length`. */
  appliedCount?: number | undefined
  disabled?: boolean | undefined
  animated?: boolean | undefined
  /** Alignment of the popover relative to the trigger. Default `start`. */
  align?: "start" | "center" | "end" | undefined
  className?: string | undefined
}

/** A button with an applied-filter count that opens a popover to add, edit and apply compound filter rules. */
export function FilterPopover({ fields, rules, onApply, appliedCount, disabled = false, animated, align = "start", className }: FilterPopoverProps) {
  const words = useWords()
  const said = words.filters
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<FilterRule[]>(() => [...rules])
  const seq = React.useRef(0)

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(rules.map((r) => ({ ...r })))
    setOpen(next)
  }

  const fieldById = React.useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields])
  const fieldOptions = React.useMemo<SelectOption[]>(() => fields.map((f) => ({ value: f.id, label: f.label })), [fields])

  const operatorsOf = (field: FilterField | undefined): readonly FilterOperator[] =>
    field?.operators?.length ? field.operators : DEFAULT_OPERATORS[field?.kind ?? "text"]

  const addRule = () => {
    const first = fields[0]
    if (!first) return
    const op = operatorsOf(first)[0] ?? "is"
    const value = first.kind === "select" ? (first.options?.[0]?.value ?? "") : ""
    seq.current += 1
    setDraft((prev) => [...prev, { id: `rule-${seq.current}-${Date.now()}`, field: first.id, operator: op, value }])
  }

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    setDraft((prev) =>
      prev.map((rule) => {
        if (rule.id !== id) return rule
        if (patch.field && patch.field !== rule.field) {
          const nextField = fieldById.get(patch.field)
          const ops = operatorsOf(nextField)
          const operator = ops.includes(rule.operator) ? rule.operator : (ops[0] ?? "is")
          const value = nextField?.kind === "select" ? (nextField.options?.[0]?.value ?? "") : ""
          return { ...rule, field: patch.field, operator, value }
        }
        return { ...rule, ...patch }
      }),
    )
  }

  const removeRule = (id: string) => setDraft((prev) => prev.filter((rule) => rule.id !== id))

  const apply = () => {
    onApply(draft)
    setOpen(false)
  }

  const clear = () => {
    setDraft([])
    onApply([])
    setOpen(false)
  }

  const count = appliedCount ?? rules.length

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} data-slot="filter-popover-trigger" className={className}>
          <Icon name="filter" className="size-4" />
          <span>{said.label}</span>
          <Count value={count} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} width="lg" animated={animated} data-slot="filter-popover-content" className="flex flex-col gap-3">
        {draft.length === 0 ? (
          <p className="py-2 text-sm text-ink-mute">{said.empty}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {draft.map((rule) => {
              const field = fieldById.get(rule.field) ?? fields[0]
              const ops = operatorsOf(field)
              const opOptions: SelectOption[] = ops.map((op) => ({ value: op, label: operatorLabel(op, said) }))
              return (
                <div key={rule.id} data-slot="filter-rule" className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <Select
                    size="sm"
                    aria-label={said.field}
                    options={fieldOptions}
                    value={rule.field}
                    onValueChange={(value) => updateRule(rule.id, { field: value })}
                    className="min-w-0 flex-1"
                  />
                  <Select
                    size="sm"
                    aria-label={said.operator}
                    options={opOptions}
                    value={rule.operator}
                    onValueChange={(value) => updateRule(rule.id, { operator: value as FilterOperator })}
                    className="min-w-0 flex-1"
                  />
                  {field?.kind === "select" && field.options?.length ? (
                    <Select
                      size="sm"
                      aria-label={said.value}
                      options={[...field.options]}
                      value={rule.value}
                      onValueChange={(value) => updateRule(rule.id, { value })}
                      className="min-w-0 flex-1"
                    />
                  ) : (
                    <Input
                      type={field?.kind === "number" ? "number" : field?.kind === "date" ? "date" : "text"}
                      aria-label={said.value}
                      placeholder={said.value}
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                      className="h-(--control-sm) min-w-0 flex-1"
                    />
                  )}
                  <Button variant="ghost" size="icon-sm" aria-label={said.remove} onClick={() => removeRule(rule.id)}>
                    <Icon name="close" className="size-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
        <Separator decorative />
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" disabled={fields.length === 0} onClick={addRule}>
            <Icon name="plus" className="size-4" />
            {said.add}
          </Button>
          <div className="flex items-center gap-2">
            {draft.length > 0 || count > 0 ? (
              <Button variant="ghost" size="sm" onClick={clear}>
                {said.clearAll}
              </Button>
            ) : null}
            <Button variant="default" size="sm" onClick={apply}>
              {said.apply}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
