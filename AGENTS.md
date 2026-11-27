# Sigrid for agents

This file is for a coding agent (Claude Code and others) that builds or changes the interface of an app with
`@acaprino/sigrid`. It comes with the package: in an app it is at `node_modules/@acaprino/sigrid/AGENTS.md`, and the
paths below start from that folder. The last section is for work on the toolkit itself.

Sigrid is a React UI system in four levels, each made of the ones before it: primitives (one control each: a button,
a field, an icon, the layout parts), components (primitives put together for one need: a field with its label, a note,
a message), assemblies (components that do a whole function together: the command palette, a conversation, a table, a
graph) and applications, which are examples to start from (`agents/examples`). Under them is the ground (tokens,
themes, words) and beside them the frame of an app (`AppShell`, its two forms, the patterns) and the wiring of a Tauri
window (`@acaprino/sigrid/tauri`). ADHD first: calm neutral surfaces, one accent that says where to look and what to
press, one clear action at a time, and shared controls that never move (R14). It runs in a browser and in a Tauri
window, on a computer and on a phone.

## One look for every app (the owner's rule)

Every app of the suite that uses Sigrid looks and behaves the same: the same surfaces, shadows, spacing, type, icons
and motion, and the same component for the same need (a file tree is the same component in every app). What differs
from one app to the next is the layout, which follows what the app does, its accent and its icon. An app's icon is its
own mark (the picture of the app, its window and its brand); the icons of its interface are Sigrid's one set (Sigrid Icons,
through `Icon`), the same in every app, and the user does not choose another.

- An app uses only Sigrid's components. It never makes a component of its own that draws: no stylesheet, no class,
  no primitive, no copy or restyling of a part of Sigrid. Its own code composes Sigrid's components into its screens
  and wires them to its data.
- An app adapts to Sigrid, never the other way round. Sigrid changes only when a component or a primitive that a
  function needs is really missing: then it is added to Sigrid, generic, and every app takes it from there.
- The same holds for an icon: an icon a function needs that Sigrid's names lack is added to Sigrid's names
  (`ICON_NAMES`), never drawn or imported by the app.
- Before asking for a new part, look in the catalogue for the one Sigrid already has for the need. A request is
  weighed by the function that is missing, never by how the app looked before: a former look is no reason to change
  Sigrid.
- The shell in Xiox's style (the window and its title bar, the frame, the commands, the look) is Imago's, which is built
  with Sigrid: Shinatama, Daodan, Muro, Mukade and Xiox stand on it and bring only their screens. Sigrid knows no app.
  Ethel and Qamille use Sigrid without Imago and keep its look.

## Read before you write

| To know | Read |
|---|---|
| Which component there is, the entry it is imported from, its props and what each is for | `agents/catalog.json` (written from the source, one list for each entry of the package: file, what it is, components and their props, the object types those props are made of) |
| A whole app in the frame, to start from | `agents/examples/tasks.tsx`, `agents/examples/mail.tsx`, `agents/examples/workspace.tsx` (the sheet frame), `agents/examples/triage.tsx` (a screen that fits), `agents/examples/signup.tsx` (signing in or up, then a path of steps) |
| The rules (R1 to R14), the tokens and what each component looks like | `DESIGN.md` |
| How to lay out a screen: the frame, its regions, four screens to start from | `docs/patterns.md` |
| How to design and review a screen: twenty laws of use, and what is Sigrid's own | `docs/design-laws.md` |
| What changes on a phone, and what does not | `docs/mobile.md` |
| Setup, themes, density, words, icons, the entries of the package | `README.md` |
| How a component is made | `src/`, which comes with the package |

Do not guess a prop or a component name: look it up in the catalogue. If the catalogue has no component for what you
need, say so and stop: the part is added to Sigrid, generic, and is not built in the app (the first section). Do not
copy a component of the toolkit into the app, and do not add another component library for something the toolkit has.

## How to build a screen

1. Start from `AppShell` and fill only the regions the screen needs (`docs/patterns.md` says what goes where). The
   frame measures its own width and gives way by itself: do not write breakpoints for the sidebar or the inspector.
   It has two forms: with lines (the default) or `frame="sheet"` (Xiox's: the work area one sheet on the window's
   ground). Lay a region out inside with `Panel`.
   In a Tauri app, take where it runs, the drag attribute and the window's buttons from `@acaprino/sigrid/tauri`
   (`readHost`, `DRAG_REGION`, `useWindowControls`); it is page side only, and the native skeleton is the
   tauri-app-builder plugin's.
