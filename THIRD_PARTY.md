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
| `src/components/ui/switch.tsx` | `switch` | `@ark-ui/react/switch` |
| `src/components/ui/slider.tsx` | `slider` | `@ark-ui/react/slider` |
| `src/components/ui/avatar.tsx` | `avatar` | `@ark-ui/react/avatar` |
| `src/components/ui/combobox.tsx` | `combobox` | `@ark-ui/react/combobox` |
| `src/components/ui/tabs.tsx` | `tabs` | `@ark-ui/react/tabs` |
| `src/components/ui/calendar.tsx` | `date-picker` | `@ark-ui/react/date-picker` |
| `src/internal/date-field.tsx` | `date-picker` | `@ark-ui/react/date-picker` |
| `src/internal/chips.tsx` | `tags-input` | `@ark-ui/react/tags-input` |
| `src/internal/attachments.tsx` | `file-upload` | `@ark-ui/react/file-upload` |
| `src/internal/file-drop.tsx` | `file-upload` | `@ark-ui/react/file-upload` |

Notes:
- `Toasts.tsx`: Ark's toaster store, its `Toaster` region and one toast machine per notice (timer, the phase in which a
  leaving notice stays in the DOM). The list stays the caller's (`items`); the column (at most three, the newest at the
  bottom, the oldest pushed out from the top) is laid out here, because Ark's `max` keeps a new notice waiting instead
  of pushing the oldest out and its layouts follow a list that still holds a notice while it leaves. Its motion is the
  toolkit's list transition (`NOTICES` in `motion-impl`).
- `ui/calendar.tsx` and `internal/date-field.tsx`: Ark's DatePicker (value, open state, dismissal, position, grid and
  its keyboard, month and year views). The roughly 380 lines of grid and keyboard code written here before are gone.
  Kept on top: a native `<button>` per day, the weekday headers readable by screen readers, Home and End for the week.
- `internal/chips.tsx`: Ark's TagsInput; with `suggestions`, also Ark's Combobox on the same text box, taken from
  `ui/combobox.tsx`. Kept on top: Backspace in the empty box removes the last label at once, labels
  are compared ignoring case, a chip is not edited in place.
- `ui/switch.tsx`: Ark's Switch (a hidden checkbox inside a `<label>`, with the `switch` role given here). The thumb
  slides with a CSS transition, only with `animated`.
- `ui/slider.tsx`: Ark's Slider with one thumb. Up and Down are sent again as Right and Left.
- `ui/avatar.tsx`: Ark's Avatar, for the initials shown until the picture loads and again if it fails.
- `ui/combobox.tsx`: Ark's Combobox (filtering as the user types, the list, its keyboard). The list is not moved to
  a portal; the options are filtered here unless the caller answers `onQuery`.
- `ui/tabs.tsx`: Ark's Tabs (tablist, roving focus, automatic or manual activation, panels). Ark's own indicator
  part is not used: with `animated` the tint is the toolkit's `Highlight`.
- `internal/attachments.tsx`: Ark's FileUpload for the picker (trigger and hidden input) and for the size limit. The
  drop stays `useDropTarget`: Ark's dropzone takes files only, and here a dropped link is an attachment too.

## Park UI

- Project: Park UI, https://park-ui.com (repository https://github.com/chakra-ui/park-ui), the styled layer over Ark UI
- Copy read: commit **`102769cc91a9d36753dbc5893c74b7954b495efe`** (2026-02-21) of the repository; recipes in
  `packages/preset/src/recipes/*.ts`, tokens in `packages/preset/src/theme/` (shadows, text styles, radii)
- License: **MIT** (Copyright (c) 2025 cschroeter, full text below)
- **Recipes translated to Tailwind, not installed**: no `@park-ui/*` or `@pandacss/*` package is a dependency; nothing
  of Park's code is copied, only the values of its recipes, written as Tailwind classes on our tokens

