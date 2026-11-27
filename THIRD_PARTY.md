# Third-party code in `@acaprino/sigrid`

`@acaprino/sigrid` is the design system shared by the owner's apps: theme engine, tokens, primitives and motion. The
behaviour of the components rests on a headless library, the form comes from Park UI's recipes, the motion takes its
durations and curves from Fluent 2's tokens, the motion code and the rest of the look are ours, on top of SmoothUI pieces copied into the package and adapted. An app's product components (in the
app's own package, with its own `THIRD_PARTY.md`) are not listed here.

- **Ark UI** and **Base UI** (`@ark-ui/react`, `@base-ui/react`, npm dependencies) are the base for behaviour: state,
  keyboard, focus, ARIA. Base UI carries the basic controls and the surfaces that open (dialog, sheet, select, popover,
  menu, tooltip, toolbar, checkbox, radio group, toggle group, input, and the re-exported collapsible and field); Ark UI the
  richer parts Base UI does not have (notices, date field and calendar, labels field, upload zone, combobox, slider,
  switch, tabs, avatar). The split is meant to stay (the owner's decision of 2026-11-22: moving the rest onto Ark would
  change the structure of controls that work and are tested, for nothing a user would see). A control moves from one
  to the other only when it is rewritten anyway, or when a defect comes from the two living together.
- **Park UI** for the form (2026-11-19, the owner's choice: Park's native look, not compact): sizes, variants, states,
  corner levels and elevation follow Park's recipes, translated by hand to Tailwind classes. Park itself is Panda CSS
  only and is **not installed**. Colors stay the theme engine's, never Park's palettes.
- **SmoothUI** for the look of some primitives. A file can rest on SmoothUI and Park UI: it then carries both headers
  and is listed in both tables. The motion code is the toolkit's own (`src/internal/motion-impl.tsx`, short tweens, no
  springs): nothing of Unlumen UI is used any more (rewritten on 2026-11-20). A file moved onto Ark keeps its SmoothUI header for as long as its look is still the one adapted from
  SmoothUI; it loses it when nothing of SmoothUI is left in it.

## Ark UI

- Project: Ark UI, https://ark-ui.com (repository https://github.com/chakra-ui/ark), on the Zag.js state machines
- Package: **`@ark-ui/react` 5.39.3**, an npm dependency pinned to the exact version (not copied into the package); the
  same version as the app whose primitives were the model for these
- License: **MIT** (Copyright (c) 2024 Chakra UI)
- With it comes **`@internationalized/date` 3.12.4** (Adobe, **Apache-2.0**), which Ark's date picker is built on and
  the date field imports directly for its values; pinned to the version Ark itself depends on, so only one copy is
  bundled
- Only files under `src/` import `@ark-ui/*`; neither an app's product package nor the app does (each app checks this
  on its side). Ark's parts are styled here with Tailwind classes and the theme tokens, through their
  `data-scope`/`data-part` and state attributes. Nothing of Ark animates by itself: what moves does so only with
  `animated`, through `src/internal/motion-impl.tsx`.

The test `test/provenance.test.ts` checks the pinned versions and that this list and the imports match.

