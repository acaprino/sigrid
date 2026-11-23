// Park UI (MIT) tags-input 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tags-input.ts)
//
// From Park's `tags-input` recipe (md) comes the look: the field 40px tall with l2 corners and 6px of side padding,
// 6px between the chips, each chip 28px tall with l1 corners and its own 20px remove button. What the field does rests
// on Ark UI's TagsInput (`@ark-ui/react/tags-input`).
// Ark gives: Enter and the comma that close a label, a pasted «a, b, c» split into labels, the text left in the box
// added when the field is left, the arrows that walk the chips from the box (Delete or Backspace removes the one
// reached), the remove button of each chip with its name, the announcements to screen readers, one Tab stop for the
// whole field. Ours: the chip is the neutral `Badge` with a dot in the color of its name (`tag-color.ts`, R10); the words are about
// «labels», in English; a label already there is not added again whatever its case; Backspace in the empty box removes
// the last label at once (Ark would first select it and remove it at the second press); a chip is not edited in place;
// a comma that arrives with other text in one go (an autocorrection, a keyboard's suggestion) closes the labels before
// it and leaves the rest in the box (Ark would add the text it had before that event).
// With `suggestions` the box is also a combobox (Ark UI's Combobox, on the same text box): while the user writes, the
// labels that match and are not in the field yet are listed under it; the arrows move, Enter or a click adds the one
// reached, Esc closes the list only. Any other text is still a label of its own (Enter, the comma, leaving the box).
// No animation.
import { useEffect, useMemo, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react'
import { ComboboxPrimitive as Combobox, createListCollection } from '../components/ui/combobox'
import { TagsInput, useTagsInputContext, type TagsInputRootProps } from '@ark-ui/react/tags-input'
import { X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Tooltip } from '../components/ui/tooltip'
import { cn } from '../lib/utils'
import { FOCUS_RING, FOCUS_WITHIN_FIELD } from '../lib/focus'
import { TAG_PILL, tagColorAttrs } from './tag-color'
import { useWords, type Words } from '../words'

export type ChipsInputProps = {
  /** The id of the writing input, for the field's label. */
  id: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /**
   * Labels to offer while the user writes (the ones used elsewhere, people from an address book). The ones already in
   * the field are left out. Filtered here by the text typed, ignoring case, unless `onQuery` is given.
   */
  suggestions?: readonly string[] | undefined
  /** The text being typed: with it the caller filters (and may fetch) and passes the new `suggestions`. */
  onQuery?: ((text: string) => void) | undefined
  /** The name of the list of suggestions for screen readers. Absent: the toolkit's words («Suggestions»). */
  suggestionsLabel?: string | undefined
  /**
   * What a chip shows in place of its value (a person's name in place of the whole address). The value stays what the
   * caller holds and what a chip is told apart by; a suggestion shows the name and, after it, the value in the muted
   * ink, and is found by either.
   */
  display?: ((value: string) => string) | undefined
  /**
   * True for a value that is not valid (an address without its domain): its chip has the destructive border and text,
   * and screen readers hear so after its name. The field does not refuse it: the caller decides what to do with it.
   */
  invalid?: ((value: string) => boolean) | undefined
  /**
   * The characters that close a label, each one a single character. Default: the comma. Enter always closes one. A
   * separator typed, pasted or arriving with other text splits it the same way (`[',', ';', ' ']` for addresses).
   */
  separators?: readonly string[] | undefined
  /** The 8px dot in the colour of the label's name (R10), on by default. Off for chips that are not coloured labels (people, addresses). */
  dot?: boolean | undefined
}

const COMMA = [','] as const
/** The separators as one pattern: any of the single characters given, the comma when none is usable. */
function separatorPattern(separators: readonly string[] = COMMA): RegExp {
  const chars = separators.filter((c) => [...c].length === 1)
  return new RegExp(`[${(chars.length ? chars : COMMA).map((c) => c.replace(/[\\\]\[^-]/g, '\\$&')).join('')}]`)
}

/** No spaces at the sides, no empties, no duplicates (ignoring case): the first one written stays. */
function clean(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = raw.trim()
    if (!tag || seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    out.push(tag)
  }
  return out
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((tag, i) => tag === b[i])

/** What Ark's parts are called and what it announces, from the toolkit's words. */
function tagWords(words: Words, display?: (value: string) => string): NonNullable<TagsInputRootProps['translations']> {
  const w = words.labels
  // A chip is named by what it shows.
  const named = (say: (label: string) => string) => (value: string) => say(display?.(value) ?? value)
  return {
    deleteTagTriggerLabel: named(w.remove),
    tagAdded: named(w.added),
    tagsPasted: (tags) => w.pasted(tags.length),
    tagDeleted: named(w.removed),
    tagSelected: named(w.selected),
    noTagsSelected: w.noneSelected,
    inputLabel: w.count,
    clearTriggerLabel: w.removeAll,
  }
}

/** With suggestions the typed text is kept here, for both of Ark's machines: the box tells it when it changes the text itself. */
type Typed = { set: (text: string) => void }

function Box({ value, onChange, typed, display, invalid, split, dot = true }: Pick<ChipsInputProps, 'value' | 'onChange' | 'display' | 'invalid' | 'dot'> & { typed?: Typed | undefined; split: RegExp }) {
  const tags = useTagsInputContext()
  const words = useWords().labels
  const removeName = words.remove
  /** The last key was an Esc kept from the sheet. */
  const held = useRef(false)
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    const reached = value.some((tag, index) => tags.getItemState({ index, value: tag }).highlighted)
    // Esc with a chip reached goes back to the box (Ark, right after this handler): it stops here, so it does not also
    // close the sheet that holds the field. With no chip reached Esc is the sheet's, as in any other field; and so is
    // a second Esc in a row (after Delete Ark keeps the next chip reached, and its Esc does not let go of it).
    const again = held.current
    held.current = e.key === 'Escape' && reached
    if (held.current && !again) return e.stopPropagation()
    if (e.key !== 'Backspace' || e.currentTarget.value !== '' || value.length === 0) return
    // A chip reached with the arrows is Ark's to remove; otherwise the last label goes, at the first press.
    if (reached) return
    e.preventDefault()
    onChange(value.slice(0, -1))
  }
  const onInput = (e: FormEvent<HTMLInputElement>) => {
    const text = e.currentTarget.value
    // A pasted list is Ark's (`addOnPaste`).
    if ((e.nativeEvent as InputEvent).inputType === 'insertFromPaste' || !split.test(text)) return
    const parts = text.split(split)
    const rest = parts.pop() ?? ''
    // Before Ark reads the box (its handler comes after this one): what it finds is the text still being written.
    const box = e.currentTarget
    box.value = rest
    const next = clean([...value, ...parts])
    if (!same(next, value)) onChange(next)
    // After this event has been handled (the combobox writes the text it read into the shared state).
    if (typed) setTimeout(() => {
      typed.set(rest)
      box.value = rest
    })
  }
  // The text written and left in the box becomes a label when the focus goes elsewhere (Tab, a click on a button or on the
  // page): Ark does it only for the focus or the press it hears outside, and not at all under the combobox. A press on a
  // suggestion keeps the focus in the box, and one that lands on the list is not leaving.
  const onBlur = (e: FocusEvent<HTMLInputElement>) => {
    if ((e.relatedTarget as Element | null)?.closest?.('[data-slot="chips-suggestions"]')) return
    const text = e.currentTarget.value.trim()
    if (!text) return
    const next = clean([...value, ...text.split(split)])
    if (!same(next, value)) onChange(next)
    // Ark's text and the box's own: the first is what Enter and the list read, the second what is on the screen.
    tags.setInputValue('')
    e.currentTarget.value = ''
  }
  const input = <TagsInput.Input onKeyDown={onKeyDown} onInput={onInput} onBlur={onBlur} className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm pointer-coarse:min-h-11 outline-none placeholder:text-muted-foreground" />
  return (
    // design-check-ignore-next-line dimension-value: Park's md tags-input padding (5px), so a row of 28px chips with the 1px border makes a 40px field; with the density it is half of what the control height leaves (30px: the chip and the two borders)
    <TagsInput.Control className={cn('flex min-h-(--control-md) w-full flex-wrap items-center gap-1.5 rounded-md border border-line px-1.5 py-[calc((var(--control-md)_-_30px)/2)] pointer-coarse:py-0 hover:border-input', FOCUS_WITHIN_FIELD)}>
      {value.map((tag, index) => {
        const name = display?.(tag) ?? tag
        const wrong = invalid?.(tag) === true
        return (
        <TagsInput.Item key={tag} index={index} value={tag} className="inline-flex">
          <TagsInput.ItemPreview asChild>
            <Badge
              variant="secondary"
              data-slot="chip"
              data-invalid={wrong || undefined}
              {...tagColorAttrs(tag)}
              // A neutral chip with an 8px dot in the label's colour (R10: data colours as dots, never as a filled
              // block). The chip reached with the arrows from the box: the focus ring, since focus itself stays in the box.
              // A value that is not valid: the destructive border and text on its soft fill, said in words too (below).
              className={cn(
                TAG_PILL,
                'h-7 gap-1.5 overflow-visible rounded-sm pr-1 text-xs data-highlighted:outline-solid data-highlighted:outline-2 data-highlighted:outline-offset-2 data-highlighted:outline-ring',
                wrong ? 'border-destructive bg-destructive-soft text-destructive' : 'bg-ink/6 text-ink',
              )}
            >
              {dot ? <span aria-hidden="true" data-slot="chip-dot" className="size-2 shrink-0 rounded-full bg-(--tag-ink)" /> : null}
              <TagsInput.ItemText>{name}</TagsInput.ItemText>
              {wrong ? <span className="sr-only">, {words.invalid}</span> : null}
              <Tooltip label={removeName(name)}>
                <TagsInput.ItemDeleteTrigger className={cn("relative flex size-5 items-center justify-center rounded-sm text-ink-mute after:absolute after:-inset-1 after:content-[''] pointer-coarse:size-11 hover:bg-ink/9 hover:text-ink", FOCUS_RING)}>
                  <X aria-hidden="true" className="size-3.5" />
                </TagsInput.ItemDeleteTrigger>
              </Tooltip>
            </Badge>
          </TagsInput.ItemPreview>
        </TagsInput.Item>
        )
      })}
      {typed ? <Combobox.Input asChild>{input}</Combobox.Input> : input}
    </TagsInput.Control>
  )
}

/**
 * A list of labels as chips with an input: add with Enter or comma (also by pasting «a, b, c» or by leaving the
 * input), remove with the chip's button, and with Backspace on an empty input the last one is removed.
 */
export function ChipsInput({ id, value, onChange, placeholder, suggestions, onQuery, suggestionsLabel, display, invalid, separators, dot }: ChipsInputProps) {
  const ids = useMemo(() => ({ input: id }), [id])
  const words = useWords()
  const translations = useMemo(() => tagWords(words, display), [words, display])
  const separatorsKey = separators?.join('\n')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the content, not on the array's identity
  const split = useMemo(() => separatorPattern(separators), [separatorsKey])
  if (suggestions !== undefined) return <SuggestingChips id={id} value={value} onChange={onChange} placeholder={placeholder} suggestions={suggestions} onQuery={onQuery} suggestionsLabel={suggestionsLabel} display={display} invalid={invalid} dot={dot} split={split} />
  return (
    <TagsInput.Root
      ids={ids}
      value={value}
      onValueChange={(details) => {
        const next = clean(details.value)
        if (!same(next, value)) onChange(next)
      }}
      editable={false}
      addOnPaste
      delimiter={split}
      translations={translations}
      {...(placeholder === undefined ? {} : { placeholder })}
      className="min-w-0"
    >
      <Box value={value} onChange={onChange} display={display} invalid={invalid} dot={dot} split={split} />
    </TagsInput.Root>
  )
}

// The boundary is the page, not the scrolling window around the field: inside a window that scrolls, its own box would be the
// edge the card fits in, and a card taller than the window would be squeezed or pushed out of the screen.
const PAGE = () => document.documentElement
const POSITIONING = { placement: 'bottom-start', sameWidth: true, gutter: 4, strategy: 'fixed', boundary: PAGE } as const

/** The labels field with a list of suggestions under it: the two Ark machines share the text box and what is typed. */
function SuggestingChips({ id, value, onChange, placeholder, suggestions, onQuery, suggestionsLabel, display, invalid, dot, split }: Omit<ChipsInputProps, 'placeholder' | 'suggestions' | 'separators'> & { placeholder: string | undefined; suggestions: readonly string[]; split: RegExp }) {
  const ids = useMemo(() => ({ input: id }), [id])
  const words = useWords()
  const translations = useMemo(() => tagWords(words, display), [words, display])
  const [pending, setPending] = useState('')
  const [open, setOpen] = useState(false)
  // Callers rebuild the lists on every render: the collection follows their content, so the list keeps the row
  // reached with the arrows while the form around it re-renders.
  const valueKey = value.join('\n')
  const suggestionsKey = suggestions.join('\n')
  const filtering = onQuery === undefined
  const items = useMemo(() => {
    const taken = new Set(value.map((tag) => tag.toLowerCase()))
    const text = pending.trim().toLowerCase()
    return clean([...suggestions])
      .map((tag) => ({ value: tag, label: display?.(tag) ?? tag }))
      // Found by the name shown or by the value under it.
      .filter((item) => !taken.has(item.value.toLowerCase()) && (!filtering || text === '' || item.value.toLowerCase().includes(text) || item.label.toLowerCase().includes(text)))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the content, not on the arrays' identity
  }, [valueKey, suggestionsKey, pending, filtering, display])
  const collection = useMemo(() => createListCollection({ items }), [items])
  // Both machines write the typed text; whichever does it first, the caller is asked once per change.
  const query = useRef(onQuery)
  query.current = onQuery
  useEffect(() => {
    query.current?.(pending)
  }, [pending])
  const typed = useMemo<Typed>(() => ({ set: setPending }), [])
  const add = (tags: string[]) => {
    const next = clean([...value, ...tags])
    if (!same(next, value)) onChange(next)
  }
  return (
    <Combobox.Root
      ids={ids}
      collection={collection}
      value={[]}
      onValueChange={(details) => {
        add(details.value)
        setPending('')
      }}
      inputValue={pending}
      onInputValueChange={(details) => setPending(details.inputValue)}
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      allowCustomValue
      selectionBehavior="clear"
      openOnClick={false}
      positioning={POSITIONING}
      lazyMount
      unmountOnExit
      className="min-w-0"
    >
      <TagsInput.Root
        ids={ids}
        value={value}
        onValueChange={(details) => {
          const next = clean(details.value)
          if (!same(next, value)) onChange(next)
        }}
        inputValue={pending}
        onInputValueChange={(details) => setPending(details.inputValue)}
        editable={false}
        addOnPaste
        delimiter={split}
        translations={translations}
        {...(placeholder === undefined ? {} : { placeholder })}
        className="min-w-0"
      >
        <Combobox.Control>
          <Box value={value} onChange={onChange} typed={typed} display={display} invalid={invalid} dot={dot} split={split} />
        </Combobox.Control>
      </TagsInput.Root>
      {/* The list exists whenever Ark has it open, hidden while nothing matches: Ark attaches its Esc and its
          outside-press handling when it opens. Not in a portal: it stays inside the sheet that holds the field. */}
      {open ? (
        <Combobox.Positioner className="z-50">
          <Combobox.Content
            data-slot="chips-suggestions"
            aria-label={suggestionsLabel ?? words.labels.suggestions}
            hidden={items.length === 0}
            // Esc closes the list (Ark hears it first): it must not go on to the sheet that holds the field.
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.stopPropagation()
            }}
            className="flex max-h-80 flex-col gap-0.5 overflow-y-auto rounded-md bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none"
          >
            {items.map((item) => (
              <Combobox.Item key={item.value} item={item} data-slot="chips-suggestion" className="flex min-h-(--row-height) cursor-default items-center rounded-sm px-2 py-1 pointer-coarse:min-h-11 data-[highlighted]:bg-selected/60 data-[highlighted]:text-ink">
                <Combobox.ItemText className="truncate">{item.label}</Combobox.ItemText>
                {/* The value under a name: after it, in the muted ink. */}
                {item.label === item.value ? null : (
                  <span data-slot="chips-suggestion-value" className="ml-2 truncate text-ink-mute">
                    {item.value}
                  </span>
                )}
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      ) : null}
    </Combobox.Root>
  )
}