What is taken: Park's `md` size as the default (controls 40px, text 14px/20px, labels 14px medium; `sm` 36px and `xs`
32px only inside dense rows), its nested corners l1/l2/l3 = 4/6/10px (Park ships 2/4/6px: each level is a step rounder here) (`--radius-sm/md/lg` in `src/theme-engine.ts`),
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
| `src/components/ui/button.tsx` | `button` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/button.ts |
| `src/components/ui/badge.tsx` | `badge` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/badge.ts |
| `src/components/ui/checkbox.tsx` | `checkbox` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/checkbox.ts |
| `src/components/ui/input.tsx` | `input` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/input.ts |
| `src/components/ui/textarea.tsx` | `textarea` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/textarea.ts |
| `src/components/ui/kbd.tsx` | `kbd` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/kbd.ts |
| `src/components/ui/select.tsx` | `select` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/select.ts |
| `src/components/ui/toggle-group.tsx` | `segment-group` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/segment-group.ts |
| `src/components/ui/dropdown-menu.tsx` | `menu` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/menu.ts |
| `src/components/ui/popover.tsx` | `popover` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/popover.ts |
| `src/components/ui/dialog.tsx` | `dialog` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/dialog.ts |
| `src/components/ui/sheet.tsx` | `drawer` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/drawer.ts |
| `src/components/ui/tooltip.tsx` | `tooltip` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tooltip.ts |
| `src/components/ui/switch.tsx` | `switch` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/switch.ts |
| `src/components/ui/slider.tsx` | `slider` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/slider.ts |
| `src/components/ui/avatar.tsx` | `avatar` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/avatar.ts |
| `src/components/ui/combobox.tsx` | `combobox` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/combobox.ts |
| `src/components/ui/tabs.tsx` | `tabs` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tabs.ts |
| `src/components/ui/form-field.tsx` | `field` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/field.ts |
| `src/components/ui/calendar.tsx` | `date-picker` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/date-picker.ts |
| `src/components/Toasts.tsx` | `toast` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/toast.ts |
| `src/internal/date-field.tsx` | `input` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/input.ts |
| `src/internal/chips.tsx` | `tags-input` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tags-input.ts |
| `src/internal/attachments.tsx` | `file-upload` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/file-upload.ts |
| `src/internal/file-drop.tsx` | `file-upload` | https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/file-upload.ts |

Also following Park, without a recipe of their own: the shape and elevation in `src/theme-engine.ts` (its `radii` and
`shadows` tokens) and `src/styles/theme.css` (its type scale and text styles; the tokens of the light navigation column
with the accent-tint selection of the approved preview).

Notes:
- `Toasts.tsx` keeps SmoothUI's dark card (the inverted ink surface of the approved preview); Park's toast is a light
  surface card, so of it only the form is taken (l3, lg elevation, padding, the semibold action, outline keys).
- `ui/calendar.tsx`, `internal/chips.tsx`, `internal/attachments.tsx` have nothing of SmoothUI left: their look is
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


## Icon packs

Two npm dependencies, installed and unmodified, never copied into `src/` (`src/icons.tsx` picks between them):

