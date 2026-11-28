// What can be dropped into an app, and where. Each component says what it is called, which regions of the frame take
// it (docs/patterns.md: a toolbar holds actions, a sidebar holds places, the content holds what the app is for), the
// fields that set it, and what it draws: one description (`build`, ir.ts) that the canvas, the run page and the export
// all read. A component knows nothing of the editor's library: puck.tsx turns the fields into its controls.
//
// What a component draws is made of the toolkit's parts and nothing else: no HTML element and no class (the owner's rule
// of 2026-11-23, AGENTS.md: an app writes no class of its own), so the exported app passes `sigrid-check` with
// `own-class` on (test/editor-export.test.ts). The only class names here are those of `box`, the box the canvas draws
// around a component to drag it by, which is the editor's and is never exported; they are whole words, never put
// together from pieces, as the stylesheet of the showcase is made by reading the source for them.
import type { IconName } from '../../src/primitives'
import { ICON_NAMES } from '../../src/primitives'
import { call, equals, flag, h, handler, json, list, lit, name, not, number, oneOf, slug, text, type Call, type Child, type El, type Expr, type Val } from './ir'

/** Where a component can be dropped. */
export type Region = 'bar' | 'tabs' | 'bottom' | 'sidebar' | 'group' | 'content' | 'status' | 'actions' | 'footer'

export type Option = readonly [value: string, label: string]

/** A field can be there only while the other fields say so: the words of a notice, only where a press shows one. */
type Only = { readonly only?: (p: Props) => boolean }

export type FieldSpec = Only &
  (
  | { readonly kind: 'text'; readonly label: string; readonly placeholder?: string }
  | { readonly kind: 'area'; readonly label: string }
  | { readonly kind: 'number'; readonly label: string; readonly min?: number; readonly max?: number }
  /** A few words, all in sight. */
  | { readonly kind: 'choice'; readonly label: string; readonly options: readonly Option[] }
  /** Many words, in a list that opens. */
  | { readonly kind: 'select'; readonly label: string; readonly options: readonly Option[] }
  | { readonly kind: 'toggle'; readonly label: string }
  | { readonly kind: 'icon'; readonly label: string }
  /** What a press does: nothing, go to a screen, open the menu, show the details (or show and hide them), say something, run the job. */
  | { readonly kind: 'action'; readonly label: string }
  | { readonly kind: 'rows'; readonly label: string; readonly of: Readonly<Record<string, FieldSpec>>; readonly named: string; readonly fresh: Readonly<Record<string, unknown>> }
  /** A place for other components. */
  | { readonly kind: 'slot'; readonly label: string; readonly takes: Region }
  )

export type Props = Readonly<Record<string, unknown>>

/** What a component is given to describe itself. The canvas, the run page and the export each provide their own. */
export type BuildCtx = {
  readonly appName: string
  /** Some screen of the app has details: only then is there a `details` to read. */
  readonly details: boolean
  /** The app has a job (a «Job» in the status row of a screen): only then are there `job`, `busy` and `runJob` to read. */
  readonly job: boolean
  /**
   * True on a screen with no details, in an app where other screens have them. A control of the bar is on every screen
   * (R14): one that shows the details is disabled there, not taken away. Undefined: every screen has them, or none.
   */
  readonly noDetails: Expr | undefined
  readonly screens: readonly { readonly id: string; readonly name: string; readonly icon: IconName }[]
  /** The name of the screen in sight, as an expression. */
  readonly screenName: Expr
  /** A value this component keeps while the app runs. */
  readonly state: (hint: string, initial: unknown, type?: string) => { readonly value: Expr; readonly set: Expr; readonly name: string; readonly setter: string }
  /** The components dropped into a slot, inside a part of the toolkit of their own: a column, a row, a card. */
  readonly box: (slot: string, tag: string, props: Record<string, Val>) => Child
  /** The components dropped into a slot, as they are: the element around them is the caller's. `as` lays them out on the canvas. */
  readonly spread: (slot: string, as: string) => readonly Child[]
  /** The call an action makes, if it makes one. */
  readonly act: (action: unknown, said?: unknown) => Call | undefined
  /** True while the screen an action goes to is the one in sight. */
  readonly current: (action: unknown) => Expr | undefined
}

export type Group = 'Bar' | 'Navigation' | 'Layout' | 'Text' | 'Actions' | 'Fields' | 'Data' | 'Status'

export type Def = {
  readonly label: string
  readonly icon: IconName
  readonly group: Group
  /** In one sentence, for the list of components. */
  readonly about: string
  readonly into: readonly Region[]
  readonly fields: Readonly<Record<string, FieldSpec>>
  readonly fresh: Readonly<Record<string, unknown>>
  /** The classes of the box the canvas draws around the component, where the box has to behave as the component does in its row or column. */
  readonly box?: (p: Props) => string
  readonly build: (p: Props, ctx: BuildCtx) => Child
}

/* ———— Pieces shared by the components ———— */

const NO_ICON = 'none'
export const ICON_OPTIONS: readonly Option[] = [[NO_ICON, 'No icon'], ...ICON_NAMES.map((id): Option => [id, id])]
const icon = (value: unknown): El | undefined => (typeof value === 'string' && value !== NO_ICON && (ICON_NAMES as readonly string[]).includes(value) ? h('Icon', { name: value }) : undefined)

const ACTION: FieldSpec = { kind: 'action', label: 'On press' }
/** A press that does nothing: a row that opens more, set to no action, is still a button. */
const NOTHING: Expr = { $expr: '() => {}', run: () => () => {} }
/** A button that runs the job cannot be pressed again while the job runs. */
const waits = (p: Props, ctx: BuildCtx): Expr | undefined => (p['action'] === 'job' && ctx.job ? name('busy') : undefined)
/** A button of a bar that shows the details, on a screen that has none, stays in its place disabled (R14). */
const idle = (p: Props, ctx: BuildCtx): Expr | undefined => ((p['action'] === 'details' || p['action'] === 'show') && ctx.details ? ctx.noDetails : undefined)
const SAID: FieldSpec = { kind: 'text', label: 'What the notice says', placeholder: 'Saved', only: (p) => p['action'] === 'say' }

