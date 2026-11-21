// The words of the toolkit. A component's content is the app's: what a field holds, what a button says, the title
// of a dialog all come from the caller. What is left here are the few words a component has to say by itself: the
// name of a close button, the announcement of a label added, «Page 2 of 5». They are placeholders, in English: an app
// replaces them, all or some, once for the whole tree with `WordsProvider`, in the user's language, and again when
// the language changes. A word that takes a value is a function, so each language orders and inflects it as it needs.
// Where a component also takes the word as a prop (`placeholder`, `clearLabel`, `textNotice`), the prop wins.
// The helpers that return a sentence outside a component (`kindLabel`, `stateText`, `overLimitNotice`, `withinLimit`)
// take the words as their last argument: `useWords()` gives them to an app's own component.
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { COLOR_NAMES } from './colors'

/** The span the calendar's arrows move by, in its three views. */
export type CalendarSpan = 'month' | 'year' | 'decade'

export interface Words {
  readonly common: {
    /** The name of the button that closes a dialog or a sheet. */
    readonly close: string
    /** The button of a notice that takes the action back. */
    readonly undo: string
    /** The name of the region that holds the notices. */
    readonly notices: string
    /** How a key combination is read: keys pressed together, and one after the other. */
    readonly keysTogether: (keys: readonly string[]) => string
    readonly keysInSequence: (keys: readonly string[]) => string
  }
  readonly colors: {
    /** The name of the group of swatches. */
    readonly group: string
    /** The name of each colour of the palette, by its `#rrggbb`. */
    readonly names: Readonly<Record<string, string>>
    /** The name of a colour outside the palette: its place in the list, never the hexadecimal. */
    readonly numbered: (position: number) => string
  }
  readonly date: {
    readonly noDate: string
    readonly noDateTime: string
    readonly clear: string
    readonly time: string
    readonly timeOfDay: string
    readonly done: string
    /** The name of the calendar's card. */
    readonly calendar: string
    readonly previous: (span: CalendarSpan) => string
    readonly next: (span: CalendarSpan) => string
  }
  readonly duration: {
    readonly hours: string
    readonly minutes: string
    readonly none: string
    /** A shortcut: «15m», «1h». */
    readonly short: (hours: number, minutes: number) => string
  }
  readonly search: {
    readonly clear: string
  }
  readonly combobox: {
    readonly empty: string
    readonly trigger: string
  }
  readonly labels: {
    readonly remove: (label: string) => string
    readonly added: (label: string) => string
    readonly pasted: (count: number) => string
    readonly removed: (label: string) => string
    readonly selected: (label: string) => string
    readonly noneSelected: string
    readonly count: (count: number) => string
    readonly removeAll: string
    /** The name of the list of suggestions. */
    readonly suggestions: string
  }
  readonly kinds: {
    readonly text: string
    readonly file: string
    readonly email: string
    readonly link: string
  }
  readonly attachments: {
    readonly heading: string
    /** «3 attachments», on a row. */
    readonly count: (count: number) => string
    readonly open: string
    readonly openNamed: (title: string) => string
    readonly remove: string
    readonly removeNamed: (title: string) => string
    /** The name of the zone that adds. */
    readonly add: string
    readonly addFile: string
    readonly dropHere: string
    /** The second line of the zone: how to add, and the limit («25 MB»). */
    readonly hint: (limit: string) => string
    readonly link: string
    readonly pasteLink: string
    readonly addLink: string
    readonly badAddress: string
    /** What the zone says when text is dropped on it. */
    readonly textNotice: string
    readonly arriving: string
    readonly notUploaded: string
    readonly overLimit: (limit: string) => string
    readonly fileOverLimit: (name: string, limit: string) => string
    readonly filesOverLimit: (count: number, limit: string) => string
  }
  readonly viewer: {
    readonly zoom: string
    readonly zoomOut: string
    readonly zoomIn: string
    readonly pages: string
    readonly page: (page: number, total: number) => string
    readonly openOriginal: string
  }
  readonly checklist: {
    /** Read before an item of a checklist, with its colon and space. */
    readonly done: string
    readonly todo: string
  }
}

const plural = (count: number, one: string, many: string) => (count === 1 ? `1 ${one}` : `${count} ${many}`)