2. Take every control from the toolkit, each from the entry of its level: `@acaprino/sigrid/primitives`,
   `/components`, `/layout` (the frame) and `/assemblies`; the main entry, `@acaprino/sigrid`, holds what does not
   draw (themes, density, words, motion, media queries). The catalogue says which entry exports each name: do not
   guess it. The table, the virtual list, the list put in order by hand, the rich text field, the graph canvas, the
   terminal and the code view are assemblies with entries of their own (`/table`, `/virtual`, `/reorder`, `/rich-text`,
   `/graph`, `/terminal`, `/code`; the graph also needs `@import "@acaprino/sigrid/graph.css"`; the terminal brings
   xterm's stylesheet itself, so an app imports none; a terminal keeps its keys, and the ones the app keeps are `appKeys`).
3. Write no class of your own. The tokens are what the toolkit's parts are made of, and what a part added to the
   toolkit uses: `bg-paper`, `bg-raised`, `text-ink`, `text-ink-soft`, `text-ink-mute`,
   `border-line`, `bg-selected`, `bg-accent`, `text-accent`, the radii `rounded-sm|md|lg`, the shadows
   `shadow-xs|sm|md|lg|float`, the sizes `h-(--control-md)`, `min-h-(--row-height)`, `px-(--pad-md)`. An app lays out
   with `Column`, `Cluster`, `Split`, `Grid`, `Cell`, `Spacer`, `Section`, `ScrollArea`, `Page`, `Text` and `TextList`, and turns the
   rule `own-class` on (below). `Cell` is for the one part that sits differently from the others: it lines up by itself,
   takes the room they leave, or is two columns of a `Grid` (`docs/patterns.md`, «Inside a region»).
4. Run the check (below) and fix what it finds. Then, if the project lets you run the app on this machine, look at
   the screen in a browser, wide and at 390px; if it does not, say that you did not.

## The rules that are broken most often

The whole list is in `DESIGN.md`. These are the ones an agent breaks first.

- One solid primary button on a screen, and a solid red one only to delete. Every other action is `outline` or
  `ghost` (R3).
- The accent is for the primary action, add actions, the current selection, what is on (checkbox, radio, switch,
  slider), the icons of the main views, progress, today, unread and focus. Everything else stays neutral (R2).
- A field or an outline button has a border; a raised surface (card, menu, sheet, toast) has a shadow. Never both on
  one element (R4).
- No colour written by hand, no Tailwind palette class (`bg-red-500`, `text-gray-600`): colours come from the theme
  engine through the tokens. A colour the user gave to a thing (a project, a label) is an 8px dot, never a fill (R10).
- Radii 2, 4 and 6px through the tokens (a theme may choose the rounder `soft` 4/6/10 or `round` 6/10/14); a 4px spacing grid; text sizes 12, 13, 14, 16, 18, 20 and 24px; weights
  400, 500 and 600; icons 16 or 14px (R7).
- No gradient, no blur, no emoji in the interface, no decorative icon, no animation that loops. Glass is only a
  theme's `material: 'glass'` (the window's own material behind the page's ground), never drawn by a part.
- Motion only after a gesture and only when the app turned it on (`animated`, or `MotionProvider`); everything works
  with it off. How it moves is the app's choice, once for the whole page: the curve (`fluent` at first, or
  `ease-in-out`, `ease`, `ease-in`, `ease-out`) and the pace, with `applyMotionFeel` or `MotionProvider`'s `ease` and
  `pace`. No part writes a time or a curve of its own.
- Every navigation row, section heading and menu entry has an icon from `Icon`, by one of Sigrid's names, and an
  empty slot where there is none (R6). The logo of a service, a framework or a library is content, not an icon: it is
  a `Logo` (or the `image` of a `TreeNode` or a `GraphNode`), with one of Sigrid's icons as its fallback, and never
  stands for an action or a kind of thing.