- `lucide-react` (ISC, Lucide contributors): the default pack.
- `@fluentui/react-icons` (MIT, "Copyright (c) 2020 Microsoft Corporation", repository
  https://github.com/microsoft/fluentui-system-icons): the optional `fluent` pack. Its repository's licence is plain
  MIT, without the fonts-and-icons note of the Fluent UI repository.

Four packs are not dependencies: their drawings, one per meaning and unmodified, are in `src/icon-packs.generated.ts`,
written by `scripts/icon-packs.mjs` from the Iconify API (https://iconify.design):

- Phosphor Icons, duotone weight (MIT, "Copyright (c) 2023 Phosphor Icons", https://github.com/phosphor-icons/core):
  the `duotone` pack.
- Solar Icons, bold duotone style (CC BY 4.0, by 480 Design, https://www.figma.com/community/file/1166831539721848736):
  the `solar` pack. Attribution: "Solar Icons by 480 Design".
- Fluent Emoji, flat style (MIT, "Copyright (c) Microsoft Corporation", https://github.com/microsoft/fluentui-emoji):
  the `emoji` pack.
- Twemoji (graphics CC BY 4.0, "Copyright 2019 Twitter, Inc and other contributors",
  https://github.com/twitter/twemoji): the `twemoji` pack. Attribution: "Twemoji by Twitter, Inc and other
  contributors".

## SmoothUI

- Project: SmoothUI, https://smoothui.dev (repository https://github.com/educlopez/smoothui)
- Release: **4.0.0** (`base-nova` registry, Base UI primitives)
- License: **MIT** (full text below)
- Decision: ADR-0009 v3 (Accepted, 2026-11-08)

The files below are copied from the SmoothUI registry and **adapted** for `@acaprino/sigrid`: same public API as before,
tokens from `src/styles/theme.css`, animations off by default (the `animated` prop, never with `prefers-reduced-motion`),
no springs, loops or decorative effects. Since the Park restyle (2026-11-19) their form (sizes, variants, corners,
elevation) is Park UI's (see above): what stays from SmoothUI is the structure, the `data-slot`s and the API. `Toasts.tsx`
keeps only the look of SmoothUI's surface and rests on Ark UI for what it does; `ui/calendar.tsx`, `internal/chips.tsx`
and `internal/attachments.tsx` have nothing of SmoothUI left and are no longer listed here. Each file carries the comment `// SmoothUI (MIT) <slug> 4.0.0 — adapted
for @acaprino/sigrid (<URL>)`. The test `test/provenance.test.ts` checks that the list and the headers match.

| File | Slug SmoothUI | Source |
|---|---|---|
| `src/components/ui/button.tsx` | `smooth-button` | https://smoothui.dev/r/base-nova/smooth-button.json |
| `src/components/ui/badge.tsx` | `badge` | https://smoothui.dev/r/base-nova/badge.json |
| `src/components/ui/checkbox.tsx` | `checkbox` | https://smoothui.dev/r/base-nova/checkbox.json |
| `src/components/ui/input.tsx` | `input` | https://smoothui.dev/r/base-nova/input.json |
| `src/components/ui/textarea.tsx` | `textarea` | https://smoothui.dev/r/base-nova/textarea.json |
| `src/components/ui/dialog.tsx` | `dialog` | https://smoothui.dev/r/base-nova/dialog.json |
| `src/components/Dialog.tsx` | `dialog` | https://smoothui.dev/r/base-nova/dialog.json |
| `src/components/ui/sheet.tsx` | `drawer` | https://smoothui.dev/r/base-nova/drawer.json |
| `src/components/ui/dropdown-menu.tsx` | `dropdown-menu` | https://smoothui.dev/r/base-nova/dropdown-menu.json |
| `src/components/ui/popover.tsx` | `popover` | https://smoothui.dev/r/base-nova/popover.json |
| `src/components/Toasts.tsx` | `toast` | https://smoothui.dev/r/base-nova/toast.json |
| `src/components/ui/select.tsx` | `select` | https://smoothui.dev/r/base-nova/select.json |
| `src/components/ui/radio-group.tsx` | `radio-group` | https://smoothui.dev/r/base-nova/radio-group.json |
| `src/components/ui/tooltip.tsx` | `tooltip` | https://smoothui.dev/r/base-nova/tooltip.json |
| `src/components/ui/empty.tsx` | `empty` | https://smoothui.dev/r/base-nova/empty.json |
| `src/components/ui/toggle-group.tsx` | `toggle-group` | https://smoothui.dev/r/base-nova/toggle-group.json |

Notes:
- `ui/kbd.tsx` no longer rests on SmoothUI: its form is Park UI's `kbd`, the rest is the toolkit's own.
- `Toasts.tsx` keeps from `toast` only the surface of a notice (the dark card: text, action and close button on one
  row, the quick choices on a second); its form is Park's `toast`. Its primitive is Ark UI's Toast and its motion is the toolkit's list transition: the
  SmoothUI enter/exit values are gone.
- `ui/calendar.tsx` and `internal/date-field.tsx` no longer have anything of SmoothUI: the grid is Ark UI's
  DatePicker, the look Park's `date-picker`, and they left the table.
- `ui/select.tsx` keeps SmoothUI's data API and shape, but in place of its hand-made list it uses Base UI's `Select`
  primitive (keyboard, ARIA and a portal nested in the sheet).
- `ui/radio-group.tsx` adds Home/End and the `swatch` variant (color pills); all of Motion is removed.
- `ui/toggle-group.tsx` is single-choice only and uses Base UI's `Toggle` directly (SmoothUI's `toggle` slug
  is not copied); it serves a segmented switch (a choice between a few views, for example).
- `internal/chips.tsx` (Ark's TagsInput, Park's `tags-input`) and `internal/attachments.tsx` (Ark's FileUpload, Park's
  `file-upload`) no longer have anything of SmoothUI and left the table.
- `ui/empty.tsx`, `ui/tooltip.tsx`: SmoothUI's structure and `data-slot`, paper/ink tokens; the
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