/** The toolkit's own words, in English: the placeholders an app replaces. */
export const DEFAULT_WORDS: Words = {
  common: {
    close: 'Close',
    undo: 'Undo',
    notices: 'Notices',
    keysTogether: (keys) => keys.join(' + '),
    keysInSequence: (keys) => keys.join(' then '),
  },
  colors: {
    group: 'Color',
    names: COLOR_NAMES,
    numbered: (position) => `Color ${position}`,
  },
  date: {
    noDate: 'No date',
    noDateTime: 'No date and time',
    clear: 'Clear the date',
    time: 'Time',
    timeOfDay: 'Time of day',
    done: 'Done',
    calendar: 'Calendar',
    previous: (span) => `Previous ${span}`,
    next: (span) => `Next ${span}`,
  },
  duration: {
    hours: 'hours',
    minutes: 'minutes',
    none: 'None',
    short: (hours, minutes) => (hours > 0 && minutes > 0 ? `${hours}h ${minutes}m` : hours > 0 ? `${hours}h` : `${minutes}m`),
  },
  search: {
    clear: 'Clear the search',
  },
  combobox: {
    empty: 'No results',
    trigger: 'Show the options',
  },
  labels: {
    remove: (label) => `Remove label ${label}`,
    added: (label) => `Label ${label} added`,
    pasted: (count) => `${plural(count, 'label', 'labels')} added`,
    removed: (label) => `Label ${label} removed`,
    selected: (label) => `Label ${label} selected. Delete or Backspace removes it.`,
    noneSelected: 'No label selected',
    count: (count) => plural(count, 'label', 'labels'),
    removeAll: 'Remove all labels',
    suggestions: 'Suggestions',
  },
  kinds: { text: 'text', file: 'file', email: 'email', link: 'link' },
  attachments: {
    heading: 'Attachments',
    count: (count) => plural(count, 'attachment', 'attachments'),
    open: 'Open',
    openNamed: (title) => `Open: ${title}`,
    remove: 'Remove',
    removeNamed: (title) => `Remove: ${title}`,
    add: 'Add a file or a link',
    addFile: 'Add a file',
    dropHere: 'Drop here: it becomes an attachment',
    hint: (limit) => `Drag a file or a link here, or press to choose one · at most ${limit}`,
    link: 'Link',
    pasteLink: 'Paste a link',
    addLink: 'Add link',
    badAddress: 'Type a web address, for example https://example.com',
    textNotice: 'Files and links are added here: text is not an attachment.',
    arriving: 'Arriving',
    notUploaded: 'Not uploaded yet from the other device',
    overLimit: (limit) => `Over the limit of ${limit}`,
    fileOverLimit: (name, limit) => `“${name}” is over the limit of ${limit}: it was not added.`,
    filesOverLimit: (count, limit) => `${count} files are over the limit of ${limit}: they were not added.`,
  },
  viewer: {
    zoom: 'Zoom',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    pages: 'Pages of the document',
    page: (page, total) => `Page ${page} of ${total}`,
    openOriginal: 'Open the original',
  },
  checklist: { done: 'Done: ', todo: 'To do: ' },
}

/** Some of the words, group by group: what is left out stays as it is. */
export type WordsOverride = { readonly [Group in keyof Words]?: Partial<Words[Group]> }

/** `base` with the words of `override` in their place. */
export function withWords(base: Words, override: WordsOverride | undefined): Words {
  if (!override) return base
  const merged: Record<string, unknown> = { ...base }
  for (const group of Object.keys(override) as (keyof Words)[]) {
    const own = override[group]
    if (own) merged[group] = { ...base[group], ...own }
  }
  return merged as unknown as Words
}

const WordsContext = createContext<Words>(DEFAULT_WORDS)

/**
 * The words every component below says: the app passes its own (a constant for each language: the same object at
 * every render), all or some. A provider inside another replaces only what it names.
 */
export function WordsProvider({ words, children }: { words: WordsOverride | undefined; children: ReactNode }) {
  const above = useContext(WordsContext)
  const value = useMemo(() => withWords(above, words), [above, words])
  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>
}

/** The words in use here. */
export function useWords(): Words {
  return useContext(WordsContext)
}
