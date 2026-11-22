# Layout patterns

How to put the toolkit's parts together into a whole screen. These are recommendations, drawn from what works in the
suite's apps (Imago's frame is their source): nothing here is checked by a program, and an app that has a reason does
otherwise. The owner's rules R1 to R13 (`DESIGN.md`) are a separate matter: those are checked.

The gallery shows every pattern live, at the widths where the frame changes: `npm run showcase`, section
«Layout patterns». The parts are optimized for these layouts, and work outside them too.

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
- Keep one solid action in the window (R3). Where there is an action bar it is there, last; otherwise it is in the
  toolbar, last before the window's buttons.
- Show the button that opens the sidebar only where the sidebar is a drawer (`useAppShell().sidebar === 'drawer'`).

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
- A switch that is on (`pressed`) says so with the selection tint. Do not use the solid variant for a switch.
- At most seven items in sight. More than that, group them (`ToolbarGroup`, `ToolbarSeparator`) or move the rare ones
  to a menu.
- In a shell that draws no frame, pass `dragProps` and `WindowControls`; on the web pass neither. Nothing else changes.

## Navigation: which form

| Form | Fits | Built with |
|---|---|---|
| Whole sidebar | Five places or more, or places with counts | `Sidebar`, `SidebarGroup`, `NavItem` |
| Rail of icons | The same places, when the content needs the width | `Sidebar collapsed`; the frame does it by itself from 620px to 850px |
| Drawer | A narrow window or a phone | `Sidebar` with `open`; the frame does it under 620px |
| Tabs in the bar | Three or four views of the same thing | `ToggleGroup` or `Tabs` in the toolbar |

Recommended: every row has an icon (R6) so the rail needs no second design; the rows used most are the first group; a
count is a pill at the end of the row (R5).

## Four screens to start from

**List and detail.** For things to read and act on: mail, tasks, files. The sidebar says where, the content is the
list, the inspector shows the one selected. The row chosen has the selection tint (R1). Under 1000px the inspector
covers the end of the list and the list stays usable beside it.

**Sidebar and page.** For settings and documents. One column of text no wider than 65 characters, centred. Each
choice is a row with its name at the start and its control at the end; a choice takes effect at once, with no Save
button, unless it can fail. Each section shows its essential choices and keeps the rest under Advanced (R13).

**Board.** For work that moves through stages. Lanes on the quiet fill (`bg-paper-2`), cards raised with the smallest
shadow and no border (R4), a data colour as a dot (R10), today in the accent. The switch between list and board is in
the bar. On a narrow window show one lane at a time, chosen from a `ToggleGroup`.

**Focus.** For one thing at a time. No sidebar and no inspector: the thing, how many are left, the way out, and the
actions with the main one first. It is the screen where the accent has the least to compete with.

## Narrow windows and phones

- Do not design a second app. The same regions give way in order: the inspector becomes a panel, the sidebar a rail
  and then a drawer, the words beside icons go (under 448px of toolbar), the title last.
- What the user needs to act never gives way: the solid action and the window's buttons stay at every width.
- With a finger every control is at least 44px (the toolkit does it); leave the key hints out on a phone.

## What to avoid

- Two toolbars on one screen, or actions both in the toolbar and in an action bar.
- A modal inspector: the user loses the list they were choosing from.
- A sidebar that mixes places and actions. Rows are places; actions are buttons.
- Empty regions kept for symmetry. A frame with three regions is a good frame.