| File | Ark UI component | Import |
|---|---|---|
| `src/components/Toasts.tsx` | `toast` | `@ark-ui/react/toast` |
| `src/primitives/switch.tsx` | `switch` | `@ark-ui/react/switch` |
| `src/primitives/slider.tsx` | `slider` | `@ark-ui/react/slider` |
| `src/primitives/avatar.tsx` | `avatar` | `@ark-ui/react/avatar` |
| `src/components/combobox.tsx` | `combobox` | `@ark-ui/react/combobox` |
| `src/primitives/tabs.tsx` | `tabs` | `@ark-ui/react/tabs` |
| `src/components/calendar.tsx` | `date-picker` | `@ark-ui/react/date-picker` |
| `src/components/DateField.tsx` | `date-picker` | `@ark-ui/react/date-picker` |
| `src/components/ChipsInput.tsx` | `tags-input` | `@ark-ui/react/tags-input` |
| `src/assemblies/Attachments.tsx` | `file-upload` | `@ark-ui/react/file-upload` |
| `src/components/file-drop.tsx` | `file-upload` | `@ark-ui/react/file-upload` |
| `src/assemblies/tree.tsx` | `tree-view` | `@ark-ui/react/tree-view` |
| `src/primitives/button.tsx` | `factory` | `@ark-ui/react/factory` |
| `src/primitives/badge.tsx` | `factory` | `@ark-ui/react/factory` |
| `src/primitives/input.tsx` | `field` | `@ark-ui/react/field` |
| `src/primitives/textarea.tsx` | `field` | `@ark-ui/react/field` |
| `src/components/input-group.tsx` | `field` | `@ark-ui/react/field` |
| `src/primitives/checkbox.tsx` | `checkbox` | `@ark-ui/react/checkbox` |
| `src/primitives/radio-group.tsx` | `radio-group` | `@ark-ui/react/radio-group` |
| `src/primitives/toggle-group.tsx` | `toggle-group` | `@ark-ui/react/toggle-group` |
| `src/components/disclosure.tsx` | `collapsible` | `@ark-ui/react/collapsible` |
| `src/primitives/headless.ts` | `collapsible` | `@ark-ui/react/collapsible` |
| `src/primitives/headless.ts` | `field` | `@ark-ui/react/field` |
| `src/primitives/headless.ts` | `popover` | `@ark-ui/react/popover` |
| `src/internal/portal.tsx` | `portal` | `@ark-ui/react/portal` |
| `src/primitives/tooltip.tsx` | `tooltip` | `@ark-ui/react/tooltip` |
| `src/primitives/popover.tsx` | `popover` | `@ark-ui/react/popover` |
| `src/primitives/dropdown-menu.tsx` | `menu` | `@ark-ui/react/menu` |
| `src/primitives/select.tsx` | `select` | `@ark-ui/react/select` |
| `src/primitives/dialog.tsx` | `dialog` | `@ark-ui/react/dialog` |
| `src/primitives/sheet.tsx` | `drawer` | `@ark-ui/react/drawer` |

Notes:
- `Toasts.tsx`: Ark's toaster store, its `Toaster` region and one toast machine per notice (timer, the phase in which a
  leaving notice stays in the DOM). The list stays the caller's (`items`); the column (at most three, the newest at the
  bottom, the oldest pushed out from the top) is laid out here, because Ark's `max` keeps a new notice waiting instead
  of pushing the oldest out and its layouts follow a list that still holds a notice while it leaves. Its motion is the
  toolkit's list transition (`NOTICES` in `motion-impl`).
- `components/calendar.tsx` and `components/DateField.tsx`: Ark's DatePicker (value, open state, dismissal, position, grid and
  its keyboard, month and year views). The roughly 380 lines of grid and keyboard code written here before are gone.
  Kept on top: a native `<button>` per day, the weekday headers readable by screen readers, Home and End for the week.
- `components/ChipsInput.tsx`: Ark's TagsInput; with `suggestions`, also Ark's Combobox on the same text box, taken from
  `components/combobox.tsx`. Kept on top: Backspace in the empty box removes the last label at once, labels
  are compared ignoring case, a chip is not edited in place.
- `primitives/switch.tsx`: Ark's Switch (a hidden checkbox inside a `<label>`, with the `switch` role given here). The thumb
  slides with a CSS transition, only with `animated`.
- `primitives/slider.tsx`: Ark's Slider with one thumb. Up and Down are sent again as Right and Left.
- `primitives/avatar.tsx`: Ark's Avatar, for the initials shown until the picture loads and again if it fails.
- `components/combobox.tsx`: Ark's Combobox (filtering as the user types, the list, its keyboard). The list is not moved to
  a portal; the options are filtered here unless the caller answers `onQuery`.
- `primitives/tabs.tsx`: Ark's Tabs (tablist, roving focus, automatic or manual activation, panels). Ark's own indicator
  part is not used: with `animated` the tint is the toolkit's `Highlight`.