- Sides are logical: `ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `border-s`, never `pl-`, `mr-`,
  `left-`, `text-left`, so a language written from the right mirrors by itself. A physical side only where the side
  is the meaning (`test/logical-sides.test.ts`).
- With a finger every control and row is at least 44px: the toolkit's components do it by themselves; a part added
  to the toolkit does it with `pointer-coarse:min-h-11`.
- The words a toolkit component says by itself are English placeholders. An app in another language passes its own
  with `WordsProvider`.
- Light, dark and the system's look are chosen from the palette, the same in every app: `useSchemeCommands` inside
  `CommandsProvider`, and `applyKeptScheme` in the entry file (`README.md`). No app draws a switch for the scheme.
- An action that can be taken back is done at once and offers Undo in a notice (`Toasts`); do not ask to confirm it.
  One that cannot is asked first with a `ConfirmDialog`, never with a window of the app's own.
- A control that is on every page, or in every state, never changes place: a two-state switch stays where it is in
  both states (a `ToggleGroup`, at the start of its row), the tools of the bar and the bar at the foot stay put, and a
  tool a view lacks keeps its place empty (`ToolbarButton absent`), it is not left out.
- Long text read whole (an article, a wiki or help page, release notes) is a `Prose` in a `Column width="prose"`,
  or a `MarkdownBlocks variant="article"`, with an `OnThisPage` in the inspector (`docs/patterns.md`, «A page of
  reading»). Inside `Prose` the text is bare written elements, the one place they are written. The compact scale of
  rows, notes and messages is not for a page of reading.
- A height is the host's, never a guess: no `100vh`, `h-screen` or `h-dvh` around `AppShell` (it is as tall as what
  is seen, and keeps clear of the notch and the gesture bar by itself); a screen that must fit is `Page fit`, whose
  body gives way, never the document. Nothing is sized with the live `env(safe-area-inset-bottom)`: room at the foot
  is `--safe-area-max-inset-bottom` (`docs/mobile.md`, «Heights and orientation»).

## Check your work

Run it from the folder whose `package.json` has `@acaprino/sigrid` among its dependencies (in a monorepo that is
not always the app's own folder):

```bash
npx --no sigrid-check            # the sources in ./src against DESIGN.md
npx --no sigrid-check app/ui     # another folder
npx --no sigrid-check --json     # for a tool
```

`--no` keeps `npx` from looking for the command on the registry when the package is not installed there. The same
command is `node node_modules/@acaprino/sigrid/bin/sigrid-check.mjs`. It reads files and builds nothing.

It finds values written by hand where a token belongs: a colour as hex, `rgb()` or `oklch()`, a palette class, a
size in square brackets off the scale (`p-[7px]`, `rounded-[20px]`), a gradient, a `backdrop-blur`, an emoji, and in
CSS a font family that is not the system's. Exit code 0 means none was found.

It does not find, so read your own code for them:

- a named class off the toolkit's scale: `rounded-xl` and above, `text-3xl` and above, `font-bold`, `font-serif`,
  `shadow-2xl`, `blur-*`, `animate-*`;
- a number, a colour name or a font in an inline `style`;
- a border and a shadow on the same element; more than one solid button on a screen; the accent where it does not
  belong; a navigation row without an icon;
- anything of the layout, the contrast as drawn and the states: those are looked at in a browser.

A clean check is needed; it is not enough.

A finding that is right as it is (text that looks like a colour, such as an invoice number after a `#`; the one
colour that is the content) is marked on the line above, with its reason, and never by rewording what the user
reads: `// design-check-ignore-next-line color-value: an invoice number, not a colour` (in JSX,
`{/* design-check-ignore-next-line … */}`). An app keeps wider choices (files to leave out, a rule turned off) in a
`sigrid-check.config.json` in the same folder; its `rules` are laid over the toolkit's.

One rule is the app's to turn on: with `{ "rules": { "own-class": "error" } }` in `sigrid-check.config.json` the check
also reports every class written by hand (`className=`, `class=`, a `…ClassName` prop, `classList.add(`,
`setAttribute('class'`) and every stylesheet of the app, for an app that has no interface code of its own. It is off
by default, and every app turns it on: no app has interface code of its own (the first section). A stylesheet the app must keep says so with `/* design-check-ignore own-class: <reason> */`.

## Work on the toolkit itself

In the repository of the toolkit: `npm run design:lint`, `npm run design:check`, `npm run typecheck`,
`npm run showcase:typecheck`, `npm run typecheck:test`, `npm test`, `npm run build`. After a change to a component's props or comments run
`npm run agents`, which writes `agents/` again (a test fails if it is behind); where nothing may be compiled, take `agents/`
from the artifact `agents` that a failed CI run keeps. A part goes in the folder and the entry of its level
(`src/primitives`, `src/components`, `src/layout`, `src/assemblies`), imports from no level after it
(`test/layers.test.ts`), and is added to the table of names the code export reads (`showcase/editor/entries.ts`). A
component goes in the toolkit only
if it carries no concept of one app, and only when a function needs it: never to bring back an app's former look
(the first section). A new source file starts with a comment that says what it is: the catalogue
reads it. A dependency is
pinned to an exact version and listed in `THIRD_PARTY.md`. Work goes to `develop`; a merge of `develop` into `main`
is a release, and the workflow sets the version.