// The steps of the toolkit's spacing scale (`Space`). «None», from apps made before the layout parts, is the smallest step.
const GAP_OPTIONS: readonly Option[] = [['xs', '4'], ['sm', '8'], ['md', '12'], ['lg', '16'], ['xl', '24']]
const gapOf = (value: unknown) => (value === 'none' ? 'xs' : oneOf(value, ['lg', 'xs', 'sm', 'md', 'xl'] as const))

const BUTTON_VARIANTS: readonly Option[] = [['default', 'Solid'], ['outline', 'Outline'], ['secondary', 'Quiet'], ['ghost', 'Plain'], ['destructive', 'Delete'], ['link', 'Link']]

/** The tones of a paragraph, as `Text` names them; a quiet line made small, as apps made before the layout parts did, is a note. */
const TONES = { soft: 'soft', ink: 'body', mute: 'muted', note: 'note', caption: 'caption' } as const
/** The narrowest column of a grid of so many columns: the grid takes as many as the width holds (`Grid min`). */
const COLUMNS = { '2': 'lg', '3': 'md', '4': 'sm' } as const
/** The padding of a card, as a step of the scale: 8, 16 or 24px. */
const PADS = { sm: 'sm', md: 'lg', lg: 'xl' } as const
/**
 * The parts that keep the width of their content (a button, a badge): in a pile, which stretches its parts, each is put
 * in a row of its own (plan.ts `piled`); in a row, or a region that is one, it stands as it is.
 */
export const FITS = new WeakSet<El>()
const own = (el: El): El => {
  FITS.add(el)
  return el
}

/** The box the canvas draws around a component: a column of one, so the component inside is stretched as it is in a column of the app. */
export const BOX = 'flex min-w-0 flex-col'

/* ———— The components ———— */