- `assemblies/Attachments.tsx`: Ark's FileUpload for the picker (trigger and hidden input) and for the size limit. The
  drop stays `useDropTarget`: Ark's dropzone takes files only, and here a dropped link is an attachment too.
- `assemblies/tree.tsx`: Ark's TreeView and its tree collection (the keys, the first letters typed, one choice, the open
  branches). Kept on top: the loads of a branch's children (not Ark's `loadChildren`, which keeps a branch «loaded» for
  ever and asks again on a second Enter), dropped when the app gives another node; the filter, which opens what leads to
  a find and gives back what the person had opened; the failure of a load said in the row; the rows named by their name
  alone; the branch's control made its `treeitem`, and its rows drawn only while it is open (not Ark's `Branch` and
  `BranchContent`).

## Park UI

- Project: Park UI, https://park-ui.com (repository https://github.com/chakra-ui/park-ui), the styled layer over Ark UI
- Copy read: commit **`102769cc91a9d36753dbc5893c74b7954b495efe`** (2026-02-21) of the repository; recipes in
  `packages/preset/src/recipes/*.ts`, tokens in `packages/preset/src/theme/` (shadows, text styles, radii)
- License: **MIT** (Copyright (c) 2025 cschroeter, full text below)
- **Recipes translated to Tailwind, not installed**: no `@park-ui/*` or `@pandacss/*` package is a dependency; nothing
  of Park's code is copied, only the values of its recipes, written as Tailwind classes on our tokens

