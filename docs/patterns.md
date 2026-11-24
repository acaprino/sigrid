# Layout patterns

How to put the toolkit's parts together into a whole screen. These are recommendations, drawn from what works in the
suite's apps (Imago's frame is their source): nothing here is checked by a program, and an app that has a reason does
otherwise. The owner's rules R1 to R14 (`DESIGN.md`) are a separate matter: those are checked.

The gallery shows every pattern live, at the widths where the frame changes: `npm run showcase`, view
Practices, section «Layout patterns». The parts are optimized for these layouts, and work outside them too.

The app editor of the showcase (`/builder.html`) is these patterns as a tool: an app is made by dragging parts into the
regions of the frame, each region takes only what the table below puts there, and the result runs and is exported as
source.

## Start from the one frame

Use `AppShell` for the window of an app, and fill in only the regions the app needs.

| Region | Put there | Leave out when |
|---|---|---|
| `titleBar` | The name of the place, the toolbar, the window's buttons | Never: it is where the user finds where they are |
| `status` | The last result, one line | The app has notices for it (`Toasts`) |
| `sidebar` | The places of the app, as rows with an icon | The app has one place, or three or four views (use tabs in the bar) |
| content | What the app is for | Never |
| `inspector` | The details or the form of the one thing selected | Nothing is ever selected |
| `actions` | What can be done to the content, the main action last | The actions fit in the toolbar |
| `footer` | The state of the service, counts, the keys that work now | There is nothing to say |

Recommended:

- Let the frame measure itself. Its steps (inspector docked from 1000px, sidebar whole from 850px, a rail from 620px,
  a drawer under it) follow the window, so a window half-snapped on a wide screen is laid out as a narrow one. Pass
  `steps` only when a region of the app has another width.
- Let it take its height too: it is as tall as what is seen (the browser's bars, the keyboard, a rotation:
  `--app-height`), never taller than the box it is put in, and where it is the whole screen it keeps clear of the
  notch and the gesture bar. No `h-dvh`, `h-screen` or `100vh` around it.
- Keep every control that is on every page in one place: the tools of the bar, the bar at the foot, a switch. A tool
  that a view lacks keeps its place, empty (`ToolbarButton absent`); what changes length sits next to a
  `ToolbarSpacer`. A two-state switch stays where it is in both states.
- Keep one solid action in the window (R3). Where there is an action bar it is there, last; otherwise it is in the
  toolbar, last before the window's buttons.
- Show the button that opens the sidebar only where the sidebar is a drawer (`useAppShell().sidebar === 'drawer'`).

## The shared controls stay where they are (R14)

A control every page of an app shares never moves from one page to the next: an ADHD eye that has to look for it
again is distracted, and frustrated. The owner's rule of 2026-11-23, above all on a phone.

- The title bar, the views (tabs in the bar, under it or at the foot), the sidebar, the footer and the bottom bar are
  the same on every page: the same parts, in the same order, in the same place. Build them once, outside the pages.
- A shared control that does nothing on one page stays, disabled; it is not taken away, and nothing slides into its
  place.
- The primary action is always in the same place: the end of the action bar, or the end of the toolbar, on every
  page that has one.
- A page's own tools go in its own regions (the content, a `Panel`'s header and tools, the inspector), never between
  the shared controls.
- On a phone the bar at the head and the views at the foot are there on every page, in the same order; a page does
  not hide them, and a sheet opens over them, not in their place.

## Two forms of the frame: lines, or a sheet

The frame has two forms with the same regions and the same steps; `frame` chooses one.

- `line`, the default: one surface, the page, with a line between the regions.
- `sheet`, Xiox's frame: the title bar and the sidebar sit on the window's ground, with no line and no fill of their
  own; the work area (status, content, inspector, actions, footer) is one sheet of the page's surface, with a line at
  its top and, where a sidebar lies beside it, at its start, with the large corner there. The ground is the sidebar's
  surface, so a light sidebar and the ground are one; a theme whose sidebar has colours of its own (a dark or solid
  column) keeps its column, and the ground is the lanes' surface. Where the sidebar is a drawer, or there is none, the
  sheet has no corner. No glass: the toolkit draws no blur.

