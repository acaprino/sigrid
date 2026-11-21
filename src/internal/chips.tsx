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
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ComboboxPrimitive as Combobox, createListCollection } from '../components/ui/combobox'
import { TagsInput, useTagsInputContext, type TagsInputRootProps } from '@ark-ui/react/tags-input'
import { X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Tooltip } from '../components/ui/tooltip'
import { cn } from '../lib/utils'
import { FOCUS_RING, FOCUS_WITHIN_RING } from '../lib/focus'
import { TAG_PILL, tagColorAttrs } from './tag-color'

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
  /** The name of the list of suggestions for screen readers. Default «Suggestions». */
  suggestionsLabel?: string | undefined
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

const removeName = (tag: string) => `Remove label ${tag}`

/** What Ark's parts are called and what it announces, in English. */
const WORDS: NonNullable<TagsInputRootProps['translations']> = {
  deleteTagTriggerLabel: removeName,
  tagAdded: (tag) => `Label ${tag} added`,
  tagsPasted: (tags) => (tags.length === 1 ? '1 label added' : `${tags.length} labels added`),
  tagDeleted: (tag) => `Label ${tag} removed`,
  tagSelected: (tag) => `Label ${tag} selected. Delete or Backspace removes it.`,
  noTagsSelected: 'No label selected',
  inputLabel: (count) => (count === 1 ? '1 label' : `${count} labels`),
  clearTriggerLabel: 'Remove all labels',
}

/** With suggestions the typed text is kept here, for both of Ark's machines: the box tells it when it changes the text itself. */
type Typed = { set: (text: string) => void }

function Box({ value, onChange, typed }: Pick<ChipsInputProps, 'value' | 'onChange'> & { typed?: Typed | undefined }) {
  const tags = useTagsInputContext()
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
    if ((e.nativeEvent as InputEvent).inputType === 'insertFromPaste' || !text.includes(',')) return
    const parts = text.split(',')
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
  const input = <TagsInput.Input onKeyDown={onKeyDown} onInput={onInput} className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm pointer-coarse:min-h-11 outline-none placeholder:text-muted-foreground" />
  return (
    // design-check-ignore-next-line dimension-value: Park's md tags-input padding (5px), so a row of 28px chips with the 1px border makes a 40px field; with the density it is half of what the control height leaves (30px: the chip and the two borders)
    <TagsInput.Control className={cn('flex min-h-(--control-md) w-full flex-wrap items-center gap-1.5 rounded-md border border-input px-1.5 py-[calc((var(--control-md)_-_30px)/2)] pointer-coarse:py-0', FOCUS_WITHIN_RING)}>
      {value.map((tag, index) => (
        <TagsInput.Item key={tag} index={index} value={tag} className="inline-flex">
          <TagsInput.ItemPreview asChild>
            <Badge
              variant="secondary"
              data-slot="chip"
              {...tagColorAttrs(tag)}
              // A neutral chip with an 8px dot in the label's colour (R10: data colours as dots, never as a filled
              // block). The chip reached with the arrows from the box: the focus ring, since focus itself stays in the box.
              className={cn(TAG_PILL, 'h-7 gap-1.5 overflow-visible rounded-sm bg-ink/6 pr-1 text-xs text-ink data-highlighted:outline-solid data-highlighted:outline-2 data-highlighted:outline-offset-2 data-highlighted:outline-ring')}
            >
              <span aria-hidden="true" data-slot="chip-dot" className="size-2 shrink-0 rounded-full bg-(--tag-ink)" />
              <TagsInput.ItemText>{tag}</TagsInput.ItemText>
              <Tooltip label={removeName(tag)}>
                <TagsInput.ItemDeleteTrigger className={cn("relative flex size-5 items-center justify-center rounded-sm text-ink-mute after:absolute after:-inset-1 after:content-[''] pointer-coarse:size-11 hover:bg-ink/9 hover:text-ink", FOCUS_RING)}>
                  <X aria-hidden="true" className="size-3.5" />
                </TagsInput.ItemDeleteTrigger>
              </Tooltip>
            </Badge>
          </TagsInput.ItemPreview>
        </TagsInput.Item>
      ))}
      {typed ? <Combobox.Input asChild>{input}</Combobox.Input> : input}
    </TagsInput.Control>
  )
}

/**
 * A list of labels as chips with an input: add with Enter or comma (also by pasting «a, b, c» or by leaving the
 * input), remove with the chip's button, and with Backspace on an empty input the last one is removed.
 */
export function ChipsInput({ id, value, onChange, placeholder, suggestions, onQuery, suggestionsLabel }: ChipsInputProps) {
  const ids = useMemo(() => ({ input: id }), [id])
  if (suggestions !== undefined) return <SuggestingChips id={id} value={value} onChange={onChange} placeholder={placeholder} suggestions={suggestions} onQuery={onQuery} suggestionsLabel={suggestionsLabel} />
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
      blurBehavior="add"
      translations={WORDS}
      {...(placeholder === undefined ? {} : { placeholder })}
      className="min-w-0"
    >
      <Box value={value} onChange={onChange} />
    </TagsInput.Root>
  )
}

const POSITIONING = { placement: 'bottom-start', sameWidth: true, gutter: 4, strategy: 'fixed' } as const

/** The labels field with a list of suggestions under it: the two Ark machines share the text box and what is typed. */
function SuggestingChips({ id, value, onChange, placeholder, suggestions, onQuery, suggestionsLabel = 'Suggestions' }: Omit<ChipsInputProps, 'placeholder' | 'suggestions'> & { placeholder: string | undefined; suggestions: readonly string[] }) {
  const ids = useMemo(() => ({ input: id }), [id])
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
      .filter((tag) => !taken.has(tag.toLowerCase()) && (!filtering || text === '' || tag.toLowerCase().includes(text)))
      .map((tag) => ({ value: tag, label: tag }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the content, not on the arrays' identity
  }, [valueKey, suggestionsKey, pending, filtering])
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
        blurBehavior="add"
        translations={WORDS}
        {...(placeholder === undefined ? {} : { placeholder })}
        className="min-w-0"
      >
        <Combobox.Control>
          <Box value={value} onChange={onChange} typed={typed} />
        </Combobox.Control>
      </TagsInput.Root>
      {/* The list exists whenever Ark has it open, hidden while nothing matches: Ark attaches its Esc and its
          outside-press handling when it opens. Not in a portal: it stays inside the sheet that holds the field. */}
      {open ? (
        <Combobox.Positioner className="z-50">
          <Combobox.Content
            data-slot="chips-suggestions"
            aria-label={suggestionsLabel}
            hidden={items.length === 0}
            // Esc closes the list (Ark hears it first): it must not go on to the sheet that holds the field.
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.stopPropagation()
            }}
            className="flex max-h-80 flex-col gap-0.5 overflow-y-auto rounded-md bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none"
          >
            {items.map((item) => (
              <Combobox.Item key={item.value} item={item} data-slot="chips-suggestion" className="flex min-h-(--row-height) cursor-default items-center rounded-sm px-2 py-1 pointer-coarse:min-h-11 data-[highlighted]:bg-paper-2">
                <Combobox.ItemText className="truncate">{item.label}</Combobox.ItemText>
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      ) : null}
    </Combobox.Root>
  )
}