export const CATALOG = {
  /* ——— The bar at the head ——— */
  Brand: {
    label: 'App and place',
    icon: 'layout',
    group: 'Bar',
    about: 'The mark and the name of the app, then where the user is.',
    into: ['bar'],
    fields: {
      name: { kind: 'text', label: 'Name', placeholder: 'The name of the app' },
      mark: { kind: 'toggle', label: 'Mark with the initial' },
      page: { kind: 'choice', label: 'After the name', options: [['screen', 'The screen'], ['custom', 'A word'], ['none', 'Nothing']] },
      word: { kind: 'text', label: 'The word', placeholder: 'Settings', only: (p) => p['page'] === 'custom' },
    },
    fresh: { name: '', mark: true, page: 'screen', word: '' },
    box: () => 'flex min-w-0 shrink items-center',
    build: (p, ctx) => {
      const page = oneOf(p['page'], ['screen', 'custom', 'none'] as const)
      return h('ToolbarBrand', { name: text(p['name']) || ctx.appName, mark: flag(p['mark']) ? undefined : false, page: page === 'screen' ? ctx.screenName : page === 'custom' ? text(p['word']) || undefined : undefined })
    },
  },
  BarTitle: {
    label: 'Title',
    icon: 'font',
    group: 'Bar',
    about: 'A word in the bar, where there is no mark.',
    into: ['bar', 'tabs'],
    fields: { text: { kind: 'text', label: 'Text' } },
    fresh: { text: 'Inbox' },
    box: () => 'flex min-w-0 shrink items-center',
    build: (p) => h('ToolbarTitle', null, text(p['text'])),
  },
  BarButton: {
    label: 'Bar button',
    icon: 'plus',
    group: 'Bar',
    about: 'An action of the bar: an icon with its name as a hint, or an icon and a word.',
    into: ['bar', 'tabs', 'bottom'],
    fields: {
      label: { kind: 'text', label: 'Name' },
      icon: { kind: 'icon', label: 'Icon' },
      word: { kind: 'toggle', label: 'Show the name beside the icon' },
      keepWord: { kind: 'toggle', label: 'Keep the name on a narrow bar', only: (p) => flag(p['word']) },
      variant: { kind: 'choice', label: 'Look', options: [['ghost', 'Plain'], ['outline', 'Outline'], ['default', 'Solid']] },
      shortcut: { kind: 'text', label: 'Key', placeholder: 'Ctrl N' },
      action: ACTION,
      said: SAID,
    },
    fresh: { label: 'New', icon: 'plus', word: true, keepWord: false, variant: 'outline', shortcut: '', action: 'none', said: '' },
    box: () => 'flex shrink-0 items-center',
    build: (p, ctx) => {
      const label = text(p['label'], 'Action')
      const variant = oneOf(p['variant'], ['ghost', 'outline', 'default'] as const)
      const drawn = icon(p['icon'])
      const word = flag(p['word']) || !drawn
      return h(
        'ToolbarButton',
        { label, icon: drawn, shortcut: text(p['shortcut']) || undefined, variant: variant === 'ghost' ? undefined : variant, keepWord: flag(p['keepWord']) && word ? true : undefined, pressed: p['action'] === 'details' && ctx.details ? name('details') : undefined, disabled: waits(p, ctx) ?? idle(p, ctx), onClick: handler(ctx.act(p['action'], p['said'])) },
        word ? label : null,
      )
    },
  },
  BarSearch: {
    label: 'Search',
    icon: 'search',
    group: 'Bar',
    about: 'A search that takes no room until asked for, or rests as a field.',
    into: ['bar', 'tabs'],
    fields: {
      label: { kind: 'text', label: 'Name' },
      closed: { kind: 'choice', label: 'At rest', options: [['icon', 'A magnifier'], ['field', 'A field']] },
      shortcut: { kind: 'text', label: 'Key', placeholder: 'Ctrl K' },
    },
    fresh: { label: 'Search', closed: 'icon', shortcut: '' },
    box: () => 'flex min-w-0 shrink items-center',
    build: (p, ctx) => {
      const typed = ctx.state('search', '')
      return h('ToolbarSearch', { label: text(p['label'], 'Search'), value: typed.value, onValueChange: typed.set, closed: p['closed'] === 'field' ? 'field' : undefined, shortcut: text(p['shortcut']) || undefined })
    },
  },
  ViewTabs: {
    label: 'View tabs',
    icon: 'column',
    group: 'Bar',
    about: 'The screens of the app, or the views of one screen, as words in a bar.',
    into: ['bar', 'tabs'],
    fields: {
      source: { kind: 'choice', label: 'The tabs are', options: [['screens', 'The screens'], ['custom', 'Views of this bar']] },
      tabs: { kind: 'rows', label: 'Views', named: 'label', of: { label: { kind: 'text', label: 'Name' } }, fresh: { label: 'View' }, only: (p) => p['source'] === 'custom' },
      size: { kind: 'choice', label: 'Size', options: [['md', 'Regular'], ['sm', 'Small']] },
    },
    fresh: { source: 'screens', tabs: [{ label: 'All' }, { label: 'Unread' }, { label: 'Flagged' }], size: 'md' },
    box: () => 'flex shrink-0 self-stretch',
    build: (p, ctx) => tabs(p, ctx, {}),
  },
  DocTabs: {
    label: 'Document tabs',
    icon: 'file',
    group: 'Bar',
    about: 'The documents open in the app, as tabs: a press moves between them, a cross closes one, a plus opens a new one. In the one top row of the sheet frame they are joined to the sheet.',
    into: ['tabs'],
    fields: {
      tabs: { kind: 'rows', label: 'Open at the start', named: 'label', of: { label: { kind: 'text', label: 'Title' } }, fresh: { label: 'Untitled' } },
      closable: { kind: 'toggle', label: 'A cross closes a tab' },
      addable: { kind: 'toggle', label: 'A plus opens a new tab' },
    },
    fresh: { tabs: [{ label: 'Draft' }, { label: 'Notes' }], closable: true, addable: true },
    // Attached to the sheet, the tabs reach the foot of their row.
    box: () => 'flex min-w-0 shrink items-end self-stretch',
    // The documents are the app's own state, as its notices and its job are (plan.ts): `docs`, the one in sight
    // `activeDoc`, and the ways to add and close one. Never in a toolbar: Ark UI's tabs are a tablist of their own.
    build: (p) => h('DocumentTabs', { value: name('activeDoc'), onValueChange: name('setActiveDoc'), onAdd: flag(p['addable']) ? name('addDoc') : undefined }, flag(p['closable']) ? OPEN_DOCS_CLOSING : OPEN_DOCS),
  },
  BottomTabs: {
    label: 'Tabs at the foot',
    icon: 'moveDown',
    group: 'Bar',
    about: 'The screens as tabs at the foot of a phone: an icon over a word, up to five.',
    into: ['bottom'],
    fields: {
      source: { kind: 'choice', label: 'The tabs are', options: [['screens', 'The screens'], ['custom', 'Views of this bar']] },
      tabs: { kind: 'rows', label: 'Views', named: 'label', of: { label: { kind: 'text', label: 'Name' }, icon: { kind: 'icon', label: 'Icon' } }, fresh: { label: 'View', icon: 'all' }, only: (p) => p['source'] === 'custom' },
    },
    fresh: { source: 'screens', tabs: [{ label: 'List', icon: 'all' }, { label: 'Board', icon: 'structure' }] },
    box: () => 'flex min-w-0 flex-1 self-stretch',
    build: (p, ctx) => tabs(p, ctx, { edge: 'top', layout: 'stacked' }),
  },
  MenuButton: {
    label: 'Menu button',
    icon: 'sidebarOpen',
    group: 'Bar',
    about: 'Opens the sidebar. It is in the bar only where the sidebar is a drawer.',
    into: ['bar'],
    fields: {},
    fresh: {},
    box: () => 'flex shrink-0 items-center',
    build: () => h('DrawerButton', { onOpen: handler(call('setMenu', true)) }),
  },
  Spacer: {
    label: 'Space',
    icon: 'minus',
    group: 'Bar',
    about: 'Takes the room that is left and pushes what follows to the end. In a title bar it moves the window.',
    into: ['bar', 'tabs', 'status', 'actions', 'footer', 'content'],
    fields: {},
    fresh: {},
    box: () => 'flex min-w-2 flex-1 self-stretch',
    build: () => h('ToolbarSpacer'),
  },
  BarSeparator: {
    label: 'Separator',
    icon: 'minus',
    group: 'Bar',
    about: 'A short line between two groups of a bar.',
    into: ['bar', 'tabs'],
    fields: {},
    fresh: {},
    box: () => 'flex shrink-0 items-center',
    build: () => h('ToolbarSeparator'),
  },

  /* ——— The sidebar ——— */
  NavGroup: {
    label: 'Group of places',
    icon: 'structure',
    group: 'Navigation',
    about: 'A group of rows of the sidebar, with a heading or without one.',
    into: ['sidebar'],
    fields: {
      label: { kind: 'text', label: 'Heading', placeholder: 'No heading' },
      icon: { kind: 'icon', label: 'Icon of the heading', only: (p) => text(p['label']) !== '' },
      collapsible: { kind: 'toggle', label: 'The heading opens and closes it', only: (p) => text(p['label']) !== '' },
      items: { kind: 'slot', label: 'Places', takes: 'group' },
    },
    fresh: { label: '', icon: 'tag', collapsible: false, items: [] },
    build: (p, ctx) => {
      const label = text(p['label'])
      return h('SidebarGroup', { label: label || undefined, icon: label ? icon(p['icon']) : undefined, collapsible: label && flag(p['collapsible']) ? true : undefined }, ctx.spread('items', 'flex flex-col gap-0.5'))
    },
  },
  NavItem: {
    label: 'Place',
    icon: 'inbox',
    group: 'Navigation',
    about: 'A row of the sidebar: an icon, a name, a count. A place, not an action.',
    into: ['group'],
    fields: {
      label: { kind: 'text', label: 'Name' },
      icon: { kind: 'icon', label: 'Icon' },
      count: { kind: 'number', label: 'Count', min: 0 },
      action: { kind: 'action', label: 'Goes to' },
    },
    fresh: { label: 'Inbox', icon: 'inbox', count: 0, action: 'none' },
    build: (p, ctx) => {
      const count = number(p['count'])
      return h('NavItem', { current: ctx.current(p['action']), icon: icon(p['icon']), end: count > 0 ? h('Count', { value: count, label: 'items', reserve: true }) : undefined, onClick: handler(ctx.act(p['action'])) }, text(p['label'], 'Place'))
    },
  },

  /* ——— Layout ——— */
  Stack: {
    label: 'Column',
    icon: 'column',
    group: 'Layout',
    about: 'Components one under the other, a step of the spacing scale apart.',
    into: ['content'],
    fields: { gap: { kind: 'choice', label: 'Space between', options: GAP_OPTIONS }, items: { kind: 'slot', label: 'Components', takes: 'content' } },
    fresh: { gap: 'lg', items: [] },
    build: (p, ctx) => ctx.box('items', 'Column', { gap: gapOf(p['gap']) }),
  },
  Row: {
    label: 'Row',
    icon: 'moveRight',
    group: 'Layout',
    about: 'Components side by side; they wrap to a new line where there is no room.',
    into: ['content'],
    fields: {
      gap: { kind: 'choice', label: 'Space between', options: GAP_OPTIONS },
      align: { kind: 'choice', label: 'Along the row', options: [['start', 'Start'], ['center', 'Centre'], ['end', 'End'], ['between', 'Apart']] },
      items: { kind: 'slot', label: 'Components', takes: 'content' },
    },
    fresh: { gap: 'sm', align: 'start', items: [] },
    build: (p, ctx) => {
      const align = oneOf(p['align'], ['start', 'center', 'end', 'between'] as const)
      return ctx.box('items', 'Cluster', { gap: gapOf(p['gap']) === 'sm' ? undefined : gapOf(p['gap']), justify: align === 'start' ? undefined : align })
    },
  },
  Grid: {
    label: 'Grid',
    icon: 'layout',
    group: 'Layout',
    about: 'Columns that become one where the place is narrow.',
    into: ['content'],
    fields: { columns: { kind: 'choice', label: 'Columns', options: [['2', '2'], ['3', '3'], ['4', '4']] }, items: { kind: 'slot', label: 'Components', takes: 'content' } },
    fresh: { columns: '2', items: [] },
    build: (p, ctx) => ctx.box('items', 'Grid', { min: COLUMNS[oneOf(p['columns'], ['2', '3', '4'] as const)], gap: 'lg' }),
  },
  Card: {
    label: 'Card',
    icon: 'layout',
    group: 'Layout',
    about: 'A surface that holds components: raised with a shadow and no border, or a quiet fill.',
    into: ['content'],
    fields: {
      look: { kind: 'choice', label: 'Surface', options: [['raised', 'Raised'], ['quiet', 'Quiet fill']] },
      pad: { kind: 'choice', label: 'Padding', options: [['sm', '8'], ['md', '16'], ['lg', '24']] },
      items: { kind: 'slot', label: 'Components', takes: 'content' },
    },
    fresh: { look: 'raised', pad: 'md', items: [] },
    build: (p, ctx) => ctx.box('items', 'Card', { variant: p['look'] === 'quiet' ? 'quiet' : undefined, pad: PADS[oneOf(p['pad'], ['md', 'sm', 'lg'] as const)] === 'lg' ? undefined : PADS[oneOf(p['pad'], ['md', 'sm', 'lg'] as const)] }),
  },
  Panel: {
    label: 'Panel',
    icon: 'layout',
    group: 'Layout',
    about: 'A titled part of the content, as in Xiox: a heading with a quieter line beside it, and a body under it.',
    into: ['content'],
    fields: {
      title: { kind: 'text', label: 'Title' },
      subtitle: { kind: 'text', label: 'Line beside it', placeholder: '12 items · 3 selected' },
      items: { kind: 'slot', label: 'Body', takes: 'content' },
    },
    fresh: { title: 'Items', subtitle: '', items: [] },
    box: () => `${BOX} min-h-0 flex-1`,
    build: (p, ctx) => h('Panel', { title: text(p['title'], 'Panel'), subtitle: text(p['subtitle']) || undefined }, ctx.box('items', 'Column', { gap: 'md', pad: 'lg' })),
  },
  Divider: {
    label: 'Line',
    icon: 'minus',
    group: 'Layout',
    about: 'A line between two groups.',
    into: ['content'],
    fields: {},
    fresh: {},
    build: () => h('Separator'),
  },

  /* ——— Text ——— */
  Heading: {
    label: 'Heading',
    icon: 'font',
    group: 'Text',
    about: 'The title of a page, a section or a card.',
    into: ['content'],
    fields: { text: { kind: 'text', label: 'Text' }, level: { kind: 'choice', label: 'Of', options: [['page', 'A page'], ['section', 'A section'], ['card', 'A card'], ['small', 'A dialog']] } },
    fresh: { text: 'Today', level: 'section' },
    build: (p) => {
      const size = oneOf(p['level'], ['section', 'page', 'card', 'small'] as const)
      return h('Heading', { size: size === 'section' ? undefined : size }, text(p['text'], 'Heading'))
    },
  },
  Text: {
    label: 'Text',
    icon: 'quote',
    group: 'Text',
    about: 'A paragraph: body text, or a quieter line under a title.',
    into: ['content'],
    fields: {
      text: { kind: 'area', label: 'Text' },
      tone: { kind: 'choice', label: 'Tone', options: [['soft', 'Body'], ['ink', 'Ink'], ['mute', 'Quiet'], ['note', 'Small'], ['caption', 'Caption']] },
    },
    fresh: { text: 'A sentence that says what this is for.', tone: 'soft' },
    build: (p) => {
      const tone = oneOf(p['tone'], ['soft', 'ink', 'mute', 'note', 'caption'] as const)
      return h('Text', { as: 'p', variant: TONES[tone === 'mute' && p['size'] === 'xs' ? 'note' : tone] }, text(p['text']))
    },
  },
  Markdown: {
    label: 'Formatted text',
    icon: 'bulletList',
    group: 'Text',
    about: 'Text with bold, lists and check boxes, written as Markdown.',
    into: ['content'],
    fields: { text: { kind: 'area', label: 'Markdown' } },
    fresh: { text: '**Before the call**\n\n- Read the quote\n- Check the two numbers on page 3' },
    build: (p) => h('MarkdownBlocks', { text: text(p['text']) }),
  },

  /* ——— Actions ——— */
  Button: {
    label: 'Button',
    icon: 'check',
    group: 'Actions',
    about: 'An action. One solid button on a screen; the others are outline or plain.',
    into: ['content', 'actions'],
    fields: {
      label: { kind: 'text', label: 'Label' },
      variant: { kind: 'select', label: 'Look', options: BUTTON_VARIANTS },
      size: { kind: 'choice', label: 'Size', options: [['default', 'Regular'], ['sm', 'Small']] },
      icon: { kind: 'icon', label: 'Icon' },
      wide: { kind: 'toggle', label: 'As wide as its place' },
      action: ACTION,
      said: SAID,
    },
    fresh: { label: 'Save', variant: 'default', size: 'default', icon: NO_ICON, wide: false, action: 'none', said: '' },
    box: (p) => (flag(p['wide']) ? BOX : `${BOX} w-fit`),
    build: (p, ctx) => {
      const variant = oneOf(p['variant'], ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const)
      const button = h('Button', { variant: variant === 'default' ? undefined : variant, size: p['size'] === 'sm' ? 'sm' : undefined, disabled: waits(p, ctx), onClick: handler(ctx.act(p['action'], p['said'])) }, icon(p['icon']), text(p['label'], 'Button'))
      return flag(p['wide']) ? button : own(button)
    },
  },

  /* ——— Fields ——— */
  Field: {
    label: 'Field',
    icon: 'rename',
    group: 'Fields',
    about: 'A field with its label above it, and a sentence under it if it needs one.',
    into: ['content'],
    fields: {
      label: { kind: 'text', label: 'Label' },
      kind: { kind: 'select', label: 'Holds', options: [['text', 'Text'], ['area', 'Several lines'], ['email', 'An address'], ['number', 'A number'], ['password', 'A password'], ['search', 'A search'], ['tel', 'A phone number'], ['url', 'A link']] },
      placeholder: { kind: 'text', label: 'Placeholder' },
      help: { kind: 'text', label: 'Sentence under it' },
      required: { kind: 'toggle', label: 'Required' },
    },
    fresh: { label: 'Name', kind: 'text', placeholder: '', help: '', required: false },
    build: (p) => {
      const kind = oneOf(p['kind'], ['text', 'area', 'email', 'number', 'password', 'search', 'tel', 'url'] as const)
      const placeholder = text(p['placeholder']) || undefined
      const control = kind === 'area' ? h('Textarea', { placeholder }) : h('Input', { type: kind === 'text' ? undefined : kind, placeholder, autoComplete: 'off' })
      return h('FormField', { label: text(p['label'], 'Field'), help: text(p['help']) || undefined, required: flag(p['required']) ? true : undefined }, control)
    },
  },
  Choice: {
    label: 'Select',
    icon: 'chevronDown',
    group: 'Fields',
    about: 'One of many, in a list that opens. For a few choices use a segment control.',
    into: ['content'],
    fields: { label: { kind: 'text', label: 'Label' }, options: { kind: 'rows', label: 'Choices', named: 'label', of: { label: { kind: 'text', label: 'Name' } }, fresh: { label: 'Choice' } } },
    fresh: { label: 'Project', options: [{ label: 'Home' }, { label: 'Work' }, { label: 'Clients' }] },
    build: (p, ctx) => {
      const options = named(p['options'])
      const chosen = ctx.state('choice', options[0]?.value ?? '')
      return h('FormField', { label: text(p['label'], 'Choice') }, h('Select', { options: json(options), value: chosen.value, onValueChange: chosen.set }))
    },
  },
  Day: {
    label: 'Date',
    icon: 'date',
    group: 'Fields',
    about: 'A day, chosen from a calendar. On a phone the calendar is a sheet at the foot.',
    into: ['content'],
    fields: { label: { kind: 'text', label: 'Label' } },
    fresh: { label: 'Due date' },
    build: (p, ctx) => {
      const day = ctx.state('day', null, 'string | null')
      return h('FormField', { label: text(p['label'], 'Date') }, h('DateField', { value: day.value, onChange: day.set }))
    },
  },
  Check: {
    label: 'Check box',
    icon: 'check',
    group: 'Fields',
    about: 'One thing that is done or not, with its words beside it.',
    into: ['content'],
    fields: { label: { kind: 'text', label: 'Words' }, on: { kind: 'toggle', label: 'Checked at the start' } },
    fresh: { label: 'Print the contract', on: false },
    build: (p) => {
      const label = text(p['label'], 'Done')
      return h('Checkbox', { label, defaultChecked: flag(p['on']) ? true : undefined })
    },
  },
  Segment: {
    label: 'Segment control',
    icon: 'more',
    group: 'Fields',
    about: 'One of a few choices, all in sight.',
    into: ['content'],
    fields: {
      label: { kind: 'text', label: 'Name, for screen readers' },
      options: { kind: 'rows', label: 'Choices', named: 'label', of: { label: { kind: 'text', label: 'Name' } }, fresh: { label: 'Choice' } },
      wide: { kind: 'toggle', label: 'As wide as its place' },
    },
    fresh: { label: 'When', options: [{ label: 'Today' }, { label: 'Tomorrow' }, { label: 'No date' }], wide: false },
    box: (p) => (flag(p['wide']) ? BOX : `${BOX} w-fit`),
    build: (p, ctx) => {
      const options = named(p['options'])
      const wide = flag(p['wide'])
      const chosen = ctx.state('choice', options[0]?.value ?? '')
      return h('ToggleGroup', { 'aria-label': text(p['label'], 'Choice'), value: chosen.value, onValueChange: chosen.set, fill: wide ? true : undefined }, options.map((option) => h('ToggleGroupItem', { value: option.value }, option.label)))
    },
  },
  Setting: {
    label: 'Setting row',
    icon: 'settings',
    group: 'Fields',
    about: 'A choice of a settings page: its name at the start, its control at the end. It takes effect at once.',
    into: ['content'],
    fields: {
      label: { kind: 'text', label: 'Name' },
      about: { kind: 'text', label: 'Line under it' },
      control: { kind: 'choice', label: 'Control', options: [['switch', 'A switch'], ['segment', 'A few choices'], ['more', 'Opens more']] },
      on: { kind: 'toggle', label: 'On at the start', only: (p) => (p['control'] ?? 'switch') === 'switch' },
      options: { kind: 'rows', label: 'Choices', named: 'label', of: { label: { kind: 'text', label: 'Name' } }, fresh: { label: 'Choice' }, only: (p) => p['control'] === 'segment' },
      action: { ...ACTION, only: (p) => p['control'] === 'more' },
    },
    fresh: { label: 'Reminders', about: '', control: 'switch', on: true, options: [{ label: 'Light' }, { label: 'Dark' }], action: 'none' },
    build: (p, ctx) => {
      const label = text(p['label'], 'Setting')
      const about = text(p['about'])
      const control = oneOf(p['control'], ['switch', 'segment', 'more'] as const)
      const description = about || undefined
      // A row that opens more is a button as a whole; it does something only where its action does.
      if (control === 'more') return h('SettingRow', { label, description, onClick: handler(ctx.act(p['action'])) ?? NOTHING })
      if (control === 'segment') {
        const options = named(p['options'])
        const chosen = ctx.state('setting', options[0]?.value ?? '')
        return h('SettingRow', { label, description, control: h('ToggleGroup', { 'aria-label': label, value: chosen.value, onValueChange: chosen.set }, options.map((option) => h('ToggleGroupItem', { value: option.value }, option.label))) })
      }
      return h('SettingRow', { label, description, control: h('Switch', { 'aria-label': label, defaultChecked: flag(p['on']) ? true : undefined }) })
    },
  },

  /* ——— Data ——— */
  List: {
    label: 'List',
    icon: 'all',
    group: 'Data',
    about: 'Things to read and act on: a title, a line under it, a fact at the end, a dot for what is not read.',
    into: ['content'],
    fields: {
      label: { kind: 'text', label: 'Name, for screen readers' },
      rows: {
        kind: 'rows',
        label: 'Rows',
        named: 'title',
        of: { title: { kind: 'text', label: 'Title' }, line: { kind: 'text', label: 'Line under it' }, fact: { kind: 'text', label: 'Fact at the end' }, unread: { kind: 'toggle', label: 'Not read yet' } },
        fresh: { title: 'A new row', line: '', fact: '', unread: false },
      },
      chosen: { kind: 'toggle', label: 'A press chooses the row' },
      action: ACTION,
    },
    fresh: {
      label: 'Messages',
      rows: [
        { title: 'Kitchen quote, second version', line: 'Marta Riva', fact: '09:42', unread: true },
        { title: 'Receipt of the waste tax', line: 'City of Bergamo', fact: '08:15', unread: false },
        { title: 'Photos of Tuesday’s survey', line: 'Luca Ferri', fact: 'Mon', unread: false },
      ],
      chosen: true,
      action: 'none',
    },
    build: (p, ctx) => {
      const rows = list(p['rows'])
      const dots = rows.some((row) => flag(row['unread']))
      const row = flag(p['chosen']) ? ctx.state('row', 0) : null
      const press = ctx.act(p['action'])
      return h(
        'ItemList',
        { 'aria-label': text(p['label'], 'List') },
        rows.map((r, at) =>
          h('ItemRow', {
            title: text(r['title'], 'Row'),
            description: text(r['line']) || undefined,
            meta: text(r['fact']) || undefined,
            unread: dots ? flag(r['unread']) : undefined,
            current: row ? equals(row.name, at) : undefined,
            onClick: handler(row ? call(row.setter, at) : undefined, press),
          }),
        ),
      )
    },
  },
  Board: {
    label: 'Board',
    icon: 'structure',
    group: 'Data',
    about: 'Work that moves through stages: lanes on the quiet fill, cards raised with the smallest shadow.',
    into: ['content'],
    fields: {
      lanes: { kind: 'rows', label: 'Lanes', named: 'name', of: { name: { kind: 'text', label: 'Name' }, cards: { kind: 'area', label: 'Cards, one on each line' } }, fresh: { name: 'Lane', cards: 'A card' } },
    },
    fresh: { lanes: [{ name: 'To do', cards: 'Renew the identity card\nBook the train to Rome' }, { name: 'Doing', cards: 'Draft of the quote' }, { name: 'Done', cards: 'Pay the waste tax' }] },
    // The lanes are as many columns as the width holds; on a narrow one they go one under the other.
    build: (p) =>
      h(
        'Grid',
        { min: 'sm' },
        list(p['lanes']).map((lane) => {
          const name = text(lane['name'], 'Lane')
          const cards = text(lane['cards']).split('\n').map((card) => card.trim()).filter(Boolean)
          return h(
            'Card',
            { as: 'section', 'aria-label': name, variant: 'quiet', pad: 'sm', gap: 'sm' },
            h('Cluster', { gap: 'sm' }, h('Text', { variant: 'strong' }, name), h('Count', { value: cards.length, label: 'cards' })),
            cards.map((card) => h('Card', { pad: 'sm' }, card)),
          )
        }),
      ),
  },
  Empty: {
    label: 'Empty state',
    icon: 'info',
    group: 'Data',
    about: 'What a list says when there is nothing in it, with the way to add.',
    into: ['content'],
    fields: { title: { kind: 'text', label: 'Title' }, about: { kind: 'text', label: 'Sentence' }, button: { kind: 'text', label: 'Button', placeholder: 'No button' }, action: { ...ACTION, only: (p) => text(p['button']) !== '' }, said: { ...SAID, only: (p) => text(p['button']) !== '' && p['action'] === 'say' } },
    fresh: { title: 'Nothing here', about: 'Add the first one with the plus in the bar.', button: '', action: 'none', said: '' },
    build: (p, ctx) => {
      const label = text(p['button'])
      return h('Empty', { fill: true, title: text(p['title'], 'Nothing here'), description: text(p['about']) || undefined, action: label ? h('Button', { variant: 'outline', onClick: handler(ctx.act(p['action'], p['said'])) }, label) : undefined })
    },
  },
  Person: {
    label: 'Person',
    icon: 'account',
    group: 'Data',
    about: 'An avatar with the initials, a name and a line under it.',
    into: ['content'],
    fields: { name: { kind: 'text', label: 'Name' }, line: { kind: 'text', label: 'Line under it' } },
    fresh: { name: 'Marta Riva', line: 'marta.riva@example.com' },
    build: (p) => {
      const who = text(p['name'], 'Someone')
      const line = text(p['line'])
      return h('Cluster', { gap: 'md', wrap: false }, h('Avatar', { name: who, size: 'sm', decorative: true }), h('Column', { gap: 'xs' }, h('Text', { variant: 'strong' }, who), line ? h('Text', { variant: 'note' }, line) : null))
    },
  },

  /* ——— Status ——— */
  Label: {
    label: 'Badge',
    icon: 'tag',
    group: 'Status',
    about: 'A short label. Never a count, never in the accent.',
    into: ['content', 'bar', 'status'],
    fields: { text: { kind: 'text', label: 'Text' }, look: { kind: 'choice', label: 'Look', options: [['secondary', 'Quiet'], ['default', 'Solid'], ['outline', 'Outline']] } },
    fresh: { text: 'Preview', look: 'secondary' },
    box: () => `${BOX} w-fit shrink-0`,
    build: (p) => own(h('Badge', { variant: oneOf(p['look'], ['secondary', 'default', 'outline'] as const) }, text(p['text'], 'Label'))),
  },
  Progress: {
    label: 'Progress',
    icon: 'now',
    group: 'Status',
    about: 'How far a task is: a bar, a ring or blocks. It says its word when done.',
    into: ['content'],
    fields: {
      label: { kind: 'text', label: 'What is progressing' },
      shape: { kind: 'choice', label: 'Shape', options: [['bar', 'Bar'], ['ring', 'Ring'], ['blocks', 'Blocks']] },
      value: { kind: 'number', label: 'How far, in a hundred', min: 0, max: 100 },
    },
    fresh: { label: 'Upload', shape: 'bar', value: 40 },
    build: (p) => {
      const shape = oneOf(p['shape'], ['bar', 'ring', 'blocks'] as const)
      const value = Math.min(100, Math.max(0, number(p['value'], 40)))
      const label = text(p['label'], 'Progress')
      if (shape === 'blocks') return h('ProgressSegments', { 'aria-label': label, value: Math.round(value / 10), showValue: true })
      return h(shape === 'ring' ? 'ProgressRing' : 'Progress', { 'aria-label': label, value, showValue: true })
    },
  },
  Path: {
    label: 'Steps',
    icon: 'listOrdered',
    group: 'Status',
    about: 'The stages of a task as a path: what is done, where the user is, what is left.',
    into: ['content'],
    fields: {
      label: { kind: 'text', label: 'Name, for screen readers' },
      steps: { kind: 'rows', label: 'Steps', named: 'label', of: { label: { kind: 'text', label: 'Name' }, about: { kind: 'text', label: 'What it asks' } }, fresh: { label: 'Step', about: '' } },
      at: { kind: 'number', label: 'The user is on step', min: 1 },
      row: { kind: 'toggle', label: 'In a row' },
    },
    fresh: { label: 'Signup', steps: [{ label: 'Account', about: 'An address and a password' }, { label: 'Plan', about: '' }, { label: 'Confirm', about: '' }], at: 2, row: false },
    build: (p) => {
      const steps = list(p['steps']).map((step) => ({ label: text(step['label'], 'Step'), ...(text(step['about']) ? { description: text(step['about']) } : {}) }))
      const row = flag(p['row'])
      return h('Steps', { 'aria-label': text(p['label'], 'Steps'), steps: json(steps), current: Math.max(0, Math.round(number(p['at'], 1)) - 1), orientation: row ? 'horizontal' : undefined })
    },
  },

  /* ——— The status row and the strip at the foot ——— */
  FootText: {
    label: 'Fact',
    icon: 'info',
    group: 'Status',
    about: 'A fact in the status row or in the strip at the foot: the last result, the state of the service, a count.',
    into: ['status', 'footer'],
    fields: { text: { kind: 'text', label: 'Text' } },
    fresh: { text: 'Connected' },
    box: () => 'flex shrink-0',
    build: (p) => h('Text', null, text(p['text'], 'Connected')),
  },
  KeyHint: {
    label: 'Key and word',
    icon: 'rename',
    group: 'Status',
    about: 'A key that works now, as plain text, and what it does. Hidden on a phone.',
    into: ['footer', 'content'],
    fields: { keys: { kind: 'text', label: 'Key' }, word: { kind: 'text', label: 'What it does' } },
    fresh: { keys: 'Z', word: 'undo' },
    box: () => 'flex shrink-0',
    build: (p) => h('KeyHints', { ids: json([{ keys: text(p['keys'], 'Z'), label: text(p['word']) }]) }),
  },
  Job: {
    label: 'Job',
    icon: 'refresh',
    group: 'Status',
    about: 'A job of the whole window (an analysis, a scan), as Xiox shows it: its result, and while it runs its progress. A button set to «Run the job» starts it.',
    into: ['status'],
    fields: {
      result: { kind: 'text', label: 'Result, when it is not running', placeholder: 'Analysis done' },
      state: { kind: 'text', label: 'State while it runs', placeholder: 'Analyzing' },
      label: { kind: 'text', label: 'The job', placeholder: 'Analyzing…' },
      items: { kind: 'area', label: 'What it goes through, one on each line' },
      preview: { kind: 'toggle', label: 'Show it running on the canvas' },
    },
    fresh: { result: 'Analysis done', state: 'Analyzing', label: 'Analyzing…', items: 'System\nBrowser\nApplications', preview: false },
    box: () => 'flex min-w-0 items-center gap-3',
    // While it runs: the state, the job, the bar, how far, the item it is on (docs/patterns.md, «Progress of a task»).
    build: (p) => {
      const label = text(p['label'], 'Working…')
      const items = text(p['items']).split('\n').map((item) => item.trim()).filter(Boolean)
      const busy = name('busy')
      const running = h(
        'Fragment',
        null,
        h('Badge', { variant: 'secondary' }, text(p['state'], 'Working')),
        h('Text', { variant: 'soft' }, label),
        h('Progress', { 'aria-label': label, value: name('job'), size: 'sm', inline: true }),
        h('Text', { variant: 'strong' }, name('job'), '%'),
        items.length > 0 ? h('Text', null, itemAt(items)) : null,
      )
      return h('Fragment', null, { $when: busy, then: running }, { $when: not(busy), then: h('Text', { variant: 'soft' }, text(p['result'], 'Done')) })
    },
  },
} as const satisfies Record<string, Def>

