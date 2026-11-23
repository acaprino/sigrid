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
    /** What screen readers hear before the text of a notice that is an error. */
    readonly error: string
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
    /** The button text of a range field without a value. */
    readonly noRange: string
    /** No longer shown: the date cards have no button that removes the date (2026-11-22). Kept so an app's words still fit. */
    readonly clear: string
    /** No longer shown, as `clear`. */
    readonly clearRange: string
    /** The quick choices above the calendar (`dayPicks`, `rangePicks`). */
    readonly today: string
    readonly tomorrow: string
    readonly weekend: string
    readonly nextDays: (days: number) => string
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
  readonly sidebar: {
    /** The button at the foot of the sidebar, and its name once the sidebar is a rail. */
    readonly collapse: string
    readonly expand: string
    /** The search box that filters the rows: its name and its placeholder. */
    readonly search: string
    /** Said when no row holds the text searched for: by the sidebar's search, and by a `Tree`'s filter. */
    readonly empty: string
    /** The button in the bar that opens the sidebar where the frame has made it a drawer (`DrawerButton`). */
    readonly open: string
  }
  readonly search: {
    readonly clear: string
  }
  readonly copy: {
    /** The name of a `CopyButton` that was given none. */
    readonly copy: string
    /** Shown and said right after the text is on the clipboard. */
    readonly copied: string
    /** Said when the system refused the clipboard. */
    readonly failed: string
  }
  /** What a `Tree` says by itself. */
  readonly tree: {
    /** Said at the end of a branch while its children load. */
    readonly loading: string
    /** Said at the end of a branch whose children could not be loaded. */
    readonly failed: string
    /** Read after `failed` by screen readers: how to try again (the branch loads again when it is opened again). */
    readonly retry: string
    /** The field that filters the tree by name: its name and its placeholder. Nothing found says `sidebar.empty`, as every search of rows. */
    readonly filter: string
  }
  readonly list: {
    /** Read before the title of a row not read yet (`ItemRow`). */
    readonly unread: string
    /** Read in place of «+2» after a line cut short (`OverflowList`): how many of its items are not shown. */
    readonly more: (count: number) => string
  }
  readonly palette: {
    /** The name of the command palette and the placeholder of its field. */
    readonly placeholder: string
    /** Said when no command holds the text. */
    readonly empty: string
    /** The name of the command that opens the palette (Ctrl+K), in a list of keys (`CommandsProvider`). */
    readonly command: string
    /** The name of the list of the keys that work now, in the window's foot (`KeyHints`). */
    readonly keys: string
  }
  /** The three commands that choose the look's scheme in the palette (`useSchemeCommands`). */
  readonly scheme: {
    /** The heading they sit under in the palette. */
    readonly group: string
    /** Each name stands alone, without the heading: a screen reader says the row and its state («Light theme, checked»), not the group. */
    readonly light: string
    readonly dark: string
    /** The choice that follows the system's light or dark setting. */
    readonly system: string
    /** Other words the three are found by in the palette. */
    readonly keywords: string
  }
  /** The names of the keys that are held, where a key of a command is written out (`formatKeys`): Cmd and Option on a Mac. */
  readonly keys: {
    readonly ctrl: string
    readonly cmd: string
    readonly alt: string
    readonly option: string
    readonly shift: string
  }
  /** What a step of `Steps` is, read after its name. */
  readonly steps: {
    readonly done: string
    readonly current: string
    readonly upcoming: string
    /** A step that failed. */
    readonly error: string
    /** «Step 2 of 4»: said under a row of steps too narrow for their names, and the only name left is the current one. */
    readonly summary: (position: number, total: number) => string
  }
  /** What a `Progress` says about itself: its value, and what became of the task. */
  readonly progress: {
    readonly value: (value: number, max: number) => string
    /** It is not known how far it is. */
    readonly indeterminate: string
    readonly complete: string
    readonly error: string
  }
  readonly shell: {
    /** The link, shown on keyboard focus, that jumps over the bars to the content of an `AppShell`. */
    readonly skip: string
  }
  /** The names of the buttons of a window (`WindowControls`). */
  readonly window: {
    readonly minimize: string
    readonly maximize: string
    /** The middle button, once the window fills the screen. */
    readonly restore: string
    readonly close: string
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
    /** Said after the name of a chip whose value is not valid. */
    readonly invalid: string
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
  readonly table: {
    /** The name of the button in a column's heading that sorts by it («Sort by Size»). */
    readonly sortBy: (column: string) => string
    /** What a table says when it has no rows. */
    readonly empty: string
  }
  readonly graph: {
    /** The names of the buttons that move the view, and of their row. */
    readonly view: string
    readonly zoomIn: string
    readonly zoomOut: string
    readonly fit: string
    /** The name of the field that finds a thing, and what it shows while empty. */
    readonly find: string
    /** The name of the small map of the whole graph. */
    readonly map: string
    /** The names of the arrow of a thing in the tree mode: to show what hangs from it, to hide it. (The › of the graph mode is named by the app: `openLabel`.) */
    readonly open: (item: string) => string
    readonly close: (item: string) => string
    /** What screen readers hear of a closed thing: its name and how many it hides. */
    readonly closed: (item: string, hidden: number) => string
    /** What screen readers hear of a thing of the graph mode that holds others the app keeps out of sight (`hiddenCount` of a node): its name and how many («Orders, hides 12»). */
    readonly hides: (item: string, count: number) => string
    /** The word after the name of a thing outside what the graph is about (`external` of a node), 12px in the muted ink; also said in its name. */
    readonly external: string
    /** What screen readers hear in the description of a thing chosen with the choice, when the app marks several (`selected`): the name of the one that is the choice («chosen with Ledger»). */
    readonly chosenToo: (item: string) => string
    /** The name of the button that hangs a new thing from one, in the tree mode. */
    readonly add: (item: string) => string
    /** The name of the button that adds a new thing after one, joined by a line from it, in the graph mode. */
    readonly addAfter: (item: string) => string
    /** What screen readers hear after the name of a thing in the graph mode: the names of what its lines lead to, and of what the lines into it come from. */
    readonly leadsTo: (items: readonly string[]) => string
    readonly comesFrom: (items: readonly string[]) => string
    /** The name a new thing starts with. */
    readonly newNode: string
    /** What screen readers call the kind of thing the canvas is in the graph mode (`model="graph"`), where it is not a tree: its `aria-roledescription`. */
    readonly roleDescription: string
    /** What screen readers hear of a thing on the path the app numbers: its name and its steps («Copy, step 2»). */
    readonly onPath: (item: string, steps: readonly number[]) => string
    /**
     * What screen readers hear of a line that joins a thing to another without hanging (a `link`): its words, which
     * way it goes (`to` the other thing, `from` it, or `with` it both ways) and the other thing. Said after the name.
     */
    readonly line: (item: string, way: 'to' | 'from' | 'with', label?: string) => string
  }
  readonly reorder: {
    /** The name of the handle that moves an item («Move Inbox»). */
    readonly handle: (item: string) => string
    /** What kind of thing a handle is, said after its name by screen readers. */
    readonly role: string
    /** How the handle is used with the keyboard: read once, when it takes the focus. */
    readonly instructions: string
    /** What screen readers hear while an item is moved: taken, over another place, put down, put back. */
    readonly taken: (item: string, position: number, total: number) => string
    readonly moved: (item: string, position: number, total: number) => string
    readonly put: (item: string, position: number, total: number) => string
    readonly back: (item: string) => string
  }
  readonly richText: {
    /** The name of the row of buttons above the text. */
    readonly toolbar: string
    readonly bold: string
    readonly italic: string
    readonly underline: string
    readonly bulletList: string
    readonly orderedList: string
    readonly quote: string
    readonly undo: string
    readonly redo: string
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
    error: 'Error',
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
    noRange: 'No dates',
    clear: 'Clear the date',
    clearRange: 'Clear the dates',
    today: 'Today',
    tomorrow: 'Tomorrow',
    weekend: 'This weekend',
    nextDays: (days) => `Next ${days} days`,
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
  sidebar: {
    collapse: 'Collapse the sidebar',
    expand: 'Expand the sidebar',
    search: 'Search the menu',
    empty: 'No results',
    open: 'Open the menu',
  },
  search: {
    clear: 'Clear the search',
  },
  copy: {
    copy: 'Copy',
    copied: 'Copied',
    failed: 'Could not copy',
  },
  tree: {
    loading: 'Loading',
    failed: 'Not loaded',
    retry: 'Open it to try again',
    filter: 'Filter by name',
  },
  list: {
    unread: 'Unread',
    more: (count) => `${count} more`,
  },
  palette: {
    placeholder: 'Type a command',
    empty: 'No command found',
    command: 'Commands',
    keys: 'Keys',
  },
  scheme: {
    group: 'Look',
    light: 'Light theme',
    dark: 'Dark theme',
    system: 'System theme',
    keywords: 'look theme scheme mode appearance',
  },
  keys: {
    ctrl: 'Ctrl',
    cmd: 'Cmd',
    alt: 'Alt',
    option: 'Option',
    shift: 'Shift',
  },
  steps: {
    done: 'done',
    current: 'current step',
    upcoming: 'not started',
    error: 'failed',
    summary: (position, total) => `Step ${position} of ${total}`,
  },
  progress: {
    value: (value, max) => `${Math.round((value / max) * 100)}%`,
    indeterminate: 'In progress',
    complete: 'Complete',
    error: 'Failed',
  },
  shell: {
    skip: 'Skip to the content',
  },
  window: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
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
    invalid: 'not valid',
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
  table: {
    sortBy: (column) => `Sort by ${column}`,
    empty: 'Nothing to show',
  },
  graph: {
    view: 'View',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit the view',
    find: 'Find',
    map: 'Map',
    open: (item) => `Open ${item}`,
    close: (item) => `Close ${item}`,
    closed: (item, hidden) => `${item}, closed, hides ${hidden}`,
    hides: (item, count) => `${item}, hides ${count}`,
    external: 'external',
    chosenToo: (item) => `chosen with ${item}`,
    add: (item) => `Add under ${item}`,
    addAfter: (item) => `Add after ${item}`,
    leadsTo: (items) => `leads to ${items.join(', ')}`,
    comesFrom: (items) => `comes from ${items.join(', ')}`,
    newNode: 'New',
    roleDescription: 'graph',
    onPath: (item, steps) => `${item}, ${steps.length === 1 ? `step ${steps[0]}` : `steps ${steps.slice(0, -1).join(', ')} and ${steps[steps.length - 1]}`}`,
    line: (item, way, label) => `${label ? `${label}, ` : ''}${way} ${item}`,
  },
  reorder: {
    handle: (item) => `Move ${item}`,
    role: 'handle to move',
    instructions: 'Press Space to take it, the arrows to move it, Space to put it down, Escape to put it back.',
    taken: (item, position, total) => `${item} taken, at ${position} of ${total}`,
    moved: (item, position, total) => `${item} at ${position} of ${total}`,
    put: (item, position, total) => `${item} put down at ${position} of ${total}`,
    back: (item) => `${item} put back`,
  },
  richText: {
    toolbar: 'Text format',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    quote: 'Quote',
    undo: 'Undo',
    redo: 'Redo',
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
