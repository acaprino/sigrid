# Sigrid UI

Sigrid is the shared design system for React apps: the single source of truth for colours, tokens, fonts, primitives and motion. It
knows nothing of any app: no app's name, concepts or product components, and no window API of a desktop shell (its
title bar is plain web, and a shell drives it from outside: see [Toolbar and title bar](#toolbar-and-title-bar)). An app builds
its product components on top of it, usually in a package of its own that re-exports what the app needs from here.
MIT licence (`LICENSE`); the third-party code it adapts, all MIT, is listed in `THIRD_PARTY.md`.

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

To depend on a published version instead of a checkout, see [Use a release](#use-a-release) below.

To migrate from `@acaprino/toolkit`, update the dependency name and all imports, including stylesheet imports,
to `@acaprino/sigrid`. Point local dependencies and Tailwind source paths at your checkout. Releases through
`v1.0.1` carry the original package and tarball names.

## The four layers

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
   first paint's palettes are in `src/styles/theme.css`. No hard-coded colours anywhere else. A theme can also be made
   from two colours (`src/color-theme.ts`): `colorTheme` takes the theme colour and a spot colour, the one loud colour
   for the few things that ask for attention (tokens `spot`, `spot-foreground`, `spot-soft`, `spot-ink`);
   `spotSuggestions` proposes three spot colours that go with a theme colour, from quiet to loud, and the `ColorMatch`
   component lets a user pick both (the showcase has it in its theme gallery). A theme can also be made from a base
   and an accent (`src/harmony.ts`): `pageTint` brings any base colour to a very light tone, the page (no base is the
   white); `accentSuggestions(base)` proposes the accents that go with it by the classical harmonies, all on the
   OKLCH wheel (split complement, complement, triad, neighbours, the same hue), ranked, with the first marked as
   recommended, none in the red of errors; `duoTheme({ base, accent })` gives the two to `applyTheme` as its `own`.
   The app editor's «Look» panel has it: choosing a base suggests its accents.

Third-party provenance is in `THIRD_PARTY.md`, checked by `test/provenance.test.ts`.

## Density

Density is data, like the themes (`src/density.ts`). The toolkit ships three presets, `DENSITIES`; `normal` is the
default and equals the sizes the toolkit had before density existed.

| | control heights (md/sm/xs) | side padding (md/sm/xs) | row height | row padding |
|---|---|---|---|---|
| `compact` | 36 / 32 / 28px | 12 / 10 / 8px | 32px | 4px |
| `normal` | 40 / 36 / 32px | 14 / 12 / 10px | 40px | 8px |
| `large` | 44 / 40 / 36px | 16 / 14 / 12px | 48px | 12px |

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
    <ToolbarButton label="New message" variant="default" icon={<Icon name="add" />}>New</ToolbarButton>
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

## The frame of an app

`AppShell` is one layout with seven regions, after Imago's frame: `titleBar`, `status`, `sidebar`, the content (its
children, a `<main>` with a skip link to it), `inspector`, `actions` and `footer`. An app passes the regions it needs.

The frame measures its own width, not the screen's (`APP_SHELL_STEPS`, Imago's): from 1000px the `Inspector` is docked
and pushes the content, under it a panel over the end of the content, never modal; from 850px the `Sidebar` is whole
(or the rail the user chose), from 620px to 850px a rail, under 620px a drawer. `Sidebar` and `Inspector` read the step
from the frame; the steps are recommended, and an app passes its own with `steps` (0 switches one off);
`useAppShell()` gives the step to the app, which shows its «open the menu» button only where the sidebar is
a drawer.

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

- `.`: the theme engine and catalog, the colour palette, `cn`, the primitives (`Button`, `Input`, `Textarea`,
  `Checkbox`, `Select`, `Sheet*`, `DialogRoot`/`Dialog*`, `DropdownMenu*`, `Popover*`, `RadioGroup*`, `ToggleGroup*`,
  `Tooltip`, `Kbd`, `Empty`, `Badge`, `Calendar`, `DateRangeField`, `Switch`, `Tabs*`, `FormField`, `Count`, `Steps`, `Progress`/`ProgressRing`/`ProgressSegments`, `NavList`/`NavItem`, `Sidebar`/`SidebarGroup`, `Toolbar*`, `TitleBar`, `WindowControls`, `AppShell`, `Inspector`, `CommandPalette`, `ItemList`/`ItemRow`, `Table`/`TableRow`/`TableCell` and the other parts of a table, `Slider`, `SearchField`, `Combobox`, `Avatar`), the surfaces (`Dialog`, `Toasts`), `PortalContainerProvider`
  (where overlays mount for part of an app drawn in another document), the generic fields and helpers (`DateField`, `DurationField`, `ChipsInput`, `Swatches`, `AttachmentsSection`,
  `AttachmentViewer`, `Thumbnail`, Markdown, drop payloads, media queries, overlay layers), and the Motion loader.
  Where a piece needs an app's word or default, it takes a parameter (`Select`'s `renderMark`, the date fields'
  `placeholder`, `AttachmentsSection`'s `textNotice`).