export type Kind = keyof typeof CATALOG
export const KINDS = Object.keys(CATALOG) as Kind[]
export const isKind = (value: unknown): value is Kind => typeof value === 'string' && Object.prototype.hasOwnProperty.call(CATALOG, value)
export const defOf = (kind: Kind): Def => CATALOG[kind]
/** The components a region takes. */
export const takenBy = (region: Region): Kind[] => KINDS.filter((kind) => (CATALOG[kind].into as readonly Region[]).includes(region))
export const GROUPS: readonly Group[] = ['Bar', 'Navigation', 'Layout', 'Text', 'Actions', 'Fields', 'Data', 'Status']

/* ———— Builders shared by two components ———— */

/** Rows with a name, as the options of a control: the value is the name as a word. Two rows of one name stay two, each with a value of its own. */
function named(rows: unknown): { value: string; label: string }[] {
  const taken = new Set<string>()
  return list(rows).map((row) => {
    const label = text(row['label'], 'Choice')
    const base = slug(label, 'choice')
    // «A», «A», «A 2»: a value is given once, so the third is `a-2-2` and not a second `a-2`.
    let value = base
    for (let times = 2; taken.has(value); times++) value = `${base}-${times}`
    taken.add(value)
    return { value, label }
  })
}

/** The tabs of a bar: the screens of the app (the one in sight is the current page), or views that belong to the bar. */
function tabs(p: Props, ctx: BuildCtx, placing: { edge?: 'top'; layout?: 'stacked' }): El {
  const stacked = placing.layout === 'stacked'
  const look = { ...placing, size: !stacked && p['size'] === 'sm' ? 'sm' : undefined }
  if (p['source'] !== 'custom') {
    const go: Expr = { $expr: '(next) => go(next as Screen)', run: (scope) => scope['go'] }
    return h('ToolbarTabs', { 'aria-label': 'Views', value: name('screen'), onValueChange: go, ...look }, ctx.screens.map((screen) => h('ToolbarTab', { value: screen.id, icon: stacked ? h('Icon', { name: screen.icon }) : undefined }, screen.name)))
  }
  const views = list(p['tabs'])
  const options = named(views)
  const view = ctx.state('view', options[0]?.value ?? '')
  return h('ToolbarTabs', { 'aria-label': 'Views', value: view.value, onValueChange: view.set, ...look }, options.map((option, at) => h('ToolbarTab', { value: option.value, icon: stacked ? icon(views[at]?.['icon']) : undefined }, option.label)))
}

