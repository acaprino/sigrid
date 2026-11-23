# Sigrid for agents

This file is for a coding agent (Claude Code and others) that builds or changes the interface of an app with
`@acaprino/sigrid`. It comes with the package: in an app it is at `node_modules/@acaprino/sigrid/AGENTS.md`, and the
paths below start from that folder. The last section is for work on the toolkit itself.

Sigrid is a React design system, ADHD first: calm neutral surfaces, one accent that says where to look and what to
press, one clear action at a time. It runs in a browser and in a Tauri window, on a computer and on a phone.

## Read before you write

| To know | Read |
|---|---|
| Which component there is, its props and what each is for | `agents/catalog.json` (written from the source: file, what it is, components and their props, the object types those props are made of) |
| A whole app in the frame, to start from | `agents/examples/tasks.tsx`, `agents/examples/mail.tsx` (with `agents/examples/host.ts`, which they import) |
| The rules (R1 to R13), the tokens and what each component looks like | `DESIGN.md` |
| How to lay out a screen: the frame, its regions, four screens to start from | `docs/patterns.md` |
| What changes on a phone, and what does not | `docs/mobile.md` |
| Setup, themes, density, words, icons, the entries of the package | `README.md` |
| How a component is made | `src/`, which comes with the package |

Do not guess a prop or a component name: look it up in the catalogue. If the catalogue has no component for what you
need, say so and build it in the app from the toolkit's parts and tokens; do not copy a component of the toolkit into
the app, and do not add another component library for something the toolkit has.

## How to build a screen

1. Start from `AppShell` and fill only the regions the screen needs (`docs/patterns.md` says what goes where). The
   frame measures its own width and gives way by itself: do not write breakpoints for the sidebar or the inspector.
2. Take every control from the toolkit. Import from `@acaprino/sigrid`; the table, the virtual list, the list put in
   order by hand, the rich text field and the graph canvas have entries of their own (`/table`, `/virtual`,
   `/reorder`, `/rich-text`, `/graph`; the graph also needs `@import "@acaprino/sigrid/graph.css"`).
3. Use the tokens for everything else: `bg-paper`, `bg-raised`, `text-ink`, `text-ink-soft`, `text-ink-mute`,
   `border-line`, `bg-selected`, `bg-accent`, `text-accent`, the radii `rounded-sm|md|lg`, the shadows
   `shadow-xs|sm|md|lg|float`, the sizes `h-(--control-md)`, `min-h-(--row-height)`, `px-(--pad-md)`.
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
- Radii 4, 6 and 10px through the tokens; a 4px spacing grid; text sizes 12, 13, 14, 16, 18, 20 and 24px; weights
  400, 500 and 600; icons 16 or 14px (R7).
- No gradient, no blur or glass, no emoji in the interface, no decorative icon, no animation that loops.
- Motion only after a gesture and only when the app turned it on (`animated`, or `MotionProvider`); everything works
  with it off.
- Every navigation row, section heading and menu entry has an icon from `Icon` (the pack is the user's choice), and
  an empty slot where there is none (R6).
- With a finger every control and row is at least 44px: the toolkit's components do it by themselves; a control
  made in the app uses `pointer-coarse:min-h-11`.
- The words a toolkit component says by itself are English placeholders. An app in another language passes its own
  with `WordsProvider`.
- An action that can be taken back is done at once and offers Undo in a notice (`Toasts`); do not ask to confirm it.

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

## Work on the toolkit itself

In the repository of the toolkit: `npm run design:lint`, `npm run design:check`, `npm run typecheck`,
`npm run showcase:typecheck`, `npm test`, `npm run build`. After a change to a component's props or comments run
`npm run agents`, which writes `agents/` again (a test fails if it is behind); where nothing may be compiled, take `agents/`
from the artifact `agents` that a failed CI run keeps. A component goes in the toolkit only
if it carries no concept of one app. A new source file starts with a comment that says what it is: the catalogue
reads it. A dependency is
pinned to an exact version and listed in `THIRD_PARTY.md`. Work goes to `develop`; a merge of `develop` into `main`
is a release, and the workflow sets the version.
