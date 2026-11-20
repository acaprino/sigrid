# @acaprino/toolkit

A design system for React apps: the single source of truth for colours, tokens, fonts, primitives and motion. It
knows nothing of any app: no app's name, concepts or product components, and nothing of a desktop shell. An app builds
its product components on top of it, usually in a package of its own that re-exports what the app needs from here.
MIT licence (`LICENSE`); the third-party code it adapts, all MIT, is listed in `THIRD_PARTY.md`. It is not on npm:
use it from the repository (`npm ci`, `npm run build`, then a `file:` dependency on this folder).

## The four layers

1. **Behaviour: Ark UI** (`@ark-ui/react`, pinned to 5.39.3), imported component by component: notices, date picker,
   tags input, file upload. **Base UI** (`@base-ui/react`, 1.9.0) still carries the primitives not moved yet (dialog,
   sheet, select, popover, menu, checkbox, tooltip, toggle group, radio group, input); `Collapsible`, `Field` and
   `PopoverPrimitive` are re-exported so an app composes them with the toolkit's single copy.
2. **Form: Park UI's recipes**, translated by hand to Tailwind classes (Park is not installed): sizes, variants, corner
   levels and elevation of every primitive in `src/components/ui/`.
3. **Motion of its own**: short decelerating tweens (100 to 240 ms, no springs), only with the `animated` prop, never
   with `prefers-reduced-motion`, only in answer to a gesture. `motion` (14.6.0) is imported by
   `src/internal/motion-impl.tsx` alone, a chunk loaded lazily (`useMotion`, `preloadMotion`): with animations off it
   never reaches the browser.
4. **Colours: the theme engine** (`src/theme-engine.ts`, `src/theme-catalog.ts`, `src/themes.ts`, `src/colors.ts`):
   every colour is computed from the chosen theme and scheme and written as tokens on the root (`applyTheme`); the
   first paint's palettes are in `src/styles/theme.css`. No hard-coded colours anywhere else.

Third-party provenance is in `THIRD_PARTY.md`, checked by `test/provenance.test.ts`.

## What it exports

- `.`: the theme engine and catalog, the colour palette, `cn`, the primitives (`Button`, `Input`, `Textarea`,
  `Checkbox`, `Select`, `Sheet*`, `DialogRoot`/`Dialog*`, `DropdownMenu*`, `Popover*`, `RadioGroup*`, `ToggleGroup*`,
  `Tooltip`, `Kbd`, `Empty`, `Badge`, `Calendar`), the surfaces (`Dialog`, `Toasts`), `PortalContainerProvider` (where overlays mount for part of an app drawn in
  another document), the
  generic fields and helpers (`DateField`, `DurationField`, `ChipsInput`, `Swatches`, `AttachmentsSection`,
  `AttachmentViewer`, `Thumbnail`, Markdown, drop payloads, media queries, overlay layers), and the Motion loader.
  Where a piece needs an app's word or default, it takes a parameter (`Select`'s `renderMark`, the date fields'
  `placeholder`, `AttachmentsSection`'s `textNotice`).
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
  icons that inform, radii 2/4/6, heights 40/36/32, 2px accent focus ring, data colours as dots…), the approved
  references (Ark UI for behaviour, Park UI for form) and the open questions. Read it before a UI change.
- `docs/component-inventory.md` and `docs/tokens.css`: every component against Ark, Park and the other components,
  with each deviation approved (and why) or fixed; the tokens with the file each one comes from.
- `showcase/`: every component in its variants, sizes and states (hover, pressed and focus forced with
  `data-force`), in light and dark and in several palettes. `npm run showcase` serves it (Vite, development only, not
  part of the package); `?theme=ambra&scheme=dark&open=menu` picks the theme and opens what opens on a gesture.
- Checks: `npm run design:lint` (DESIGN.md is valid) and `npm run design:check` (the code uses no colour, palette
  class, arbitrary size, font or effect that DESIGN.md does not permit; config `design-check.config.json`, accepted
  findings in `design-check.known.json`) use the copy of the tool in `tools/zero-slop-design/` (v0.2.1, MIT); the
  scale classes they do not read (text sizes, radii, shadows, weights, icons, border with shadow, boxed key hints,
  loops and effects) are checked against DESIGN.md by `test/design-rules.test.ts`. CI runs both (`.github/workflows/ci.yml`,
  job `toolkit`). An exception needs a `design-check-ignore-next-line <rule>: <cause>` comment.

## Build and test

```bash
npm ci
npm run typecheck   # tsc --noEmit
npm run build       # dist/index.js (+ chunks/, Motion separate), dist/index.d.ts, dist/styles.css, dist/fonts/
npm test            # vitest run
```

An app's product package bundles the toolkit from this `dist` (its build and tests can rebuild it when the sources are
newer), and the app builds both before its own build.