- Four entries of their own, each on a library that an app loads only if it imports the entry (the versions are
  pinned and listed in `THIRD_PARTY.md`; the form, the words and the rules are the toolkit's):
  - `./table`: `DataTable`, on TanStack Table and TanStack Virtual. Columns say their heading, their cell and the
    value they sort by; a press on a heading sorts up, then down, then puts the rows back (`aria-sort`); one row can
    be chosen (`current`, `onRowPress`, arrows among the rows); with `virtual` only the rows in sight are in the
    page. For filters, groups or pinned columns an app drives TanStack Table itself and draws it with `Table` and
    its parts, which are in the main entry.
  - `./virtual`: `VirtualList`, on TanStack Virtual: a long list of `ItemRow`s of which only the ones in sight are
    drawn. It measures a row as it is drawn (any density, a finger's 44px) and still tells screen readers how many
    items there are and where each one is.
  - `./reorder`: `ReorderList` and `moveItem`, on dnd-kit: a list put in order by the handle of each row, with the
    pointer, a finger or the keyboard (Space, arrows, Space; Escape puts it back), announced in the app's words.
  - `./rich-text`: `RichTextField`, on TipTap: bold, italic, underline, two kinds of list, a quote, undo and redo,
    with the toolkit's `Toolbar` above the text. The value is HTML; it sits in a `FormField` as any control.

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

  <VirtualList aria-label="Messages" count={mail.length} className="h-full">
    {(index) => <ItemRow title={mail[index].from} description={mail[index].subject} />}
  </VirtualList>

  <ReorderList aria-label="Columns" items={lanes} itemId={(lane) => lane.id} itemName={(lane) => lane.name} onReorder={setLanes}>
    {(lane) => lane.name}
  </ReorderList>

  <FormField label="Notes"><RichTextField value={html} onChange={setHtml} /></FormField>
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
- Icons: `Icon` draws a meaning (`settings`, `delete`) with the pack the user chose (`IconPackProvider`). The toolkit
  draws what apps have in common (`ICON_NAMES`: the views and settings, the menu entries, and the actions of a mail,
  calendar or editing screen: `mail`, `reply`, `archive`, `bold`, `undo`, `attach`, `windowMinimize`…), in every pack; an
  app adds the meanings of its own subject with `icons`: `<IconPackProvider pack={pack} icons={{ invoice: { lucide: Receipt,
  fluent: ReceiptColor, emoji: '\u{1F9FE}' } }}>`, then `<Icon name="invoice" />`. The line drawing is required; a pack left
  out falls back to it; a name nobody draws is an empty slot of the same size.
- Status colours, beside the red: `success` and `warning` (text, each with a `-soft` fill) and `highlight` (behind a
  match inside a text). Fixed for every theme, as the red is; the engine keeps their contrast on every theme.
- `./theme.css` and `./fonts.css`: to `@import` in an app's own Tailwind CSS (with an `@source` on this package's
  `src`, and `@source not` on `src/internal/motion-impl.tsx`).
- `./styles.css`: the compiled CSS, for a page that does not compile Tailwind itself.
- DOM hooks an app can rely on: the stack of notices carries `data-toasts` (`TOASTS_ATTR`) and writes the room it takes
  at the bottom of the window to `--toasts-room` on the root (`TOASTS_ROOM_VAR`; sheets keep their foot above it with
  `SHEET_TOASTS_ROOM`); an app with a bottom bar sets `--bottom-bar-room` on the root (`BOTTOM_BAR_ROOM_VAR`) and the
  notices sit above it.

## Design rules, showcase and checks

- `DESIGN.md`: the design file (zero-slop-design format): the tokens of the default theme in light and dark, the
  owner's rules R1 to R10 of 2026-11-20 (accent in four places only, border or shadow, plain key hints and counts,
  icons that inform, radii 4/6/10 (a theme may be `sharp` 2/4/6 or `round` 6/10/14: `ThemeDef.shape`), text sizes 12 to 16px for the controls and 18, 20 and 24px for an app's titles, heights 36/32/28 at normal density, 2px accent focus ring, data colours as dots…), the approved
  references (Ark UI for behaviour, Park UI for form) and the open questions. Read it before a UI change.
- `docs/patterns.md`: how to put the parts together into a whole screen (the frame and its regions, the title bar,
  which form of navigation, four screens to start from, narrow windows). Recommendations, not rules: the showcase
  shows each one live under «Layout patterns», in the Practices view.
- `docs/mobile.md`: the system on a phone. The idea (the same app in one column, one job on each screen, act at the
  foot, undo and do not ask), what the toolkit does by itself (44px with a finger, 16px fields, the drawer, the date
  card as a sheet…) with the measures at 390px, what an app adds (which navigation, the bar, actions, forms, sheets),
  six layouts and their code. The showcase shows it under «On a phone» in each guide view, and as one small app in a
  frame as wide as a phone under «Phone layouts», in the Practices view.
- `docs/component-inventory.md` and `docs/tokens.css`: every component against Ark, Park and the other components,
  with each deviation approved (and why) or fixed; the tokens with the file each one comes from.
- `showcase/`: the design system shown with its own frame (`AppShell`), in five views as tabs in the bar. Philosophy,
  Guidelines and Practices say what this README, `DESIGN.md`, `docs/patterns.md` and `docs/mobile.md` say, with live
  examples (the layout gallery and the phone layouts are in Practices); Components shows every component in its variants, sizes and states
  (hover, pressed and focus forced with `data-force`), in light and dark and in several palettes; Examples shows two
  whole apps of the suite made of these parts, a to-do list (Ethel) and a mail client (Qamille), each on a computer
  and on a phone, in a browser tab and as a native app in Tauri (`?view=examples&device=phone&host=native`): sketches
  with made-up content and each app's own theme, with what the host changes and what it does not. `npm run showcase`
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
  - «Export» is the app as source: one React component made only of the toolkit's parts (`src/App.tsx`), in a project
    that runs in a browser as it is (Vite, Tailwind, the entry file with the look) and as a native app in Tauri after
    the steps of its README (the window's bar and buttons, the browser's keys taken away, the safe areas of a phone).
    `test/editor-export.test.ts` type-checks that source against the toolkit, for the apps the editor starts from and
    for one that holds every component in every setting. The app can also be saved as data and opened again.
  - The inspector holds the component chosen, the screen, the app and the look: everything the toolkit lets an app
    configure (scheme, the theme's two colours, the tone of the accents, the corner shape, the font, the density and
    each of its measures, the icon pack, motion). What is made is kept in the browser.
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
  `agents/examples/`: two whole apps in the toolkit's frame, written by the code export of the showcase's app editor.
  The catalogue also has the object types the props are made of (a column of the table, a notice, an option).
  `npm run agents` writes both from the source; a test fails when they fall behind it.
- `DESIGN.md`, `docs/patterns.md`, `docs/mobile.md`: the rules and the guides, now inside the package.
- `sigrid-check`: the design check, as a command of the package. In an app, `npx --no sigrid-check` checks `./src`
  against `DESIGN.md` and exits with 1 when it finds something, so an agent can run it and correct itself. It finds
  values written by hand where a token belongs (colours, palette classes, sizes in square brackets, gradients,
  `backdrop-blur`, emoji, fonts in CSS); it does not see named classes off the scale, inline styles, or anything of
  the layout: `AGENTS.md` lists what is left to read and to look at. An app keeps its own choices in a
  `sigrid-check.config.json`, whose `rules` are laid over the toolkit's. It reads files and builds nothing.
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

- `acaprino-sigrid-<version>.tgz`: the package, with `dist/`, `src/` (Tailwind's `@source` and the `./theme.css`,
  `./fonts.css` and `./src/*` exports need it), `package.json`, `LICENSE`, `THIRD_PARTY.md`, `README.md` and
  `provenance.json`.
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
The release is built by `npm run release` (`scripts/release.mjs`: build, typecheck, tests, then pack). To try it
locally, `npm run release -- --skip-test` fills `release/` (not committed) without the tests.

## Build and test

```bash
npm ci
npm run typecheck   # tsc --noEmit
npm run build       # dist/index.js (+ chunks/, Motion separate), dist/index.d.ts, dist/styles.css, dist/fonts/
npm test            # vitest run
```

An app's product package bundles the toolkit from this `dist` (its build and tests can rebuild it when the sources are
newer), and the app builds both before its own build.