/** A document open in a tab of the app's: what tells it apart, and its title. */
export type Doc = { readonly id: string; readonly title: string }

/** The titles of the tabs a «Document tabs» opens with; a tab with no title is «Untitled». */
export const docTitles = (p: Props): string[] => list(p['tabs']).map((row) => text(row['label']) || 'Untitled')

/** The documents open at the start, each with an id of its own: «Trip» is `trip`, a second «Trip» `trip-2`. */
export const openDocs = (titles: readonly string[]): Doc[] => named(titles.map((label) => ({ label }))).map(({ value, label }) => ({ id: value, title: label }))

/**
 * A tab for each open document (`docs`): in the export a `map` over them, on the run page and the canvas the same tabs
 * as elements. Where a tab can close, its cross asks `closeDoc`.
 */
function openDocTabs(closing: boolean): Expr {
  const close = closing ? ' onClose={() => closeDoc(doc.id)}' : ''
  return {
    $expr: ['docs.map((doc) => (', `  <DocumentTab key={doc.id} value={doc.id}${close}>`, '    {doc.title}', '  </DocumentTab>', '))'].join('\n'),
    run: (scope) =>
      ((scope['docs'] as readonly Doc[] | undefined) ?? []).map((doc) =>
        h('DocumentTab', { key: doc.id, value: doc.id, onClose: closing ? { $expr: '', run: () => () => (scope['closeDoc'] as ((id: string) => void) | undefined)?.(doc.id) } : undefined }, doc.title),
      ),
  }
}
const OPEN_DOCS = openDocTabs(false)
const OPEN_DOCS_CLOSING = openDocTabs(true)

/** The item a job is on: one of its items, by how far it is. */
function itemAt(items: readonly string[]): Expr {
  const n = items.length
  return {
    $expr: `[${items.map((item) => lit(item)).join(', ')}][Math.min(${n - 1}, Math.floor(((job ?? 0) * ${n}) / 100))]`,
    run: (scope) => items[Math.min(n - 1, Math.floor((((scope['job'] as number | null) ?? 0) * n) / 100))],
  }
}

/** The icon of a screen, from data that may hold any word. */
export const iconName = (value: unknown, fallback: IconName = 'all'): IconName => ((ICON_NAMES as readonly string[]).includes(value as string) ? (value as IconName) : fallback)