What is taken: Park's `md` size as the default (controls 40px, text 14px/20px, labels 14px medium; `sm` 36px and `xs`
32px only inside dense rows), its nested corners l1/l2/l3 = 2/4/6px, as Park ships them and the default here since 2026-11-24 (`--radius-sm/md/lg` in `src/theme-engine.ts`; `soft` 4/6/10px, a step rounder, and `round` 6/10/14px are a theme's choice),
its button and badge variants under our names (solid → `default`, subtle in the neutral gray → `secondary` and
`QUIET_CHIP`, outline, plain → `ghost`; neutral, never the accent, by the owner's rules of 2026-11-20 in
`DESIGN.md`), its `kbd` plain variant, and its layered shadows (xs/sm/md/lg/xl, a drop and a 1px ring) as the
`--elevation-*` variables the engine writes, from its own `drop` color, in place of borders. What is not taken: Park's
colors (the theme engine stays), its input border (Park's gray step 7 is lighter than 3:1: ours stays the `input`
token, WCAG 1.4.11), its 16px text in selects (14px here), its animations (the motion is the toolkit's own, only with `animated`), the spinner of
its loading button (a loop: `loading` keeps the size and may show the caller's `loadingText` instead).

Each file carries the comment `// Park UI (MIT) <recipe> 102769c — recipe translated to Tailwind for @acaprino/sigrid (<URL>)`.
The test `test/provenance.test.ts` checks that the list and the headers match.

| File | Park UI recipe | Source |
|---|---|---|
| `src/primitives/button.tsx` | `button` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/button.ts |
| `src/primitives/badge.tsx` | `badge` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/badge.ts |
| `src/primitives/checkbox.tsx` | `checkbox` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/checkbox.ts |
| `src/primitives/input.tsx` | `input` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/input.ts |
| `src/primitives/textarea.tsx` | `textarea` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/textarea.ts |
| `src/primitives/kbd.tsx` | `kbd` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/kbd.ts |
| `src/primitives/select.tsx` | `select` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/select.ts |
| `src/primitives/toggle-group.tsx` | `segment-group` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/segment-group.ts |
| `src/primitives/dropdown-menu.tsx` | `menu` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/menu.ts |
| `src/primitives/popover.tsx` | `popover` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/popover.ts |
| `src/primitives/dialog.tsx` | `dialog` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/dialog.ts |
| `src/primitives/sheet.tsx` | `drawer` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/drawer.ts |
| `src/primitives/tooltip.tsx` | `tooltip` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tooltip.ts |
| `src/primitives/switch.tsx` | `switch` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/switch.ts |
| `src/primitives/slider.tsx` | `slider` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/slider.ts |
| `src/primitives/avatar.tsx` | `avatar` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/avatar.ts |
| `src/components/combobox.tsx` | `combobox` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/combobox.ts |
| `src/primitives/tabs.tsx` | `tabs` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tabs.ts |
| `src/components/form-field.tsx` | `field` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/field.ts |
| `src/components/calendar.tsx` | `date-picker` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/date-picker.ts |
| `src/components/Toasts.tsx` | `toast` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/toast.ts |
| `src/components/DateField.tsx` | `input` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/input.ts |
| `src/components/ChipsInput.tsx` | `tags-input` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tags-input.ts |
| `src/assemblies/Attachments.tsx` | `file-upload` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/file-upload.ts |
| `src/components/file-drop.tsx` | `file-upload` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/file-upload.ts |
| `src/assemblies/tree.tsx` | `tree-view` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tree-view.ts |
| `src/components/note.tsx` | `alert` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/alert.ts |

Also following Park, without a recipe of their own: the shape and elevation in `src/theme-engine.ts` (its `radii` and
`shadows` tokens) and `src/styles/theme.css` (its type scale and text styles; the tokens of the light navigation column
with the accent-tint selection of the approved preview).

Notes:
- `Toasts.tsx` keeps SmoothUI's dark card (the inverted ink surface of the approved preview); Park's toast is a light
  surface card, so of it only the form is taken (l3, lg elevation, padding, the semibold action, outline keys).
- `components/calendar.tsx`, `components/ChipsInput.tsx`, `assemblies/Attachments.tsx` have nothing of SmoothUI left: their look is
  Park's (date-picker, tags-input, file-upload), their behaviour Ark UI's. They left the SmoothUI table.
- Park's checkbox is square with l1 corners, and that is the toolkit's checkbox. An app can round its own, through
  `--radius-check`.

### Park UI license

```text
MIT License

Copyright (c) 2025 cschroeter

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fluent 2 (Microsoft)

- Project: Fluent UI, https://github.com/microsoft/fluentui (design language: Fluent 2, https://fluent2.microsoft.design)
- Package read: `@fluentui/tokens`, **not installed**: the values are written in the toolkit, the package is not a
  dependency
- Commit read: `a568b4db7806f8642ab4ad296d2c80ad512de8a8`
- Files read: `packages/tokens/src/global/durations.ts` and `packages/tokens/src/global/curves.ts`
- License: **MIT** (full text below)

What is taken: the **values** of the motion tokens the toolkit uses, and nothing else. No code of Fluent is copied
or adapted, no component, no style, no animation. They are the constants `FLUENT_DURATIONS` and `FLUENT_CURVES` in
`src/internal/motion-impl.tsx`, with Fluent's names; `test/provenance.test.ts` keeps them equal to Fluent's.

- Durations: `durationFaster` 100ms, `durationFast` 150ms, `durationNormal` 200ms. Fluent's longer ones (250 to
  500 ms) are left out: every duration of the toolkit stays under 250 ms. `durationUltraFast` (50ms) has no use here.
- Curves: `curveDecelerateMid` cubic-bezier(0,0,0,1), `curveAccelerateMin` cubic-bezier(0.8,0,0.78,1),
  `curveEasyEase` cubic-bezier(0.33,0,0.67,1).

Which token each movement uses is the toolkit's own choice, by the kind of movement the tokens are named for: what
enters decelerates, what leaves accelerates, what moves in place eases at both ends. The rules of the toolkit stay:
only with `animated`, never with `prefers-reduced-motion`, only after a gesture, no springs, nothing that loops.

The note at the end of Fluent UI's licence is about the fonts and icons referenced in Fluent UI React, not its
tokens.
No font of Fluent is used anywhere in the toolkit, and no icon comes with these token values.

### Fluent UI license

```
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE

NOTE: Usage of the fonts and icons referenced in Fluent UI React is subject to the terms listed at https://aka.ms/fluentui-assets-license
```


## Icons

Sigrid has one icon set, the same in every app (the owner, 2026-11-23): Sigrid Icons, its own
(`src/internal/sigrid-icons.tsx`; `src/icons.tsx` names each meaning's drawing). No package of icons is a dependency.
The set is made of two kinds of drawing (the owner, 2026-11-24):

- Drawings of MynaUI Icons (`@mynaui/icons` 0.4.12, https://github.com/praveenjuge/mynaui-icons): the paths of the
  icons the toolkit uses are copied into that file as they are, each under MynaUI's own name. MynaUI draws them with a
  stroke of 1.5; Sigrid strokes them with the theme's. **MIT**, not installed:

```
MIT License

Copyright (c) Praveen Juge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- Seventeen drawings of Sigrid's own, for the meanings MynaUI has no drawing for (`FolderMove`, `FilterX`, `TextQuote`,
  `History`, `ReplyAll`, `Tags`, `CalendarClock`, `Bot`, `Shapes`, `FolderOpen`, `UserPen`, `Tree`, `Graph`, `Router`,
  `Devices`, `Split`, `Sliders`). Five of them start from a path of MynaUI (`FolderMove` and `FolderOpen` from its folder, `FilterX` from
  its funnel, `History` from its undo, `ReplyAll` from its corner arrow); the rest are drawn from nothing.

Lucide (`lucide-react`, ISC), the set until 2026-11-24, left with its dependency.

The other packs (Fluent Color, which was an npm dependency, and Phosphor Duotone, Solar Duotone, Fluent Emoji Flat and
Twemoji, whose drawings were in the package) left on 2026-11-23, with their dependency and their drawings.

## TanStack Table, TanStack Virtual, dnd-kit, TipTap, React Flow, xterm and CodeMirror

More libraries carry behaviour, each under one part and each in its own entry of the package, so an app loads a
library only if it uses the part (the owner's decision of 2026-11-23: a table, a long list, a list put in order and
formatted text are what the apps of the suite need next, and none is worth writing again; and of 2026-11-25, for
Shinatama's migration: a terminal and a code view). They are npm dependencies
pinned to the exact version, installed and unmodified, never copied into `src/`. As with Ark UI, the form is the
toolkit's: its tokens, its `Table` parts, its `Toolbar` and its icons.

- **TanStack Table**: `@tanstack/react-table` 9.3.1 (**MIT**, Copyright (c) 2016 Tanner Linsley), with
  `@tanstack/table-core` and `@tanstack/react-store` that it depends on. The columns and the sorting of `DataTable`.
- **TanStack Virtual**: `@tanstack/react-virtual` 3.14.26 (**MIT**, Copyright (c) 2021-present Tanner Linsley), with
  `@tanstack/virtual-core`. Which rows are in the page, for `DataTable` with `virtual` and for `VirtualList`.
- **dnd-kit**: `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0 and `@dnd-kit/utilities` 3.2.2 (**MIT**, Copyright (c)
  2021, Claudéric Demers), with `@dnd-kit/accessibility`. The dragging and the keyboard of `ReorderList`. The words
  screen readers hear are the app's (`words.reorder`), not the library's.
- **TipTap**: `@tiptap/react`, `@tiptap/starter-kit` and `@tiptap/pm` 3.33.0 (**MIT**, Copyright (c) 2025, Tiptap GmbH),
  with `@tiptap/core`, the extensions of the starter kit and the ProseMirror packages (**MIT**, Marijn Haverbeke) under
  them. The editing of `RichTextField`. The three packages are pinned to one version, which TipTap asks for.

- **React Flow**: `@xyflow/react` 13.0.2 (**MIT**, Copyright (c) 2019-2025 webkid GmbH), with `@xyflow/system`,
  `zustand` and `classcat` that it depends on. The canvas of `GraphCanvas`: pan and zoom, the lines, the joining of
  two things by hand, the small map. Its `base.css` (layout only, no look) is inside the package's `graph.css`. Its
  name stays in sight at the foot of the canvas, as its makers ask of whoever does not subscribe to React Flow Pro.
- **dagre**: `@dagrejs/dagre` 3.1.3 (**MIT**, Copyright (c) 2012-2014 Chris Pettitt), with `@dagrejs/graphlib`. The
  places of the things of `GraphCanvas`, by ranks.
- **xterm.js**: `@xterm/xterm` 6.0.0 and `@xterm/addon-fit` 0.11.0 (**MIT**, Copyright (c) 2017-2019, The xterm.js
  authors; 2014-2016, SourceLair Private Company; 2012-2013, Christopher Jeffrey). The emulation of `Terminal`, and the
  fit of its rows and columns to its box. No other addon is used (a search and the links are the toolkit's own). xterm's
  own stylesheet (`css/xterm.css`) is carried inside `./terminal` as text and put in the page by the part, so an app
  imports no CSS for it; the colours xterm cannot take as `var()` are read from the tokens.
- **CodeMirror 6**: `@codemirror/view` 6.43.15, `@codemirror/state` 6.7.6, `@codemirror/language` 6.13.1,
  `@codemirror/commands` 6.11.1, `@codemirror/search` 6.7.2, and the languages `@codemirror/lang-css` 6.3.1,
  `@codemirror/lang-html` 6.4.12, `@codemirror/lang-javascript` 6.2.5, `@codemirror/lang-json` 6.0.2,
  `@codemirror/lang-markdown` 6.5.2, `@codemirror/lang-python` 6.2.1 and `@codemirror/lang-rust` 6.0.2, with
  `@lezer/highlight` 1.2.5 (**MIT**, Copyright (C) 2018-2021 by Marijn Haverbeke and others), and under them
  `@codemirror/autocomplete`, `@codemirror/lint`, `@codemirror/streamparser`, the Lezer parsers (`@lezer/common`,
  `@lezer/lr`, `@lezer/css`, `@lezer/html`, `@lezer/javascript`, `@lezer/json`, `@lezer/markdown`, `@lezer/python`,
  `@lezer/rust`), `@marijn/find-cluster-break`, `crelt` and `style-mod` (all **MIT**). The editing, the highlighting and the
  search of `CodeView`. The packages are the versions Shinatama pinned. Each language is its own chunk, loaded when a file of
  it is shown. The theme is the toolkit's: made from the tokens.
- **Recharts**: `recharts` 3.11.2 (**MIT**, Copyright (c) 2015-present Recharts Group), with `@reduxjs/toolkit`,
  `react-redux`, `reselect`, `immer`, `es-toolkit`, `decimal.js-light`, `eventemitter3`, `tiny-invariant` (all **MIT**)
  and `victory-vendor` (**MIT AND ISC AND BSD-3-Clause**) that it depends on. The plotting engine behind `LineChart`,
  `BarChart`, `PieChart` and `RadialGauge` in `./chart`, styled with the toolkit's tokens, `hueScale`, non-animated
  rendering, raised tooltips and R10 dot legends.

The test `test/provenance.test.ts` checks the pinned versions, that this list and the imports match, and that the main
entry of the package imports none of them. (The seven languages of CodeMirror are reached with `import()` in
`code-languages.ts`, so they are not rows of the table: they are in the list above and pinned in `package.json`.)

| File | Library | Entry of the package |
|---|---|---|
| `src/assemblies/DataTable.tsx` | `@tanstack/react-table`, `@tanstack/react-virtual` | `./table` |
| `src/assemblies/virtual-list.tsx` | `@tanstack/react-virtual` | `./virtual` |
| `src/assemblies/reorder-list.tsx` | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | `./reorder` |
| `src/assemblies/RichTextField.tsx` | `@tiptap/react`, `@tiptap/starter-kit` | `./rich-text` |
| `src/assemblies/GraphCanvas.tsx` | `@dagrejs/dagre`, `@xyflow/react` | `./graph` |
| `src/assemblies/Terminal.tsx` | `@xterm/addon-fit`, `@xterm/xterm` | `./terminal` |
| `src/assemblies/terminal-theme.ts` | `@xterm/xterm` | `./terminal` |
| `src/assemblies/CodeView.tsx` | `@codemirror/commands`, `@codemirror/language`, `@codemirror/search`, `@codemirror/state`, `@codemirror/view` | `./code` |
| `src/assemblies/code-theme.ts` | `@codemirror/language`, `@codemirror/state`, `@codemirror/view`, `@lezer/highlight` | `./code` |
| `src/assemblies/code-languages.ts` | `@codemirror/state` | `./code` |
| `src/assemblies/Chart.tsx` | `recharts` | `./chart` |

## Tauri's API

The `./tauri` entry wires the toolkit's window parts to a Tauri window, from the page's side. Its source is `tauri/`,
outside `src/`: the toolkit itself knows no shell (`test/no-shell.test.ts`).

- **Tauri**: `@tauri-apps/api` 2.12.5 (**Apache-2.0 OR MIT**, Copyright (c) 2017 - Present Tauri Apps Contributors,
  https://github.com/tauri-apps/tauri). Not a dependency: an optional peer (`^2.0.0`), which an app installs only if
  it imports `@acaprino/sigrid/tauri`, and a development dependency pinned to the exact version, for the types and the
  tests. Installed and unmodified, never copied. `tauri/api.ts` imports it only inside its functions, with `import()`,
  and the build keeps it out of the bundle: a page in a browser that imports the entry loads none of it.
- The ways of the window's buttons, of the zoom and of Snap Layouts are those of Imago's windows (the owner's own
  app), written again for the entry.

## SmoothUI

- Project: SmoothUI, https://smoothui.dev (repository https://github.com/educlopez/smoothui)
- Release: **4.0.0** (`base-nova` registry, Base UI primitives)
- License: **MIT** (full text below)
- Decision: ADR-0009 v3 (Accepted, 2026-11-08)

The files below are copied from the SmoothUI registry and **adapted** for `@acaprino/sigrid`: same public API as before,
tokens from `src/styles/theme.css`, animations off by default (the `animated` prop, never with `prefers-reduced-motion`),
no springs, loops or decorative effects. Since the Park restyle (2026-11-19) their form (sizes, variants, corners,
elevation) is Park UI's (see above): what stays from SmoothUI is the structure, the `data-slot`s and the API. `Toasts.tsx`
keeps only the look of SmoothUI's surface and rests on Ark UI for what it does; `components/calendar.tsx`, `components/ChipsInput.tsx`
and `assemblies/Attachments.tsx` have nothing of SmoothUI left and are no longer listed here. Each file carries the comment `// SmoothUI (MIT) <slug> 4.0.0 — adapted
for @acaprino/sigrid (<URL>)`. The test `test/provenance.test.ts` checks that the list and the headers match.

| File | Slug SmoothUI | Source |
|---|---|---|
| `src/components/Toasts.tsx` | `toast` | https://smoothui.dev/r/base-nova/toast.json |
| `src/components/empty.tsx` | `empty` | https://smoothui.dev/r/base-nova/empty.json |

Notes:
- `primitives/kbd.tsx` no longer rests on SmoothUI: its form is Park UI's `kbd`, the rest is the toolkit's own.
- `Toasts.tsx` keeps from `toast` only the surface of a notice (the dark card: text, action and close button on one
  row, the quick choices on a second); its form is Park's `toast`. Its primitive is Ark UI's Toast and its motion is the toolkit's list transition: the
  SmoothUI enter/exit values are gone.
- `components/calendar.tsx` and `components/DateField.tsx` no longer have anything of SmoothUI: the grid is Ark UI's
  DatePicker, the look Park's `date-picker`, and they left the table.
- `primitives/select.tsx` keeps SmoothUI's data API and shape, but in place of its hand-made list it uses Base UI's `Select`
  primitive (keyboard, ARIA and a portal nested in the sheet).
- `primitives/radio-group.tsx` adds Home/End and the `swatch` variant (color pills); all of Motion is removed.
- `primitives/toggle-group.tsx` is single-choice only and uses Base UI's `Toggle` directly (SmoothUI's `toggle` slug
  is not copied); it serves a segmented switch (a choice between a few views, for example).
- `components/ChipsInput.tsx` (Ark's TagsInput, Park's `tags-input`) and `assemblies/Attachments.tsx` (Ark's FileUpload, Park's
  `file-upload`) no longer have anything of SmoothUI and left the table.
- `components/empty.tsx`, `primitives/tooltip.tsx`: SmoothUI's structure and `data-slot`, paper/ink tokens; the
  hint repeats the button's accessible name and is `aria-hidden`.

### SmoothUI license

```text
MIT License

Copyright (c) 2024 Eduardo Calvo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Motion, colour and class helpers

Five more npm dependencies, pinned to the exact version, installed and unmodified, never copied into `src/`. Each
licence is the one in the package's own folder in `node_modules`.

- **Motion**: `motion` 14.6.0 (**MIT**, Copyright (c) 2024 Motion B.V., https://github.com/motiondivision/motion),
  with `framer-motion`, `motion-dom` and `motion-utils` 14.6.0 (**MIT**, Copyright (c) 2018 Framer B.V.) that it
  depends on. Only `src/internal/motion-impl.tsx` imports it, and the build keeps it in a chunk of its own, loaded only
  when an app turns motion on (`animated` or `MotionProvider`).
- **Material Color Utilities**: `@material/material-color-utilities` 0.4.0 (**Apache-2.0**, Google,
  https://github.com/material-foundation/material-color-utilities). The tonal palette (HCT) that `src/palette.ts`
  builds from an accent.
- **class-variance-authority**: `class-variance-authority` 0.7.1 (**Apache-2.0**, Joe Bell,
  https://github.com/joe-bell/cva). The variants and sizes of `primitives/button.tsx` and `primitives/badge.tsx`.
- **clsx**: `clsx` 2.1.1 (**MIT**, Copyright (c) Luke Edwards, https://github.com/lukeed/clsx), and **tailwind-merge**:
  `tailwind-merge` 3.7.0 (**MIT**, Copyright (c) 2021 Dany Castillo, https://github.com/dcastil/tailwind-merge). Joined
  in `cn` (`src/lib/utils.ts`), which every part uses to put its classes together.

## Fonts

The woff2 files under `src/styles/fonts/` come with the package, unmodified (`src/styles/fonts.css` loads them). The
copyright and the licence below are the ones written in the files' own name table.

- **IBM Plex Sans** 3.201 (**SIL Open Font License 1.1**, Copyright 2019 IBM Corp.): the
  Latin and extended Latin files of `@fontsource/ibm-plex-sans` 5.2, weights 400, 500 and 600
  (`ibm-plex-sans-latin-*.woff2`, `ibm-plex-sans-latin-ext-*.woff2`). The default font of the interface.
- **Inter** 4.001 (**SIL Open Font License 1.1**, Copyright 2016 The Inter Project Authors, https://github.com/rsms/inter):
  `inter-0.woff2` to `inter-6.woff2`, at the same three weights. The fallback in every stack, for the glyphs outside
  Latin.

## charles-design-laws

- Project: `charles-design-laws`, a skill of https://github.com/LemonFace0309/charles-skills
  (`skills/drops/charles-design-laws`)
- Copy read: commit **`37692481effc68b1f66597e23d88900a35495970`** of the repository (read on 2026-11-24)
- License: **MIT** (Copyright (c) 2026 Charles Liu, full text below)
- **Adapted, not installed or copied**: `docs/design-laws.md` follows the skill's procedure (eight steps, twenty laws
  in its order, the form of a written review) and says, for each law, what the toolkit does and what the app does;
  where the toolkit chooses otherwise it says so. The skill's own text is not in the package. The laws are Jon
  Yablonski's Laws of UX (https://lawsofux.com), with progressive disclosure, recognition over recall and the default
  effect, as the skill credits them.

```text
MIT License

Copyright (c) 2026 Charles Liu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## zero-slop-design

`tools/zero-slop-design/` is the tool that lints `DESIGN.md` and checks sources against it (`npm run design:lint`,
`npm run design:check`). It comes with the package since `sigrid-check` runs it in an app. Its licence and the
notices of what it bundles are in that folder: `LICENSE` and `THIRD_PARTY_NOTICES.md`.
