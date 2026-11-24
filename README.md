# Sigrid UI

Sigrid is the UI system shared by a suite of React apps, ADHD first, in four levels:

1. **A toolkit.** The single source of truth for colours, tokens, fonts, primitives and motion (`@acaprino/sigrid`).
2. **Advanced components.** A table, a long list, a list put in order by hand, a rich text field and a graph canvas, each
   on an entry of its own (`/table`, `/virtual`, `/reorder`, `/rich-text`, `/graph`), so an app loads only what it uses.
3. **A layout system.** The one frame of an app (`AppShell`) in two forms, with lines or as a sheet (Xiox's frame), its
   regions and the widths where it gives way, `Panel`, the layout parts, and the patterns of `docs/patterns.md` and
   `docs/mobile.md`.
4. **An app system for Tauri.** The title bar, the window's buttons and the desktop guard, which are plain web, and
   `@acaprino/sigrid/tauri`, which wires them to a Tauri window from the page. The app editor of the showcase lays a
   whole app out and exports it as a project. The native skeleton (`src-tauri`) is the tauri-app-builder plugin's.

All four are made for coding agents: `AGENTS.md`, a catalogue written from the source (`agents/`), whole example apps,
a check (`sigrid-check`) and a Claude Code plugin.

It knows nothing of any app: no app's name, concepts or product components. The toolkit's source (`src/`) knows no
window API of a desktop shell (its title bar is plain web, and a shell drives it from outside: see
[Toolbar and title bar](#toolbar-and-title-bar)); what is Tauri's lives apart, in `tauri/`. An app builds its product
components on top of it, usually in a package of its own that re-exports what the app needs from here.
MIT licence (`LICENSE`). The third-party code it adapts (all MIT), and the libraries and fonts it rests on with
their licences, are listed in `THIRD_PARTY.md`.

## Use it

It is not on npm. Clone it next to your app, build it, and depend on the folder:

```bash
git clone https://github.com/acaprino/sigrid.git
cd sigrid && npm ci && npm run build
```

```jsonc
// your app's package.json
"dependencies": { "@acaprino/sigrid": "file:../sigrid" }
```

```tsx
import '@acaprino/sigrid/theme.css'   // in your Tailwind entry, with an @source on the toolkit's src
import { BASE_THEME, applyTheme, applyDensity, Button } from '@acaprino/sigrid'

applyTheme(document.documentElement, { theme: BASE_THEME, scheme: 'light' })
applyDensity(document.documentElement, 'normal') // or 'compact', 'large', or your own DensityDef
```

The `@source` is how Tailwind finds the classes the toolkit's components use. After the package is updated, restart
the dev server: Tailwind's watch does not scan `node_modules` again, so the CSS stays the old one and misses the
classes of the new version (a dialog that is not centred, for one).

On a phone, give the page `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
and put `AppShell` in it as it is: the frame is as tall as what is seen and keeps clear of the notch and the gesture
bar by itself, so no `h-dvh`, `h-screen` or `100vh` goes around it (`docs/mobile.md`, «Heights and orientation»).

To depend on a published version instead of a checkout, see [Use a release](#use-a-release) below.

To migrate from `@acaprino/toolkit`, update the dependency name and all imports, including stylesheet imports,
to `@acaprino/sigrid`. Point local dependencies and Tailwind source paths at your checkout. Releases through
`v1.0.1` carry the original package and tarball names.

## What the toolkit rests on

1. **Behaviour: two libraries, each for what it does best.** **Base UI** (`@base-ui/react`, pinned to 1.9.0) carries
   the basic controls and the surfaces that open: dialog, sheet, select, popover, menu, tooltip, toolbar, checkbox, radio group,
   toggle group, input; `Collapsible`, `Field` and `PopoverPrimitive` are re-exported so an app composes them with the
   toolkit's single copy. **Ark UI** (`@ark-ui/react`, pinned to 5.39.3), imported component by component, carries the
   richer parts Base UI does not have: notices, date picker, tags input, file upload, combobox, slider, switch, tabs,
   avatar. The split is meant to stay (the owner's decision of 2026-11-22): a control moves from one to the other only
   when it is rewritten anyway, or when a defect comes from the two living together.
2. **Form: Park UI's recipes**, translated by hand to Tailwind classes (Park is not installed): sizes, variants, corner
   levels and elevation of every primitive in `src/components/ui/`.
3. **Motion on Fluent 2's tokens**: short tweens with Microsoft Fluent 2's durations and curves (100 to 200 ms; entering
   decelerates, leaving accelerates, moving in place eases; no springs), enabled app-wide with `<MotionProvider animated={true}>` or per control with the `animated` prop, never
   with `prefers-reduced-motion`, only in answer to a gesture. `motion` (14.6.0) is imported by
   `src/internal/motion-impl.tsx` alone, a chunk loaded lazily (`useMotion`, `preloadMotion`): with animations off it
   never reaches the browser.
4. **Colours: the theme engine** (`src/theme-engine.ts`, `src/theme-catalog.ts`, `src/themes.ts`, `src/colors.ts`):
   every colour is computed from the chosen theme and scheme and written as tokens on the root (`applyTheme`); the
   first paint's palettes are in `src/styles/theme.css`. No hard-coded colours anywhere else. In dark the backgrounds
   are a neutral anthracite unless the theme sets its dark parameters (`ThemeDef.dark`), which the engine turns into
   the whole ladder: `depth` is how dark the page is and how far below it the sidebar sits (`deep` a near-black page
   at OKLCH lightness 0.20, `standard` 0.235, the default, `soft` 0.25, the page closer to its sheets), and `tint`
   is `neutral` (the default) or `theme`, the hue of the theme's grays at a low chroma (0.016, or 0.008 for a warm
   hue; a theme whose grays have no chroma stays neutral). Every contrast threshold holds on all six; `themeDark`
   reads a saved value. A curated palette (`surfaces`, and so `colorTheme`) keeps its own backgrounds. A theme can also be made
   from two colours (`src/color-theme.ts`): `colorTheme` takes the theme colour and a spot colour, the one loud colour
   for the few things that ask for attention (tokens `spot`, `spot-foreground`, `spot-soft`, `spot-ink`);
   `spotSuggestions` proposes three spot colours that go with a theme colour, from quiet to loud, and the `ColorMatch`
   component lets a user pick both (the showcase has it in its theme gallery). A theme can also be made from a base
   and an accent (`src/harmony.ts`): `pageTint` brings any base colour to a very light tone, the page (no base is the
   white); `accentSuggestions(base)` proposes the accents that go with it by the classical harmonies, all on the
   OKLCH wheel (split complement, complement, triad, neighbours, the same hue), ranked, with the first marked as
   recommended, none in the red of errors; `duoTheme({ base, accent })` gives the two to `applyTheme` as its `own`.
   The app editor's «Look» panel has it: choosing a base suggests its accents. The corners are `ThemeDef.shape`:
   `sharp` (2/4/6px) is the default, `soft` (4/6/10px, the corners before 2026-11-24) and `round` (6/10/14px) are
   the choices; an app keeps the rounder look with `shape: 'soft'` on its theme, and `ThemeDef.radii` sets numbers
   of its own.

Third-party provenance is in `THIRD_PARTY.md`, checked by `test/provenance.test.ts`.

## Density

Density is data, like the themes (`src/density.ts`). The toolkit ships three presets, `DENSITIES`; `normal` is the
default, a 4px step under Park UI's md form (Park's md is `large` here).

| | control heights (md/sm/xs) | side padding (md/sm/xs) | row height | row padding |
|---|---|---|---|---|
| `compact` | 32 / 28 / 24px | 10 / 8 / 6px | 32px | 4px |
| `normal` | 36 / 32 / 28px | 12 / 10 / 8px | 40px | 8px |
| `large` | 40 / 36 / 32px | 14 / 12 / 10px | 48px | 12px |

- `applyDensity(root, density)` takes a preset id or a `DensityDef` (an app's own, or a preset with some measures
  changed: `densityWith('compact', { row: { height: 28 } })`). It writes the measures on the element as `--density-*`
  and the id as `data-density`; `copyTheme` carries both to another document.
- `src/styles/theme.css` turns them into the tokens the primitives read: `--control-md`, `--control-sm`,
  `--control-xs`, `--pad-md`, `--pad-sm`, `--pad-xs`, `--row-height` and `--row-pad` (`h-(--control-md)`,
  `px-(--pad-sm)`, `min-h-(--row-height)`…). Before any script runs they are `normal`.
- Two rules sit above every definition: each measure is brought inside `DENSITY_LIMITS` (a control is never shorter
  than 24px), and with a coarse pointer every control height and the row height are at least `--touch-target`, 44px
  (a density that asks for more gets more on touch too).
- `DensityChoice` is the settings control, of the same family as the other look settings; the app stores the choice.

## Toolbar and title bar

`Toolbar` is one row of actions and a single Tab stop (Base UI's `Toolbar`: the arrows move among the items).

- `ToolbarButton`: with no children it shows an icon alone, and its `label` is its accessible name and its hint (with
  `shortcut` after it); `pressed` makes it a switch with the selection tint; `variant="default"` is the one solid
  action (R3).
- `ToolbarSearch`: a magnifier that opens into a `SearchField` on a press, or when the app sets `open` from its own
  key; Esc empties and closes it, and so does leaving it empty.
  `closed="field"` rests it as a quiet field with its name and key.
- Short of room the bar gives way in fixed steps measured on the toolbar itself, not on the screen: under 448px a word
  beside an icon goes (`keepWord` keeps it) and the search field is its magnifier; under 256px the title goes.
- `ToolbarBrand`: the app at the start of the bar, as in Imago's apps: a square in the accent with the initial of
  its `name`, and the name beside it; `mark={false}` shows the name alone, and `page`
  puts the place after it («Daodan › Settings»).
- `ToolbarTabs`, `ToolbarTab`: the views of the app as words in the bar, after the brand, as in Xiox; the current one
  has the stronger text and a short accent bar. They can also sit in a toolbar directly under the bar (`AppShell`'s
  `tabs`), in a bar at the foot of the window (`bottomBar`, with `edge="top"` and `layout="stacked"`) or small in the
  status bar (`footer`, with `size="sm"`). A `ToolbarButton` with a word shows its `shortcut` after it («Commands Ctrl K»).
- `ToolbarTitle`, `ToolbarSpacer`, `ToolbarGroup`, `ToolbarSeparator` lay the row out.

`TitleBar` is the bar that holds it at the top of a window. On a web page it is a top bar and nothing more. It becomes
the frame of a window from outside, so the toolkit imports no shell:

| What | On the web | In a shell without a frame |
|---|---|---|
| Moving the window | nothing to do | `app-region: drag` is already on the bar and off its controls (theme.css); a shell with its own mark passes it as `dragProps`, and the bar, the toolbar, the title and the spacers carry it |
| The system's buttons over the page | `--titlebar-start` and `--titlebar-end` follow `env(titlebar-area-*)` (an installed web app with the window-controls overlay) | the app sets the two variables if the shell keeps room for its own buttons |
| Minimize, maximize, close | not drawn | `WindowControls` draws them and calls the app back |
| Snap Layouts of Windows 11 | nothing | the shell lays the system's hit area over the middle button: `maximizeRef` gives it the button to measure, `maximizeState` shows the hover and press the system reports |

```tsx
// An app in Tauri on Windows, with `decorations: false`. The same component on the web: no dragProps, no windowControls.
const win = getCurrentWindow()
<TitleBar
  dragProps={{ 'data-tauri-drag-region': '' }}
  windowControls={<WindowControls maximized={maximized} onMinimize={() => win.minimize()} onMaximizeToggle={() => win.toggleMaximize()} onClose={() => win.close()} />}
>
  <Toolbar aria-label="Mail">
    <ToolbarTitle>Inbox</ToolbarTitle>
    <ToolbarSpacer />
    <ToolbarSearch label="Search the mail" shortcut="Ctrl K" value={text} onValueChange={setText} />
    <ToolbarButton label="Archive" shortcut="E" icon={<Icon name="archive" />} onClick={archive} />
    <ToolbarButton label="New message" variant="default" icon={<Icon name="plus" />}>New</ToolbarButton>
  </Toolbar>
</TitleBar>
```

Two more switches make a page behave as a program in a window of its own; a page in a browser tab leaves them off.
`AppShell desktop` keeps the chrome unselectable with the arrow cursor (the content, the inspector's body, fields and
`data-selectable` stay selectable) and opens every overlay under the title bar, so the window can still be moved and
closed while a dialog is open. `useDesktopGuard()` takes away the browser's own keys (reload, print, find, the
developer tools), its right-press menu outside fields, the mouse's back and forward buttons and the dragging of
pictures and links; `ownKeysIn` names a terminal or an editor that keeps its keys.

The bar's height is `--titlebar-height` (a dense control and 8px above and below it: 48px at normal density).
`TitleBar size="compact"` is the thin caption of a classic desktop program (32px), and the toolbar inside it takes
28px items by itself; `Toolbar size="sm"` asks for them anywhere. Text `ToolbarButton`s that open a `DropdownMenu`
make a menu bar («File», «Edit», «View») out of the same parts.

## The command palette

`CommandPalette` is quick access to everything an app can do: a dialog near the top of the window with one field and
the app's commands under it. Typing narrows them (every word, in the name or the `keywords`), the arrows move, Enter
runs one and closes the palette. Each command shows its own key at the end of its row. `useCommandKey(open)` binds
Ctrl+K (Cmd+K on a Mac).

```tsx
const [open, setOpen] = useState(false)
useCommandKey(() => setOpen(true))
<CommandPalette open={open} onOpenChange={setOpen} commands={[
  { id: 'find', label: 'Search in this view', shortcut: 'Ctrl F', onSelect: find },
  { id: 'settings', label: 'Go to Settings', group: 'Go to', shortcut: '4', onSelect: () => go('settings') },
]} />
```

An app can also declare each command once, near the state it acts on, and let the toolkit run its key and list it:
`CommandsProvider` around the app holds a registry; `useCommand({ id, label, group, keys, when, run })` declares a
command for as long as its component is mounted; a `CommandPalette` with no `commands` lists the declared ones in their
order, by group, those that cannot be done now (`when: false`) dimmed, and Ctrl+K (Cmd+K on a Mac) opens it: that is
the registry's own command, `PALETTE_COMMAND`, turned off with `palette={false}`. A key is written as
`KeyboardEvent.key` names it after `Ctrl`, `Alt` and `Shift` (`Escape`, `F6`, `Ctrl+F`, `Shift+?`, `Ctrl++`). Where it
belongs to what has the focus it is left there: a plain key in a field (but Escape and the function keys), Enter,
Space and the arrows on a control, a key without Ctrl or Alt in an open dialog or menu, a plain key a widget handled,
every key in the places `ownKeysIn` names. `useCommands()` gives the list, each key in the words of the system and of
the app (`formatKeys`, `Words.keys`), and `useCommandPalette()` the palette's open state for a button. `KeyHints`, in
the window's foot, names the keys that work now of the commands the app picks:
`footer={<KeyHints ids={[PALETTE_COMMAND, 'search', 'close']} />}` («Ctrl K Commands · Ctrl F Search in this view»),
hidden on a phone.

```tsx
<CommandsProvider>
  <App />  {/* inside: useCommand({ id: 'close', label: 'Close the detail', keys: 'Escape', when: open, run: close }) */}
  <CommandPalette />
</CommandsProvider>
```

## Light, dark and the system's look

In every app of the suite the person chooses light, dark or the system's look in the same place: three commands of
the palette, «Light theme», «Dark theme» and «System theme», each with its icon (`sun`, `moon`, `appearance`), in a
group of their own («Look»), the one in use checked. Each name stands alone, without the heading, so a screen reader
says «Light theme, checked». No app draws a switch for it or writes these commands. The app makes two calls with one
constant, its look and the key the choice is kept under: `applyKeptScheme` in its entry file, before React renders,
and `useSchemeCommands` inside its `CommandsProvider`, which declares the three commands where it is called.

```tsx
// main.tsx, before createRoot(…).render(…)
const LOOK = { theme: colorTheme({ id: 'tasks', label: 'Tasks', color: '#006398', spot: 'balanced' }), storageKey: 'tasks.scheme' }
applyKeptScheme(LOOK)

// in the app's component, inside <CommandsProvider>
const { scheme } = useSchemeCommands(LOOK)
useWindowTheme(scheme) // a Tauri app, from '@acaprino/sigrid/tauri': the window's frame follows
```

`applyKeptScheme` puts the kept scheme on the root as soon as the entry's script runs. What the page paints before
that is the stylesheet's (`theme.css`: the gray baseline in the system's scheme), so a page whose stylesheet paints
before the script runs can show the system's scheme for a moment; the toolkit has no way of its own to hold that paint.

Choosing one puts the app's theme in that scheme on the document's root at once (`applyTheme`) and keeps the word
(`light`, `dark` or `system`) under the key in `localStorage`: every page and every tab of the app that uses the same
key follows it. The system's choice is the default and follows `prefers-color-scheme` while the page is open; a value
kept that is not one of the three is the system's. The storage is the answer whenever it can be read: what another
page keeps there, or a clear, is followed, and a choice the storage refuses to write (its quota full) does not hold.
Only where the browser gives no storage at all (turned off or blocked, as some private modes do) does the choice hold
in the page, until it is closed. On a server nothing reads the browser's storage: the hook says the system's choice,
drawn light (as `useMedia` does there), and `applyKeptScheme` puts nothing. The hook says `{ choice, scheme }`, the
scheme drawn now, for a part that draws in it: a Tauri app gives `scheme` to `useWindowTheme` (`@acaprino/sigrid/tauri`)
so that the window's frame follows. The look is what `applyTheme` takes but the scheme (`theme`, and the user's `tone`,
`own` or `palette`), given as the same objects at every render (a constant, or `useMemo`). The words are
`useWords().scheme`. Any command that chooses one of several says so with `checked` (`useCommand`, or a `Command`
given to the palette): the one in use has a check in the ink at the end of its row, the look of `Combobox`'s chosen
option, and the others keep its room. For a screen reader it is `aria-checked` on the option, because `aria-selected`
marks the highlighted row.

## A tree of rows

`Tree` is a list of nested rows on Ark UI's TreeView, for files and folders or any hierarchy: each node has an `id`, a
`name`, an `icon` (a meaning of Sigrid's icons, `folder` and `file` among them) and an `openIcon` for a branch while it is open (`folderOpen`), a short fact at the end (`meta`, in tabular
figures) and a `count` after it (a `Count`, R5), and either `children` or `hasChildren`, whose rows `loadChildren` brings
when the branch is first opened. The rows look like every list of things (`ItemRow`): under the pointer a share of the
selection tint, the chosen row the whole tint and the short accent bar at its start. The rows are one Tab stop (the
chosen row when it is in sight); Down and Up move, Right opens a branch and then goes in, Left closes it and then goes
out, Home and End reach the ends, the first letters typed reach a name, `*` opens the branches beside the row, Enter,
Space or a press choose (and open or close a branch). One row is chosen: `selected` and `onSelect` for the app's choice,
or `defaultSelected`; the open branches likewise (`expanded`, `onExpandedChange`, called only when the list changes,
`defaultExpanded`). The chevron is the sidebar's and turns only with `animated`. A closed branch's rows are not in the
page.

A branch that loads says «Loading» and takes no second opening; one whose load failed says «Not loaded» and stays
closed, and opening it again tries again. Loaded children belong to the node object they were loaded for: build the
nodes once (a constant, state, `useMemo`); when the app gives another object for an id (another project, a refresh) or
none, its children are dropped and a load still under way is given up (its signal aborts), so one project's rows never
show in another.

With `search` a field above the rows filters them; the text can also be the app's (`query`, `onQueryChange`,
`defaultQuery`), typed in that field or in one of the app's own (then without `search`). `match(node, query)` says what
is found (by default the name holds the text, whatever the case): a node found shows with all it holds, a branch that
leads to one shows opened, and an app counts the finds with the same function over its nodes. A branch never loaded is
not searched: to have it searched, give its children. Nothing found says «No results», the word of every search. What
the person opens or closes while filtering is theirs: clearing the filter gives back their own branches, with those
changes.

A screen reader hears a tree named by the app; the row that has the focus is the `treeitem` itself, branch or leaf,
named by its name, with its level, whether it is open and whether it is chosen, and the fact, the count or the state of
its load after it. It is not the graph: `GraphCanvas` draws things joined by lines.

```tsx
const FILES: TreeNode[] = [
  { id: 'src', name: 'src', icon: 'folder', openIcon: 'folderOpen', children: [{ id: 'src/app.ts', name: 'app.ts', icon: 'file', meta: '4 KB' }] },
  { id: 'remote', name: 'remote', icon: 'folder', openIcon: 'folderOpen', hasChildren: true },
]

<Tree aria-label="Files" nodes={FILES} search selected={file} onSelect={setFile} defaultExpanded={['src']}
  loadChildren={(node, signal) => fetchFolder(node.id, signal)} className="h-full" />

// The app's filter: the whole path, and the count of finds with the same function.
const byPath = (node: TreeNode, query: string) => node.id.includes(query.trim())
<Tree aria-label="Files" nodes={FILES} query={query} onQueryChange={setQuery} match={byPath} />
```

## A message that stays in the page

`Note` is a message that stays where it is until the app removes it: a failure, a warning, a success or a piece of
information (`tone`: `error`, `warning`, `success`, `info`, the default), with a `title`, its text (the children), an
optional list (`items`, one entry each) and the buttons that answer it (`actions`). It has no close button: it goes
when its cause is gone.

One need, one look. Which to use:

| What the page has to say | Use |
|---|---|
| Something failed: a view, a panel or a file that could not be read, a task that stopped | `Note` with `tone="error"`, with «Retry» as its action when it can be tried again |
| There is nothing here: an empty list, a search with no result, a view not filled yet | `Empty` |
| Something passed: saved, moved, sent, with «Undo» | a toast (`Toasts`) |

A failure has the same mark wherever it is shown: Sigrid's `error` icon, the circle with an X, in a `Note`, in a toast
with `kind: 'error'`, in a `ProgressRing` and before the «Failed» of a `Progress` or `ProgressSegments` with
`status="error"`, and in the dot of a step of `Steps` that failed.

Each tone is said three ways, never by colour alone: its icon from Sigrid's set (`info`, `check`, `alert`, `error`), its
colour from the theme engine's status tokens (the soft fill of `success`, `warning` or `destructive`; information has
none and is never the accent, so it is the quiet fill, the ink at 6%), and a word that screen readers read before the
title («Error: Could not reach the server»: an error says `useWords().common.error`, the word of an error toast, and
the other tones `useWords().note`). So a title does not start with the tone's word («Error: …», «Warning: …»): it
would be read twice. An error or a warning is announced when it appears (`role="alert"`); information and a success
are not, and are met in the page's order. A warning that is a fact of the item shown («Read only», «Out of date») takes
`announce={false}`: it is not read again at each selection. A note whose tone changes in place is drawn anew, so an
information that becomes an error is announced as it appears (a button inside it that had the focus loses it).

A long word (a path, a JSON value, an address) breaks where it must, in the title, the text and the list, so the note
never grows wider than its place. A tool's output, with its line breaks, goes in the text as `<Text pre>`. The form is
Park UI's alert, flat in the page: a fill, with neither a border nor a shadow (R4). The actions are `outline` or
`ghost`, whose labels read at 4.5:1 on the four fills in every theme; a solid button only if it is the one primary
action of its screen (R3).

```tsx
<Note tone="error" title="Could not reach the server" items={failed.map((file) => file.name)}
  actions={<Button variant="outline" onClick={retry}>Retry</Button>}>
  The map was drawn before these files were read.
</Note>

<Note tone="warning" announce={false} title="Read only">
  It belongs to another project.
</Note>

<Note tone="error" title="The analysis stopped">
  <Text pre>{log}</Text>
</Note>
```

## The frame of an app

`AppShell` is one layout with seven regions, after Imago's frame: `titleBar`, `status`, `sidebar`, the content (its
children, a `<main>` with a skip link to it), `inspector`, `actions` and `footer`. An app passes the regions it needs.

The frame measures its own width, not the screen's (`APP_SHELL_STEPS`, Imago's): from 1000px the `Inspector` is docked
and pushes the content, under it a panel over the end of the content, never modal; from 850px the `Sidebar` is whole
(or the rail the user chose), from 620px to 850px a rail, under 620px a drawer. `Sidebar` and `Inspector` read the step
from the frame; the steps are recommended, and an app passes its own with `steps` (0 switches one off);
`useAppShell()` gives the step to the app, which shows its «open the menu» button only where the sidebar is
a drawer. F6 moves the focus to the next region (title bar, sidebar, content, inspector) and
Shift+F6 to the one before, skipping a closed one: the frame does it, with nothing for the app to write.

The `Inspector` lets the rest of the window work beside it, in both forms. A press outside it does not close it (the
person keeps choosing in the list or on the canvas, and typing in the search field, while it shows what is chosen);
opening it does not move the focus: a selection opened it, and the person goes in with Tab, F6 or a press.

| | Docked (1000px or more) | A panel (under 1000px) |
|---|---|---|
| Its button | closes it | closes it |
| Escape, the focus in it | closes it | closes it |
| Escape, the focus in it on a field that holds text, or with a list or a menu open | the field's, the list's | the field's, the list's |
| Escape, the focus elsewhere | not the inspector's: the field's, the app's command | the same |
| A press outside it | nothing | nothing |
| A swipe towards its edge | nothing | closes it |

Closed with the focus in it (a menu or a list it opened counts), it gives the focus back to what last had it outside
the inspector (a dialog or a menu does not count: the row under it does), or to the content when that is gone or
hidden; closed with the focus elsewhere (an app's command closed it), it moves nothing. It gives the focus back in
the same way when it is taken out of the page while open (if the row that had the focus goes in the same change, the
focus is left on nothing: the app then puts it where it wants). What last had the focus is forgotten when the focus
leaves it for nothing (a touch outside any control): closing then gives the focus to the content, not to a field the
person had left. When the control that had the focus in the inspector is removed and leaves the focus nowhere (a
link its own press replaced; seen when the inspector is drawn again), the focus stays in the inspector, on the
inspector itself: Escape still closes it, and Tab goes on from there.

An app that used the `Inspector` before 2026-11-24 meets four changes:

- Escape in a docked inspector's field that holds text (a `SearchField` with a search, an inline edit) stays the
  field's; on an empty field, a button or the inspector's text it closes the inspector, which it did not do docked.
- Escape with the focus outside the panel (a search field of the content, a row) no longer closes the panel. An app
  that wants Escape to close the details from the rest of the window declares it:
  `useCommand({ id: 'close', label: 'Close the details', keys: 'Escape', when: open, run: () => setOpen(false) })`.
  The command runs from a field of the content too (a command's Escape is not left to a field), and never from a
  field of the inspector that holds text, docked or panel: there the registry leaves the key to the field. The key
  itself still goes on: a listener of the app's own on the document hears it, and decides for itself.
- A control of the inspector removed while it has the focus (a «Remove» button, a link its press replaces) leaves the
  focus on the inspector itself, which takes the focus (docked too: a press on its text gives it the focus); an app
  that wants it on the next control focuses that control itself.
- An inspector taken out of the page (`inspector={undefined}`) with the focus in it gives the focus back as on closing.

`Sheet` has `closesOnEscape` for the same need: a function asked at each Esc, whose `false` leaves the sheet open and
the key to what has the focus and to the app's commands.

```tsx
<AppShell
  contentLabel="Messages"
  titleBar={<TitleBar>…</TitleBar>}
  status="Archived «Receipt»"
  sidebar={<Sidebar aria-label="Folders" open={menu} onOpenChange={setMenu}>…</Sidebar>}
  inspector={<Inspector title="Details" open={details} onOpenChange={setDetails}>…</Inspector>}
  actions={<Button>Reply</Button>}
  footer="12 unread"
>
  …the list…
</AppShell>
```

## What it exports

`ThemeGallery` displays an app's themes as keyboard-selectable tiles. Each tile previews its theme in the active scheme and tone. Pass `selected={null}` and a `custom` choice to mark a user-defined palette. The app supplies the labels and handles preference storage.

`Logo` is a small square picture of a thing that has one of its own: the logo of a service, a framework, a library.
`src` is the address of an SVG or a PNG the app serves; the picture is whole in a box of 16px (`size="sm"`, the default)
or 20px (`"md"`), with no border and no ground, and is never recoloured (the same in light and in dark). `icon` is drawn
in the box while the picture loads and when it fails (without it the box is empty), and the box never changes size.
`name` is its accessible name; without it, or with `decorative`, it is hidden from screen readers, as it should be
beside the written name. It goes where an icon goes (`ItemRow leading`, `NavItem icon`, beside a name in a
`DescriptionList` or a `Cluster`), and a `TreeNode` and a `GraphNode` draw it from their `image`, with their `icon` as
the fallback. A logo is content: the icons of the interface (an action, a kind of thing, a place) stay Sigrid's one
set, `Icon` (R6), and no logo stands in for one.

```tsx
<ItemRow title="PostgreSQL" description="Database" leading={<Logo src="/logos/postgresql.svg" icon="layers" />} />
<Cluster><Logo src="/logos/react.svg" name="React" size="md" /><Text>19.1</Text></Cluster>
<Tree aria-label="Services" nodes={[{ id: 'db', name: 'Database', icon: 'layers', image: '/logos/postgresql.svg' }]} />
```

- `.`: the theme engine and catalog, the colour palette, `cn`, the primitives (`Button`, `Input`, `Textarea`,
  `Checkbox`, `Select`, `Sheet*`, `DialogRoot`/`Dialog*`, `DropdownMenu*`, `Popover*`, `RadioGroup*`, `ToggleGroup*`,
  `Tooltip`, `Kbd`, `Empty`, `Badge`, `Logo` (below), `Calendar`, `DateRangeField`, `Switch`, `Tabs*`, `FormField`, `Count`, `Steps`, `Progress`/`ProgressRing`/`ProgressSegments`, `NavList`/`NavItem`, the layout parts (`Column` (with `fill`: as tall as its region, so a part of it that fills takes what the others leave), `Cluster`, `Split`, `Grid`, `Spacer`, `Section`, `ScrollArea`, `Page` (with `fit`: one screen exactly), `Text`: every space a step of the scale, no class or style taken, so an app writes none), the parts a screen is composed of beside them (`Card`, a group on a surface of its own, raised or on the quiet fill; `Heading`, the title of a page, a section, a card or a group; `Dot`, a colour or a state as an 8px dot; `Separator`, a hairline between groups; `DescriptionList`, the facts of one thing as names and values; `SettingRow`, a choice of a settings page; `SidebarRow`, a row of the sidebar's head or foot; `DrawerButton`, the button that opens the sidebar where it is a drawer), `Sidebar`/`SidebarGroup`, `Toolbar*`, `TitleBar`, `WindowControls`, `AppShell`, `Inspector`, `CommandPalette` with its registry (`CommandsProvider`, `useCommand`, `useCommands`), `ItemList`/`ItemRow` (with `control`, one control beside the row's button: a task one ticks and opens; and `facts`, the short facts under its title), `ContentSplit` (two panes in the content: a column with the list, the thing chosen beside it, one at a time where the two do not fit), `Tree` (nested rows, below), `Note` (a message that stays in the page, in four tones, below), `OverflowList` (one line of details: what does not fit is cut from the end and counted, «+2»), `Table`/`TableRow`/`TableCell` and the other parts of a table, `Slider`, `SearchField`, `Disclosure` (one row that opens in place what few people need), `CopyButton` (it copies a text and says so in place: a check and «Copied» for two seconds), `InputGroup` with `InputGroupText` and `InputGroupButton` (a field with words, an icon or a small button inside its border), `Combobox`, `Avatar`), the surfaces (`Dialog`, `Toasts`), `PortalContainerProvider`
  (where overlays mount for part of an app drawn in another document), the generic fields and helpers (`DateField`, `DurationField`, `ChipsInput`, `Swatches`, `AttachmentsSection`,
  `AttachmentViewer`, `Thumbnail`, Markdown, drop payloads, media queries, overlay layers), and the Motion loader.
  Where a piece needs an app's word or default, it takes a parameter (`Select`'s `renderMark`, the date fields'
  `placeholder`, `AttachmentsSection`'s `textNotice`).
- Five entries of their own, each on a library that an app loads only if it imports the entry (the versions are
  pinned and listed in `THIRD_PARTY.md`; the form, the words and the rules are the toolkit's):
  - `./table`: `DataTable`, on TanStack Table and TanStack Virtual. Columns say their heading, their cell and the
    value they sort by; a press on a heading sorts up, then down, then puts the rows back (`aria-sort`). One row can
    be chosen (`current`, `onRowPress`): the rows are one Tab stop, which follows the focus; the arrows, Home and End
    move among them; a press on a control inside a cell (a button, a link, a field) is that control's, not the
    row's. With `virtual` only the rows in sight are in the page, and Home and End still reach the ends of the data.
    Make `columns` once (outside the component, or with `useMemo`): a new array at every paint sorts again. For
    filters, groups or pinned columns an app drives TanStack Table itself and draws it with `Table` and its parts,
    which are in the main entry.
  - `./virtual`: `VirtualList`, on TanStack Virtual: a long list of `ItemRow`s of which only the ones in sight are
    drawn. It measures a row as it is drawn (any density, a finger's 44px) and still tells screen readers how many
    items there are and where each one is. Each place gives one row, never none. With `fill` it is as tall as the
    region that holds it, with `pad` the room around its rows.
  - `./reorder`: `ReorderList` and `moveItem`, on dnd-kit: a list put in order by the handle of each row, with the
    pointer, a finger or the keyboard (Space, arrows, Space; Escape puts it back), announced in the app's words.
    While a row is taken Escape is the list's, so a dialog or a sheet around it stays open.
  - `./rich-text`: `RichTextField`, on TipTap: bold, italic, underline, two kinds of list, a quote, undo and redo,
    with the toolkit's `Toolbar` above the text. The value is HTML; it sits in a `FormField` as any control. A value
    that comes from outside (another draft) takes the place of the text and is not a step of the undo; a value of
    its own that the app hands back late (a store, a round trip to a native side) is known as its own, so the app
    may keep the value wherever it likes.

  - `./graph` (with the stylesheet `./graph.css`): `GraphCanvas`, on React Flow for the canvas and dagre for the
    places. A graph of things and what joins them, laid out by itself in ranks (`direction="right"` or `"down"`) or
    drawn where the app laid it out (below), to
    move over (pan, zoom, fit, a small map with `minimap`, a field that finds a thing with `search`), to examine (the
    chosen thing has the selection tint, what is joined to it stays and the rest is dimmed; the app shows its details
    where it likes), to open and close (a thing with others hanging from it has an arrow, and closed it says how
    many it hides) and, with `editable`, to draw: the plus hangs a new thing, a drag between two handles joins them,
    Delete takes one away, each asked of the app with `onChange`. The keyboard is the one of a tree and the things
    are one Tab stop; a screen reader hears a tree. With `model="graph"` the lines are relations (calls, imports,
    data) and not «hangs from»: nothing closes, no thing has an arrow and every one is in sight (`collapsed` and
    `defaultCollapsed` are the tree mode's). The arrows follow the lines: with `direction="right"` Right goes along
    a thing's first line out and Left back along its first line in, while Down and Up go through the things in the
    order given; with `direction="down"` the axes swap (Down along the first line out, Up back along the first line
    in, Right and Left through the order). Home and End reach the first and the last, Enter chooses; from the › of a
    thing the arrows, Home and End move as from the thing. Opening is the app's, and only for the things it says it
    opens: a thing with an `openLabel` («Open Orders», the name of its › and of the action) has a › button, and a
    double press on it or its › calls `onOpen(id)`, once. Without `onOpen`, or on a thing without `openLabel`, there
    is no › and nothing opens; the › of the thing that has the Tab stop is the next Tab stop. A screen reader hears a
    group named by the app and called a graph (`aria-roledescription`, the word `graph.roleDescription`), whose things
    are buttons named by their name and second line, described by where their lines lead and come from («leads to
    Store, Mail · comes from Gateway», the words `graph.leadsTo` and `graph.comesFrom`), the chosen one
    `aria-current`. With `editable` the plus of the chosen thing (the first of several) adds one after it
    (`graph.addAfter`). With a finger the › and the plus are 44px. In both modes + (or =, the same key without Shift), − and 0 zoom in, out and fit, as
    the buttons do. Only what is in the view is drawn; the layout is done again at each change (about 30 ms for 200
    things in sight, 200 ms for a thousand). In the tree mode a larger graph starts with its branches closed
    (`defaultCollapsed`). In the graph mode every thing is always in sight, so the whole graph is laid out again
    whenever the app passes new nodes or edges or another `direction` (choosing a thing or moving the focus lays out
    nothing): a graph of thousands of things costs most of a second at each change, so show a part of it (the scope
    the user opened). An app that lays the graph out itself (a layout engine of its own, such as ELK in a worker, or
    by hand) gives each thing its place, `x` and `y` (the top left corner of its box, in px), and may give its size,
    `width` and `height` (by default 208 wide and 44 tall, 56 with a second line); a line may carry its route,
    `points`, from its start to its end (a layout's start point, bends and end point; `null` is no route). In both
    modes the things are drawn there at that size, a line with two points or more follows its route in straight
    pieces, the others go from side to side, and the canvas lays nothing out; `direction` still says which way the
    arrows follow the lines and which sides a line without a route leaves and reaches, so pass the direction the app
    laid out in. All or nothing: the places are read
    only when every thing has an `x` and a `y`; when one has none (a thing just added with the plus) dagre places them
    all, at the sizes given, and no line follows a route, until the app places it. `layoutKey` names the layout the
    places come from (as the app tells one from another: the direction, the things and the lines it laid out): when
    it changes, the view fits the whole graph again once the new places are drawn, and a draw on the same key
    (another choice, new flags, the same places) keeps the view where the user moved it, and so does a change of the
    box's size (a view nobody moved is fitted again, unless a thing is chosen: then the view always stays, so the
    inspector that a first press opens moves nothing under the second press). Pass the new key with the new places.
    Without it the view is fitted at the first paint and whenever the box changes size. `visibleGraph` and
    `layoutGraph` are exported for
    an app that draws the same graph another way (a list, a print).
    - Two kinds of line. A `GraphEdge` is `{ from, to }` and `to` hangs from `from` (`kind: 'child'`, the default):
      these lines alone make the tree, what opens and closes, what a closed thing hides, the ranks and the keys. With
      `kind: 'link'` the line joins two things without any of that (one waits for the other, refers to it, never goes
      with it) and is drawn while both ends are in sight. Any line may have `label` (words in its middle: keep them
      short, the gap between two ranks is 56 px), `style` (`solid`, `dashed`, `dotted`), `tone` (`default`, `accent`,
      which is also thicker, `warning`, `destructive`: the theme's, at 3:1 or more on the canvas) and `directed` (an
      arrowhead at `to`; a `link` has one unless `false`, a `child` line none unless `true`). What a kind of line
      means is told by its dash and its words, never by its colour alone. Screen readers hear a thing's `link` lines
      in its description («waits for, to Screens»); the lines themselves are not read twice.
    - What the app marks on its things and lines. `selected` takes one id or several, for an app that draws one of
      its things as several (an entity in each place it is): each has the selection tint and what is joined to any of
      them stays. One of them is the choice, the first in the order of the things: it holds the Tab stop, it alone is
      heard chosen (`aria-selected` in the tree, `aria-current` in the graph mode; the tree is not multiselectable,
      since the user chooses one) and, with `editable`, it alone has the plus (one clear action); the others say in
      their description that they are chosen with it («chosen with Ledger», the word `graph.chosenToo`). `onSelect`
      still gets the one thing the user chooses. The ids are read by what they are, so a new list of the same ids at
      every draw draws nothing again. A node's `image` is a picture of the thing where it has one of its own (the
      logo of a service, of a framework, of a library): the address of an SVG or a PNG the app serves, drawn before
      the name in the icon's place, 16px and whole. It is content, not an icon of the interface: the icons of the
      interface stay Sigrid's one set (`icon`), and an app draws no logo as one. It says nothing to screen readers
      (the name does), and while it loads or when it fails the `icon` (or the dot) is drawn in the same 16px, so
      nothing shifts: give both. The title of an open group shows it the same way. A node with `external: true` says «external» after its name, 12px in the muted
      ink (on the selection tint, as the line under the name is; the word `graph.external`), and in its name, never
      with a dashed border (R4); in a narrow box the name keeps 64px and the word is cut first. In the graph mode a
      node's `hiddenCount` (read above 0) is how many things the app keeps out of sight in it (a group it has not
      opened): the count at its end, as a closed thing of the tree shows it, and in its name («Orders, hides 12», the
      word `graph.hides`); the tree mode counts what a closed thing hides by itself. An edge with
      `labelShown: 'chosen'` draws its words only while one of its two things is chosen or has the keyboard focus
      (the arrows move it), or while the line is the path's (`always`, the default, draws them always); either way
      they are heard in the description of its things.
    - Two edges between the same two things. An edge with an `id` is always a line of its own (React Flow's id
      too): two such edges are two lines, each with its words, and with `editable` taking one away takes that edge
      alone. An edge without an `id` is named by its two ends, and a second one by a number after them, unless it is
      an exact copy (the same ends, `kind`, `label`, `labelShown`, `style`, `tone`, `directed` and `path`, and no `points`):
      copies are one line, said once, and taking that line away takes them all. Without the app's routes, two lines
      or more between the same two things are drawn side by side, 20px apart (from three on, within 16px of the
      middle of the sides, so closer), each bending at its own place, so the lines and their words do not lie on each
      other; with the app's routes (`points`) each follows its own.
    - `steps`, a `Map` from a thing's id to its step numbers, numbers a path through the graph (the steps of a plan,
      the answer to a question): each thing on it has the selection tint, its numbers in small dots and in its name
      («Copy, step 2»); of the lines between two of them, the first in the order of the edges is the path's (an app
      that wants another one there gives it first): 2px, in the accent, or in its own `tone` when it has one (a
      `warning` stays a warning); the others between the same two things stay as they are. What is neither on the
      path nor joined to it is dimmed (the field's finds come first, then the chosen thing and the path together).
      When the things on the path change, what hides one of them opens, through `onCollapsedChange` when the app
      keeps `collapsed`; the user may close it again. A thing with more than two steps shows the first and how many
      more («1 +3», the word `graph.moreSteps`), and all of them in its name. An app that knows which lines are the
      path's says so: when any edge has `path: true`, those lines alone are the path's and every other line is dimmed
      as off the path (the first-line rule is then not applied).
    - The view is fitted at the first paint (on the path when there is one), again whenever the box changes size (with
      a `layoutKey`, a view the user moved stays as it is, panned only by what keeps the chosen thing in the box), and
      with the button, never smaller than `minFitZoom` (default 0.8: names of 14 px stay about 11 px; `0` fits the
      whole graph down to 0.2, as it was before there was a floor). A graph too large for that starts at its top left. The edges of the
      canvas fall between things: the view moves a little, or is a little smaller or larger (up to 1.5), until they do,
      wherever the layout leaves such a gap (a dense graph in a small box may still have one thing cut). The canvas is not shown until its first view is fitted. A `ref` gives the app `focus(ids, { padding })`
      (onto some things, opening what hides them), `fit()` and `zoomTo(scale)`; the view jumps, or with `animated` goes
      there in 200 ms. A map that is read whole first passes `minFitZoom={0}`: the first view and every fit show the
      whole graph, down to 0.2, and the person zooms in.
    - The keyboard and what is not drawn. Only the things in the view are drawn, so an arrow towards a thing out of it
      moves the view to that thing, which takes the focus as it is drawn. The Tab stop is always a thing that is
      drawn: after the view moved, if the thing that held it is out of the view, the first thing in the view holds
      it (and has the focus, if the other had it); with no thing in the view the stop stays where it was until one
      is. When the thing that has the focus leaves the graph, the focus goes to the Tab stop, not to the page.
    - Groups opened in place (the graph mode). `onOpen` goes into a thing: the app shows something else. `onToggle`
      opens a group where it is, with the rest of the graph still in sight. A node with `open: false` is a group not
      opened: a thing as the others, with a button that opens it («Open Orders», the word `graph.open`; a double
      press does the same when the thing has no `openLabel`). With `open: true` it is a frame: its title (the icon or
      picture, the name, the second line, the count of what it holds), a button that closes it («Close Orders»,
      `graph.close`, 44px with a finger), a line around it and a quiet fill, no shadow (R4), under the things and the
      lines. Both buttons call `onToggle(id)`, and the app passes the node with the other `open`. A node whose `group`
      is the id of an open group is drawn in that frame and moves with it; a `group` that names no open group is not
      read. With the app's places, the `x` and `y` of a thing in a group are from the top left corner of the group
      (what a nested layout such as ELK answers, and what React Flow's `parentId` takes), the group has the `width`
      and `height` of its frame, whose first 44px are the title, and the routes (`points`) stay in the canvas's own px
      (add the corners of the groups the route is in). Without the app's places the canvas lays each open group out by
      itself (dagre, the innermost first) and then the group as one box among the others; a line that crosses a
      frame is drawn from thing to thing. Give a thing one of the two ways to open; with both, the arrow that opens in
      place comes before the › that goes in. A screen reader hears the frame as a group named by its name and count
      («Orders, open, holds 3», `graph.holds`) that owns what it holds, the title as a button that is expanded, and
      each thing in it described as «in Orders» (`graph.inGroup`). The arrow that follows the lines goes from the
      title into the group's first thing, and the one that goes back, from a thing no line leads to, goes out to the
      title; the frame's button is the next Tab stop after its title. The tree mode reads neither `open` nor `group`.
    - Things that move. With `movable` the person drags a thing (React Flow's own drag, after 4px, so a press or a
      pan that starts on a thing is not one; with a finger a drag on a thing moves it and a drag on the ground moves
      the view) or presses Alt and an arrow on the thing that has the focus, 16px a step (said in each thing's
      description, `graph.moveKeys`, and as it happens, `graph.moved`): a drag is never the only way. The canvas keeps
      the place by itself until `layoutKey` changes or the person presses «Reset the layout» (`graph.resetLayout`), a
      button that is among the view's only while something was moved, at their start, so the others stay where they
      are (R14). `onMove(id, { x, y })` tells an app that keeps the places too, in the terms of the node's `x` and `y`.
      An open group is dragged by its title and takes what it holds with it (the ground of its frame takes no press:
      a drag there moves the view, as on the canvas); a thing in a group stays in it, under its title; a line to a
      moved thing leaves the app's route and goes from side to side.
    - Motion. With `animated` (or a `MotionProvider animated` around it), and never with reduced motion: after a
      gesture that changes the places (a group opened or closed, a new `layoutKey`, the reset) the things glide to
      them in 200 ms on the toolkit's easy-ease curve, the lines are hidden meanwhile and drawn again at the end, and
      the view goes where a gesture sends it (the buttons, the keys, `fit`, `focus`, `zoomTo`, the fit of a new
      `layoutKey`) in the same time. Nothing moves at the first paint, while a thing is dragged, at a change of the
      box's size, or for new places nobody asked for; nothing loops. Without it everything jumps, as before.
    - Its height. The box is 384px tall. With `fill` it is as tall as the region that holds it, as `VirtualList fill`
      is, and gives way with it: the content of the `AppShell`, a pane of a `ContentSplit`, the body of a `Page fit`.
      With other parts over or under it (a row of filters, its key) it takes the height they leave, in the body of a
      `Page fit` or in a `Column fill`, the pile that is as tall as its region. It is never under 224px (232px with a
      finger; a control and 188px, so it follows the density), where the field and the small map are both whole. A
      region too short for that and for the parts beside it scrolls, and the canvas covers nothing that follows: a
      `Column fill` with a canvas in it is never shorter than what its parts need (unless one of them scrolls by itself,
      a list, a tree, a split, a panel, a `ScrollArea`: it gives way as ever). In a plain `Column`, as tall as its
      parts, and in a `Page` that does not fit, there is no height to take and `fill` gives the floor alone: use a
      `Column fill` or a `Page fit`, or leave `fill` out (384px).
    - The key of the lines. `GraphLegend`, under the canvas, says what each kind of line means: `entries` are
      `{ style, tone, label, count }`, `style` and `tone` as a `GraphEdge` takes them, `label` its word, `count` how
      many lines of that kind there are (a `Count`: zero shows nothing; screen readers hear it with the word, «12
      calls»); `aria-label` names the list. Each entry is a short sample of the line (hidden from screen readers), its
      word and its count, in a row that wraps on a narrow window. The samples are drawn by the same definitions as the
      canvas's lines (`src/components/graph-lines.ts` and one rule of `graph.css`), so the key and the lines cannot
      part. The word is always there: a tone is never said by its colour alone. It keys the lines only, not the
      things. A summary beside the key (how many lines are in sight, say) is the app's to write, with `Text`: the key
      has no prop for it.
    - The entry needs React 19: React Flow's compiled code takes `react/compiler-runtime` from the app, as every
      entry of `dist` takes `react` (each is an ES module with no `require`).

  ```tsx
  import { DataTable, type DataColumn } from '@acaprino/sigrid/table'
  import { VirtualList } from '@acaprino/sigrid/virtual'
  import { ReorderList } from '@acaprino/sigrid/reorder'
  import { RichTextField } from '@acaprino/sigrid/rich-text'

  const columns: DataColumn<File>[] = [
    { id: 'name', header: 'Name', cell: (file) => file.name, sortValue: (file) => file.name },
    { id: 'size', header: 'Size', cell: (file) => size(file.kb), sortValue: (file) => file.kb, align: 'end' },
  ]
  <DataTable aria-label="Files" columns={columns} rows={files} rowId={(file) => file.id} virtual className="h-96" />

  <VirtualList aria-label="Messages" count={mail.length} fill>
    {(index) => <ItemRow title={mail[index].from} description={mail[index].subject} />}
  </VirtualList>

  <ReorderList aria-label="Columns" items={lanes} itemId={(lane) => lane.id} itemName={(lane) => lane.name} onReorder={setLanes}>
    {(lane) => lane.name}
  </ReorderList>

  <FormField label="Notes"><RichTextField value={html} onChange={setHtml} /></FormField>

  // In the app's CSS, after theme.css: @import "@acaprino/sigrid/graph.css";
  import { GraphCanvas, GraphLegend } from '@acaprino/sigrid/graph'
  <GraphCanvas aria-label="Plan" nodes={[{ id: 'a', label: 'Launch' }, { id: 'b', label: 'Design', detail: '2 of 4 done' }]} edges={[{ from: 'a', to: 'b' }]}
    selected={chosen} onSelect={setChosen} search minimap fill />
  // A part the app goes into names the action: { id: 'orders', label: 'Orders', openLabel: 'Open Orders' }.
  <GraphCanvas aria-label="Calls" model="graph" nodes={parts} edges={calls} selected={chosen} onSelect={setChosen}
    onOpen={(id) => setScope(id)} fill />
  // Under a row of filters and over its key, it takes the height they leave.
  <Column fill pad="md">
    <Cluster>{filters}</Cluster>
    <GraphCanvas aria-label="Calls" model="graph" nodes={parts} edges={calls} fill />
    <GraphLegend aria-label="Kinds of line" entries={kinds} />
  </Column>

  // A path of two steps, a line that waits and one that never goes together; the view moved by the app.
  const view = useRef<GraphCanvasHandle>(null)
  <GraphCanvas ref={view} aria-label="Plan" nodes={nodes} fill
    edges={[...tree, { from: 'copy', to: 'pages', kind: 'link', style: 'dashed', tone: 'warning', label: 'needs the text' },
      { from: 'review', to: 'host', kind: 'link', style: 'dotted', tone: 'destructive', directed: false, label: 'not the same week' }]}
    steps={path} />  // const path = useMemo(() => new Map([['copy', [1]], ['pages', [2]]]), []): one Map while the path is the same
  // Its key, under it: each kind of line, its word and how many there are.
  <GraphLegend aria-label="Kinds of line" entries={[{ label: 'Hangs from', count: tree.length },
    { label: 'Needs the text', style: 'dashed', tone: 'warning', count: 1 }, { label: 'Not the same week', style: 'dotted', tone: 'destructive', count: 1 }]} />
  // A summary beside it, if the app wants one, is its own words: <Text variant="caption">8 of 12 lines in sight</Text>.
  <Button variant="outline" onClick={() => view.current?.focus(['copy', 'pages'])}>Show the path</Button>
  // Laid out by the app (ELK in a worker answers each box and each route): its places, sizes and routes, and its key.
  <GraphCanvas aria-label="Map" model="graph" layoutKey={layout.key}
    nodes={parts.map((part) => ({ ...part, ...layout.nodes[part.id] }))}
    edges={calls.map((call) => ({ ...call, points: layout.edges[call.id] }))} fill />
  // One of the app's things drawn in several places, another's service, a group not opened, words on a choice, and
  // two lines between the same two parts (each with its own id, drawn side by side).
  <GraphCanvas aria-label="Map" model="graph" selected={entity ? drawnAs(entity) : null} onSelect={choose}
    nodes={parts.map((part) => ({ id: part.id, label: part.name, external: part.outside, hiddenCount: part.closed ? part.count : undefined }))}
    edges={calls.map((call) => ({ id: call.id, from: call.from, to: call.to, label: call.kind, labelShown: call.flow ? 'always' : 'chosen' }))} fill />
  // A group opened in place: the app keeps which are open and lays them out nested; what an open group holds is
  // placed from its corner. The things move, the layout can be put back, and the changes glide.
  <GraphCanvas aria-label="Map" model="graph" layoutKey={layout.key} minFitZoom={0} movable animated fill
    onToggle={(id) => setOpen((now) => (now.includes(id) ? now.filter((it) => it !== id) : [...now, id]))}
    nodes={parts.map((part) => ({ id: part.id, label: part.name, icon: part.icon, image: part.logo, ...layout.nodes[part.id],
      ...(part.holds ? { open: open.includes(part.id), hiddenCount: open.includes(part.id) ? undefined : part.holds } : {}),
      group: part.parent && open.includes(part.parent) ? part.parent : undefined }))}
    edges={calls.map((call) => ({ id: call.id, from: call.from, to: call.to, points: layout.edges[call.id], path: flow.has(call.id) }))} />
  ```

  Measured on the showcase's production build: ten thousand rows scroll with about 1.3 ms of script a frame and
  sort by a text column in about 30 ms; a key in the rich text costs about 1.3 ms (the buttons are drawn again only
  when one of them changes); nothing runs while nothing happens. With the processor four times slower the scroll
  stays under 7 ms a frame.
- Words: a component's content is the app's. The few words a component says by itself (the name of a close
  button, «Page 2 of 5», the announcement of a label added) are English placeholders in `DEFAULT_WORDS`. An app
  replaces them, all or some, once for the whole tree and in any language: `<WordsProvider words={{ common: {
  close: 'Chiudi' }, date: { noDate: 'Nessuna data' } }}>`. A word that takes a value is a function (`page: (page,
  total) => …`), so each language orders it as it needs. A component's own prop (`placeholder`, `clearLabel`) still
  wins; the helpers outside a component (`kindLabel`, `stateText`, `overLimitNotice`, `withinLimit`) take the words
  as their last argument, and `useWords()` gives them to an app's own component.
- Icons: Sigrid has one icon set of its own, Lucide, the same in every app (the owner, 2026-11-23); the user does not
  choose another, and an app draws no icon of its own in its interface. `Icon` draws a meaning (`settings`, `delete`),
  never Lucide's own name: `<Icon name="archive" />`. Sigrid's names (`ICON_NAMES`) are what the apps need: the views
  and settings, the menu entries, the actions of a mail, calendar or editing screen (`mail`, `reply`, `archive`,
  `bold`, `undo`, `attach`, `windowMinimize`…), the rows of a tree of files (`folder`, `folderOpen`, `file`), the parts
  of a project and of a system (`code`, `branch`, `package`, `layers`, `graph`, `gateway`, `device`, `key`, `globe`,
  with `external` for what leaves the app) and the four tones of a message (`info`, `check`, `alert`, and `error`,
  the circle with an X of every failure). `globe` says what a thing is (the web, a site, a browser); `external` says
  what a press does (it opens a page outside the app), so it goes on a button, a row or a menu entry, not on a thing
  for being outside: on a `GraphCanvas` that is the word «external» (`GraphNode.external`), beside whatever icon the
  thing has. An icon a function needs that is not among them is added to Sigrid's names, never by the app. A name Sigrid does not draw
  (one read from data: check it with `isIconName`) is an empty slot of the same size. An app's own icon, its mark, is
  not part of this: it stays the app's.
- Upgrading from 4.x: the icon packs are gone from the source, and leave the package with 5.0.0, the next major release. `ICON_PACKS`, `IconPack`, `DEFAULT_ICON_PACK`, `isIconPack`,
  `IconPackChoice` and `IconPackText` are gone: drop the choice of a pack from the app's settings and stop saving it (a
  pack saved before is ignored). `IconPackProvider`, `useIconPack`, `IconSet`, `IconDrawing`, `IconArt` and `Icon`'s
  `pack` prop are gone: remove the provider around the app (`Icon` draws Lucide without it), and ask for a meaning of
  the app's own to be added to Sigrid's names (until then it is an empty slot). `Icon` no longer writes
  `data-icon-pack`. No name is kept as an alias.
- Status colours, beside the red: `success` and `warning` (text, each with a `-soft` fill) and `highlight` (behind a
  match inside a text). Fixed for every theme, as the red is; the engine keeps their contrast on every theme.
- `./theme.css` and `./fonts.css`: to `@import` in an app's own Tailwind CSS (with an `@source` on this package's
  `src`, and `@source not` on `src/internal/motion-impl.tsx`).
- `./styles.css`: the compiled CSS, for a page that does not compile Tailwind itself.
- DOM hooks an app can rely on: the stack of notices carries `data-toasts` (`TOASTS_ATTR`) and writes the room it takes
  at the bottom of the window to `--toasts-room` on the root (`TOASTS_ROOM_VAR`; sheets keep their foot above it with
  `SHEET_TOASTS_ROOM`); `AppShell` writes what it keeps at its foot (its actions, footer and `bottomBar`) to
  `--bottom-bar-room` on the root (`BOTTOM_BAR_ROOM_VAR`), an app with a bar of its own sets it, and the notices sit
  above it.
- Heights (`docs/mobile.md`, «Heights and orientation»): `useAppHeight()` keeps `--app-height` on the root as the
  height of what the person sees (`visualViewport`: the browser's bars, the keyboard, a rotation; `APP_HEIGHT_VAR`);
  `AppShell` runs it by itself and is that tall, and where it is the whole screen it keeps clear of the device's edges.
  The tokens: `--app-height` (`100dvh` until measured), `--fit-height` (it less the bottom bar's room),
  `--safe-area-max-inset-bottom` (the foot's room at its maximum, never the live inset) and
  `--safe-area-inset-top|left|right`; the variant `short:` and the query `SHORT` for a window under 500px tall.
  `Page fit` is a page of exactly one screen whose body gives way; `Column fill` is a pile as tall as its region, where
  a part that fills (`GraphCanvas`, `VirtualList`, `Empty`) takes what the others leave. A tool a view lacks keeps its
  place with `absent` (`ToolbarButton`, `ToolbarSearch`), and the words of a segment, a tab or a view are as wide chosen
  as not.

## Design rules, showcase and checks

- `DESIGN.md`: the design file (zero-slop-design format): the tokens of the default theme in light and dark, the
  owner's rules R1 to R14, from 2026-11-20 on (the accent only where to look and what to press, one solid button,
  border or shadow, plain key hints and tabular counts, icons from the one set, radii 2/4/6 (a theme may be `soft` 4/6/10 or `round` 6/10/14: `ThemeDef.shape`), text sizes 12 to 16px for the controls and 18, 20 and 24px for an app's titles, heights 36/32/28 at normal density, 2px accent focus ring, data colours as dots, the Vivid tone by default, undo in time order, an Advanced fold in each settings section, shared controls that never move…), the approved
  references (Ark UI for behaviour, Park UI for form) and the open questions. Read it before a UI change.
- `docs/patterns.md`: how to put the parts together into a whole screen (the frame and its regions, the title bar,
  which form of navigation, four screens to start from, narrow windows). Recommendations, not rules: the showcase
  shows each one live under «Layout patterns», in the Practices view.
- `docs/mobile.md`: the system on a phone. The idea (the same app in one column, one job on each screen, act at the
  foot, undo and do not ask), what the toolkit does by itself (44px with a finger, 16px fields, the drawer, the date
  card as a sheet…) with the measures at 390px, what an app adds (which navigation, the bar, actions, forms, sheets),
  seven layouts and their code. The showcase shows it under «On a phone» in each guide view, and as one small app in a
  frame as wide as a phone under «Phone layouts», in the Practices view.
- `docs/component-inventory.md` and `docs/tokens.css`: every component against Ark, Park and the other components,
  with each deviation approved (and why) or fixed; the tokens with the file each one comes from.
- `showcase/`: the design system shown with its own frame (`AppShell`), in five views as tabs in the bar. Philosophy,
  Guidelines and Practices say what this README, `DESIGN.md`, `docs/patterns.md` and `docs/mobile.md` say, with live
  examples (the layout gallery and the phone layouts are in Practices); Components shows the components (all but a few, which `showcase/vite.config.mjs` names) in their variants, sizes and states
  (hover, pressed and focus forced with `data-force`), in light and dark and in several palettes; Examples shows four
  whole apps of the suite made of these parts: a to-do list (Ethel) and a mail client (Qamille), each on a computer
  and on a phone, in a browser tab and as a native app in Tauri (`?view=examples&device=phone&host=native`), and a
  desktop workspace for terminal agents (Shinatama), as a native app on a computer only, whose missing parts are marked
  `GAP:` in `showcase/shinatama.tsx`, and a cleaner for Windows (Xiox) in the sheet frame (`AppShell frame="sheet"`),
  also a native app on a computer only: sketches with made-up content and each app's own theme, with what the host
  changes and what it does not. `npm run showcase`
  serves it (Vite, development only, not part of the package);
  `?view=guidelines&theme=amber-bold&scheme=dark&density=compact&open=menu&animated=1` picks the view, the theme (`base`,
  or a palette built from one colour, `<colour>-<combination>`) and the density (`compact`, `normal` or `large`;
  «Look» in the bar has a switch for it too, with the shape and the animations), opens what opens on a gesture and
  turns motion on. An address that opens something, or ends in `#<section>`, starts in the view that holds it.
- `showcase/builder.html` (the same `npm run showcase`, at `/builder.html`): the app editor. A whole app is made by
  dragging the toolkit's parts into the regions of the one frame (`AppShell`): the bar at the head, the tabs under it,
  the sidebar, the content, the details, the actions, the strip and the bar at the foot. A region takes only what
  belongs there (a toolbar holds actions, a sidebar holds places), as `docs/patterns.md` says. An app has screens: the
  bar, the sidebar, the tabs and the foot are shared, the content, the details and the actions are each screen's own,
  and a button, a row or a tab can go to a screen, open the drawer, show the details or show a notice.
  - One layout serves a computer and a phone: a region, and any component, is there always or only where the frame is
    narrow (under 620px) or wide. The canvas shows the app at the width of a phone, a tablet, a laptop or the room there
    is, in a browser tab or as a native window in Tauri; for a phone it is drawn with the 44px sizes of a finger.
  - «Run» is the app running by itself (`/run.html`, which also opens in a tab of its own, or on a phone): its
    state, its navigation and its notices work, from the same description the export prints.
  - «Export» is the app as source: one React component made only of the toolkit's parts (`src/App.tsx`: no class, no
    style and no element of its own, so it passes `sigrid-check` with `own-class` on), in a project
    that runs in a browser as it is (Vite, Tailwind, the entry file with the look) and as a native app in Tauri after
    the steps of its README (the window's bar and buttons, the browser's keys taken away, the safe areas of a phone).
    `test/editor-export.test.ts` type-checks that source against the toolkit, for the apps the editor starts from and
    for one that holds every component in every setting, and fails on a class, a style or an element of its own in it
    or in the examples written from it for agents (`agents/examples`). The app can also be saved as data and opened again.
  - The inspector holds the component chosen, the screen, the app and the look: everything the toolkit lets an app
    configure (scheme, the theme's two colours, the tone of the accents, the corner shape, the font, the density and
    each of its measures, motion; the icons are Sigrid's one set, not a choice). What is made is kept in the browser.
  - Development only. The dragging, the selection, the outline and the history are Puck's (`@puckeditor/core`, MIT, a
    development dependency, pinned; with it come, for the showcase only, the packages it depends on, TipTap and one
    Radix popover among them: none of it is in the package). Everything it draws is the toolkit's, and the editor
    is itself an app in the one frame. Its pieces are in `showcase/editor/`.
- Checks: `npm run design:lint` (DESIGN.md is valid) and `npm run design:check` (the code uses no colour, palette
  class, arbitrary size, font or effect that DESIGN.md does not permit; config `design-check.config.json`, accepted
  findings in `design-check.known.json`) use the copy of the tool in `tools/zero-slop-design/` (v0.2.1, MIT); the
  scale classes they do not read (text sizes, radii, shadows, weights, icons, border with shadow, boxed key hints,
  loops and effects) are checked against DESIGN.md by `test/design-rules.test.ts`. CI runs both (`.github/workflows/ci.yml`,
  job `toolkit`). An exception needs a `design-check-ignore-next-line <rule>: <cause>` comment.

## For coding agents

The package is ready for a coding agent (Claude Code and others) that builds an app with it. What the agent needs
comes with the package, at the version the app has installed, and most of it is written from the code:

- `AGENTS.md`: how to build a screen with the toolkit, the rules an agent breaks most often, the check to run.
  `llms.txt` is the index of what to read.
- `agents/catalog.json`: every component of every entry, with the props the toolkit declares and their comments.
  `agents/examples/`: four whole apps in the toolkit's frame, written by the code export of the showcase's app editor,
  which take where they run and their window from `@acaprino/sigrid/tauri`; they pass `sigrid-check`. `tasks.tsx` and
  `mail.tsx` are in the frame with lines, `workspace.tsx` in the sheet frame (laid out as Xiox), and `triage.tsx` is a
  screen that fits (`Page fit`).
  The catalogue also has the object types the props are made of (a column of the table, a notice, an option).
  `npm run agents` writes both from the source; a test fails when they fall behind it.
- `DESIGN.md`, `docs/patterns.md`, `docs/mobile.md`, `docs/design-laws.md`: the rules and the guides, inside the
  package.
- `sigrid-check`: the design check, as a command of the package. In an app, `npx --no sigrid-check` checks `./src`
  against `DESIGN.md` and exits with 1 when it finds something, so an agent can run it and correct itself. It finds
  values written by hand where a token belongs (colours, palette classes, sizes in square brackets, gradients,
  `backdrop-blur`, emoji, fonts in CSS); it does not see named classes off the scale, inline styles, or anything of
  the layout: `AGENTS.md` lists what is left to read and to look at. An app keeps its own choices in a
  `sigrid-check.config.json`, whose `rules` are laid over the toolkit's. It reads files and builds nothing. One rule is
  the app's to turn on, `own-class`: it reports every class written by hand and every stylesheet of the app, for an
  app laid out with the layout parts alone (off by default).
- A Claude Code plugin with one skill, `sigrid`, which sends the agent to those files before it writes and to the
  check after:

  ```text
  /plugin marketplace add acaprino/sigrid
  /plugin install sigrid@sigrid
  ```

  Or, for everyone who works on an app, in the app's `.claude/settings.json`:

  ```json
  {
    "extraKnownMarketplaces": { "sigrid": { "source": { "source": "github", "repo": "acaprino/sigrid" } } },
    "enabledPlugins": { "sigrid@sigrid": true }
  }
  ```

Without the plugin, one line in the app's own `AGENTS.md` or `CLAUDE.md` does the same: «For any interface work read
`node_modules/@acaprino/sigrid/AGENTS.md` first, and run `npx --no sigrid-check` after».

## Use a release

Every merge of `develop` into `main` publishes a [GitHub Release](https://github.com/acaprino/sigrid/releases) (tag
`v<version>`). The repository is public: no login is needed to download. Each release holds three files:

- `acaprino-sigrid-<version>.tgz`: the package, with what `files` in `package.json` lists: `dist/`, `src/` (Tailwind's
  `@source` and the `./theme.css`, `./fonts.css` and `./src/*` exports need it), `tauri/`, `bin/` (`sigrid-check`),
  `agents/`, `docs/`, `tools/zero-slop-design/`, `AGENTS.md`, `DESIGN.md`, `llms.txt`, `LICENSE`, `THIRD_PARTY.md`,
  `README.md` and `provenance.json`, with `package.json` itself.
- `manifest.json`: `{ "version", "packages": [{ "name", "file", "sha256" }] }`, the SHA-256 of the package.
- `SHA256SUMS`: `<sha256>  <file>` for every other file of the release.

```bash
# once for each of the three files, or take them from the release page
curl -LO https://github.com/acaprino/sigrid/releases/download/v<version>/<file>
sha256sum -c SHA256SUMS                                   # PowerShell: Get-FileHash -Algorithm SHA256 <file>
npm i ./acaprino-sigrid-<version>.tgz
```

If you are signed in to the GitHub CLI (`gh auth login`), `gh release download v<version> --repo acaprino/sigrid`
fetches the three files at once.

`sha256sum -c` has to say `OK` for the package and for `manifest.json`. Inside the package, `provenance.json` is
`{ "package": "@acaprino/sigrid", "version", "commit", "files": { "<path>": "<sha256>" } }`: the source commit the
release was built from and the SHA-256 of every file of the package except itself, so an installed copy can be checked
file by file. `commit` is the parent of the `v<version>` tag: the tag's own commit ("release v<version>") only changes the
version in `package.json` and `package-lock.json`, and the package was built with that version already written.
The release is built by `npm run release` (`scripts/release.mjs`: build, the checks CI runs, tests, then pack). To try it
locally, `npm run release -- --skip-test` fills `release/` (not committed) without the tests.

## Build and test

```bash
npm ci
npm run design:lint          # DESIGN.md is a valid zero-slop-design file
npm run design:check         # the sources against DESIGN.md
npm run typecheck            # tsc --noEmit, the sources and tauri/
npm run showcase:typecheck   # the showcase
npm run typecheck:test       # the sources and the tests together
npm run build                # dist/index.js (+ chunks/, Motion separate), dist/index.d.ts, dist/styles.css, dist/fonts/
npm test                     # vitest run
```

An app's product package bundles the toolkit from this `dist` (its build and tests can rebuild it when the sources are
newer), and the app builds both before its own build.