Recommended for the sheet, as Xiox does it: the views as tabs in the bar, «Commands» with its shortcut before the
window's buttons (`ToolbarButton variant="outline"` with `shortcut="Ctrl K"`), the status row at the head of the
sheet, the content as a `Panel`, the actions at its foot, and the keys that work now in the footer (`KeyHints`, read from
the registry of commands, with `{ keys: 'F6', label: … }` for the frame's own move between regions). The gallery
shows it: view Examples, section «Xiox».

A `Panel` lays out a region inside: a header with the title, a line that says how much is there and the tools of the
whole panel at its end (a filter); a row of tools under it (a search); a body that alone scrolls; a foot that stays in
sight, with a line above it. It paints nothing: it lies on the surface of the region that holds it.

## The title bar and its toolbar

- Start the bar with the app (`ToolbarBrand`): a square in the accent with the initial of its name, and the name. It
  is how a user tells one window of the suite from another at a glance. The name alone (`mark={false}`) is as good where the app has no colour of its own. A drawn logo is not needed.
- Say where the user is right after the app's name, with a chevron between them: «Daodan › Settings»
  (`ToolbarBrand page`). On a narrow bar the name gives way and the place stays.
- Order: the app and the place, then room that moves the window (`ToolbarSpacer`), then find (`ToolbarSearch`), then
  switches of the view, then actions, the solid one last.
- An action used many times a day is an icon alone with its name as a hint and its key. An action used rarely, or one
  whose icon nobody would guess, keeps its word, or goes in a menu.
- Rest the search as a field (`closed="field"`) where searching is the main way in, as the magnifier where it is one
  tool among others.
- Two actions in one bar never share an icon. The magnifier is the search; the button that opens the command palette
  has another drawing (a prompt), or its word alone.
- A switch that is on (`pressed`) says so with the selection tint. Do not use the solid variant for a switch.
- At most seven items in sight. More than that, group them (`ToolbarGroup`, `ToolbarSeparator`) or move the rare ones
  to a menu.
- In a shell that draws no frame, pass `dragProps` and `WindowControls`; on the web pass neither. Nothing else changes.

## A compact bar, or the bars of a classic desktop program

The same parts give a denser, older look by a parameter, with no second set of components.

- `TitleBar size="compact"` is a thin caption (32px at normal density, in place of 48px); the toolbar inside it takes
  28px items by itself. Use it where the content needs every row: tables, logs, editors.
- For the bars of a classic Windows program, keep the compact caption for the app and the place, and put under it
  (`AppShell`'s `tabs`) a `Toolbar size="sm"`: text buttons that open a `DropdownMenu` («File», «Edit», «View») are
  its menu bar, and the icons beside them its toolbar. The corners are the square ones by default (2/4/6px; a theme may round them with `ThemeDef.shape`), and the
  `compact` density lowers the rows to match.
- The regular bar is still the recommendation for an app used with a finger, or by someone new to it: bigger targets,
  fewer things in sight. With a coarse pointer every control is 44px in both.

## Views as tabs: in the bar, under it, or at the foot

An app with a few views of the same weight (Xiox: Cleanup, Registry, Developers, Settings) shows them as words:
`ToolbarTabs`. The view the user is in has the stronger text and a short bar in the accent under it.

- In the title bar, right after the app, when the views are the app's main places and there are up to five. It is the
  form that reads as a native window: app, views, room that moves the window, commands, the window's buttons.
- Directly under the bar (`AppShell`'s `tabs`), when the bar is already full, or when the tabs are views of what the
  sidebar chose (All, Unread, Flagged) and not places of the app.
- In a bar at the foot of the window (`AppShell`'s `bottomBar`, tabs with `edge="top"` and `layout="stacked"`: the icon
  over the word), on a narrow window or a phone, where the thumb reaches the foot and not the head. Up to five.
- Small, in the status bar (`footer`, tabs with `edge="top"` and `size="sm"`), for views that change what the content
  shows without being places of the app: the sheets of a document, the panes of a console.
- One place for the views on one screen, and not together with a sidebar that lists the same places.

## The command palette

Give the app a `CommandPalette` and open it with Ctrl+K and from a «Commands Ctrl K» button in the bar: declared in
a `CommandsProvider` (`useCommand`), the commands are listed and their keys run with no list kept by hand, and the
registry opens the palette itself (or `useCommandKey`, for a palette given its list). Put in it every place the app can go to and every action that has no button in sight, each with its own key at
the end of its row: the palette is where a user learns the keys. Group the commands («Go to», «Look») once there are
more than seven. A command that cannot run now stays in the list, dimmed, so the list does not jump.

## Navigation: which form

| Form | Fits | Built with |
|---|---|---|
| Whole sidebar | Five places or more, or places with counts | `Sidebar`, `SidebarGroup`, `NavItem` |
| Rail of icons | The same places, when the content needs the width | `Sidebar collapsed`; the frame does it by itself from 620px to 850px |
| Drawer | A narrow window or a phone | `Sidebar` with `open`; the frame does it under 620px |
| Tabs: in the bar, under it, or at the foot | Up to five views of the same weight | `ToolbarTabs` (see above) |

Recommended: every row has an icon (R6) so the rail needs no second design; the rows used most are the first group; a
count is a pill at the end of the row (R5).

## Four screens to start from

**List and detail.** For things to read and act on: mail, tasks, files. The sidebar says where, the content is the
list (`ItemList`, `ItemRow`: a title, a line under it, a fact at the end, a dot for unread), the inspector shows the
one selected. The row chosen has the selection tint (R1). Under 1000px the inspector
covers the end of the list and the list stays usable beside it: choosing another row does not close the inspector
(a press outside it never does, unlike a sheet), it shows the new one, and the focus stays in the list. Its button and
Escape with the focus in it close it (a swipe towards its edge too, under 1000px), and the focus goes back to where
it last was outside it. Escape with the focus in the list or in the search field is theirs, or the app's: to close
the details with Escape from anywhere, the app declares a command on Escape (`useCommand`, `when` the details are
open). In the inspector, Escape on a field that holds text, or with a list open, stays there.
Where the thing chosen is the work itself and not its details (a message to read, a file to edit), it needs the
width the inspector does not have: the content is two panes, `ContentSplit`, the list a column of a fixed width and
the thing chosen in the room that is left. The split measures itself as the frame does and, where the two do not fit,
shows one at a time (`show`); the app then puts its way back to the list in the bar. The inspector stays for the
details. A thing one both ticks and opens (a task) keeps its box beside the row's button: `ItemRow control`.
A list that can hold thousands of rows (a mail folder, a log) is a `VirtualList` (`@acaprino/sigrid/virtual`): the
same rows, of which only the ones in sight are drawn. Things with several facts to compare and sort by (files, records,
invoices) are a `DataTable` (`@acaprino/sigrid/table`); on a phone a table keeps two or three columns, or is a list. A
list whose order is the user's (the columns of a board, a queue) is a `ReorderList` (`@acaprino/sigrid/reorder`).
Text with a little form (a message, a note) is written in a `RichTextField` (`@acaprino/sigrid/rich-text`). A message
of mail, with its addresses and its subject, is an `EmailComposer`, from the same entry. Things
that hang from one another (tasks and what they wait for, the parts of a project) are a `GraphCanvas`
(`@acaprino/sigrid/graph`) in the content, with the chosen thing's details in the inspector; things joined by
relations that are not «hangs from» (calls, imports, data) are one with `model="graph"`, where nothing closes. There a
group of things opens in one of two ways, and an app gives a thing one of them. In place (`open` on the node,
`onToggle`): the group becomes a frame with its things in it and the rest of the graph stays in sight; for a group the
person looks into while reading what is around it (the parts of a module among the modules that call it). Or the app
goes into it (`openLabel`, `onOpen`): the canvas then shows only what the thing holds, and the app gives the way back
(a row of the places above it, a command); for a thing too large to read among the others, or one the person works in
for a while. Where the places are the app's and the person may want another arrangement, the things move (`movable`),
and the layout is put back with the canvas's own button. A canvas
that is the content takes its height (`fill`); under a row of filters, the two in a `Column fill`, what the row leaves
(a plain `Column` has no height to give). The
examples use them: the Archive and the composer of the mail client, the Stack of the to-do list. Lines of several
kinds have their key under the canvas: a `GraphLegend`, from the same entry.

**Sidebar and page.** For settings and documents. One column of text no wider than 65 characters, centred. Each
choice is a row with its name at the start and its control at the end; a choice takes effect at once, with no Save
button, unless it can fail. Each section shows its essential choices and keeps the rest under Advanced (R13).

**Board.** For work that moves through stages. Lanes on the quiet fill (`bg-paper-2`), cards raised with the smallest
shadow and no border (R4), a data colour as a dot (R10), today in the accent. The switch between list and board is in
the bar. On a narrow window show one lane at a time, chosen from a `ToggleGroup`.

**Focus.** For one thing at a time. No sidebar and no inspector: the thing, how many are left, the way out, and the
actions with the main one first. It is the screen where the accent has the least to compete with. A focus screen that
must fit one screen with no scrolling (sort, triage) is a `Page fit`: the head (a switch, a count) and the foot (the
answers) keep their height and the body between them gives way and scrolls inside itself, never the document.

## Inside a region: piles, rows, grids, and one part's own place

A region is laid out with the layout parts, each named by what it is for: `Column` a pile, `Cluster` a row that
wraps, `Split` two groups at the two ends of a row, `Grid` cells in as many columns as the width holds, `Spacer` the
empty room that pushes what follows to the end. None has a breakpoint: each measures the room it has, so the same
screen holds beside an open inspector and on a phone.

The pile, the row and the grid decide for all their parts. Where one part must sit differently it is a `Cell`:

- **It lines up by itself** (`align`). A row that lines its parts up at the top keeps a picture beside the first line
  of a long message; the one button of that row sits at its foot with `<Cell align="end">`.
- **It takes the room the others leave** (`grow`). `Spacer` leaves that room empty; `<Cell grow>` gives it to a part:
  the words between a picture and a button, the field beside its button, the list between the filters and the foot of
  a `Column fill`.
- **It is wider than a column of the grid** (`span`). In a board of numbers the chart is `<Cell span={2}>`: two
  columns where the grid has two, one where it has one, so nothing is pushed out on a phone. `span="full"` is a whole
  row at any width: a note or a heading between the rows of cells.

A part that sits as the others do needs no `Cell`. One `Cell` in a row is a choice; a `Cell` round every part means
the row, the pile or the grid was the wrong one.

Space is a step of one scale. `xs` to `xl` (4 to 24px) is the whole of it for a screen that is worked in: a list, a
form, a panel, a board. `2xl`, `3xl` and `4xl` (32, 48 and 64px) are for a page of a few large parts that is read
once, such as a welcome or a first run, where the room is what tells the parts apart. More room on a working screen
only spreads out what the eye has to gather; and a region with nothing in it yet is an `Empty`, not a pile with a
large gap.

## Narrow windows and phones

- Do not design a second app. The same regions give way in order: the inspector becomes a panel, the sidebar a rail
  and then a drawer, the words beside icons go (under 448px of toolbar), the title last.
- What the user needs to act never gives way: the solid action and the window's buttons stay at every width.
- With a finger every control is at least 44px (the toolkit does it); leave the key hints out on a phone.

- The height is the host's: the frame and `Page fit` take what is seen, a phone lying down (under 500px tall, `short:`)
  keeps the bars thin. `docs/mobile.md`, «Heights and orientation», says what each host does.
- Controls never change place between pages or states (above, «Start from the one frame»).

A phone has a guide of its own, `docs/mobile.md`: the idea, what the toolkit does by itself, what an app adds, the
heights of each host, and seven layouts (list, detail as a page, capture sheet, board with one lane, settings page,
focus, a screen that fits) with their code. The gallery shows them as one small app in a frame as wide as a phone,
with the conditions to try the screen that fits in: view Practices, section «Phone layouts».

## An app in a window of its own

For an app that runs in its own window (Tauri, or any host without a browser around the page), three switches make
it behave as a program. They are Imago's techniques; on a page in a browser tab leave them off.

- `AppShell desktop`: the chrome is not selectable and keeps the arrow cursor, while the content, the inspector's body
  and every field stay selectable (mark anything else with `data-selectable`). What opens over the window opens under
  the title bar, so the window can still be moved, minimized and closed while a dialog is open.
- `useDesktopGuard()`: the browser's own keys (reload, print, find, the developer tools), its right-press menu outside
  fields, the mouse's back and forward buttons and the dragging of pictures and links do nothing. Name a terminal or
  an editor in `ownKeysIn` and it keeps its keys.
- `TitleBar` with `dragProps` and `WindowControls`, as above.

In Tauri, `@acaprino/sigrid/tauri` wires them from the page, with nothing of Tauri loaded in a browser:

```tsx
import { DRAG_REGION, readHost, useWindowControls } from '@acaprino/sigrid/tauri'

const ownWindow = readHost().ownWindow // a Tauri window on a computer
const controls = useWindowControls({ enabled: ownWindow, onError: (what, error) => say(`${what} failed`) })
<TitleBar dragProps={ownWindow ? DRAG_REGION : undefined} windowControls={ownWindow ? <WindowControls {...controls} /> : undefined} />
```

`useZoom` gives the window Ctrl with + - 0 and the wheel; `useSnapLayouts` and `useWindowTheme` are opt-in, with the
names of the app's own native commands; `TAURI_PERMISSIONS` lists what the app's capability file grants.

The gallery shows the same app with and without these switches: view Examples, where a to-do list and a mail client
are drawn in a browser tab and in a Tauri window, on a computer and on a phone, with a table of what the host changes.

What the page cannot do is the host's: a transparent window with no white flash, the place and size of the window
kept between runs, a minimum width (500px is Imago's), navigation limited to the app's origin, and recovery when the
web view is lost. The native skeleton of an app (`src-tauri`) is made by the tauri-app-builder plugin of Claude Code;
Imago's `imago-shell` crate does these for Tauri on Windows.

## Progress of a task

- A task of a few named stages (a signup, a tutorial, an import): `Steps`, in a column on a phone and in a row where
  there is width. The app moves `current` on as each stage ends and marks the one that failed with `status: 'error'`.
  A wizard keeps its own Back and Continue (one solid action, R3); `Steps` has none.
- One thing with a size (a file, an export): `Progress` under its name, with the speed or the size beside the name; at
  the end the text says «Complete» and the size takes the speed's place. A failure keeps the range where it stopped
  (`status="error"`), and Retry is the one solid action.
- A job of the whole window (an analysis, a scan, a cleaning), as Xiox does it: the frame's `status` row is its
  progress while it runs, and appears there by itself, under the tabs. In order: the state as a word («Analyzing»),
  the job, a `Progress` of a fixed width, how far as text («36%»), and the item it is on; what the row says at its end
  stays. The list is frozen meanwhile: what the job works on cannot change. At the end the row says the result
  («Analysis done · 13.48 GB to delete»).
- A time that runs out: `ProgressRing` with the time left as its value and as its text; it empties by itself.
- Where it is not known how far it is, `value={null}`: a track and the word «In progress». Nothing loops.
- Do not make screen readers read every percent: say the end in a toast (`Toasts`), and the failure with a `Note`
  `tone="error"` beside the progress (announced as it appears, with «Retry» as its action): one look for a failure.

## What to avoid

- Two toolbars on one screen, or actions both in the toolbar and in an action bar.
- A modal inspector: the user loses the list they were choosing from.
- A sidebar that mixes places and actions. Rows are places; actions are buttons.
- Empty regions kept for symmetry. A frame with three regions is a good frame.
