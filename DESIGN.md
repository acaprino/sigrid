---
version: alpha
name: Sigrid UI
description: Shared design system of the owner's apps, ADHD first. Two mood colours set each theme; one accent shows where to look and what to click.
x-zsd:
  profile: "0.1"
  kind: project
  source:
    method: hybrid
    captured: 2026-11-20
    paths:
      - src/styles/theme.css
      - src/theme-engine.ts
      - src/theme-catalog.ts
      - src/styles/fonts.css
      - src/components/ui
      - src/components
      - src/internal
      - docs/tokens.css
      - docs/component-inventory.md
      - showcase
  review:
    status: draft
  intent:
    audience: People who use the owner's apps (to-do, mail and more), many with ADHD.
    primary-task: Find, read and act on the items of an app, with one clear action at a time.
    character: ADHD first. Two mood colours (the page and the bar in the theme's tint) and one accent that guides the eye to where to look and what to click; icons as visual anchors; Park UI controls; calm motion only on a gesture.
    density: "configurable: compact, normal (default), large"
    theme: light and dark; each app passes its own theme definitions (the toolkit ships none, only the parametric engine and a gray baseline); each theme has two mood colours and one accent, and the user can make a palette of their own from one base colour
    references:
      - "Ark UI 5.39.3: part anatomy, data attributes and keyboard (approved reference for behaviour)."
      - "Park UI preset 102769c: recipes for sizes, variants, states, radius level and shadow level (approved reference for form)."
      - "Approved previews of 2026-11-20 after their review: one preview for each app and the catalogue toolkit-catalogo.html."
      - "Owner rules of 2026-11-20 (R1 to R10 in the body)."
      - "Owner revision of 2026-11-20, later the same day: the neutral look read as monochrome and dull, with no accent to tell the ADHD eye where to look; R1, R2 and R6 changed, the default tone, the toast stack and the undo order added."
      - "Owner revision of 2026-11-20: the colours belong to the app: the toolkit keeps the engine, the palettes from one base colour, the three tone presets, the look-settings controls and a gray baseline; the tone presets also tint the sidebar; the icon packs are Lucide, Fluent Color and Emoji."
  preferences:
    must-use:
      - "Identity: calm neutral surfaces and one accent that means «act here» or «this is on»; one row highlight and one group heading in every list; red only for danger. Elegant and modern, made for an ADHD eye: what matters first, one primary action, state always in sight."
      - "R1: the chosen row of a list or of the navigation has the selection tint, stronger text and a short accent bar; one selection tint for each view."
      - "R2: the accent tells the ADHD eye where to look and what to click: the primary action, add actions, the current selection, what is on (checkbox, radio, switch, slider), the icons of the main views, progress, today and unread state, and focus. Everything else stays neutral, so the accent keeps its pull."
      - "R3: one solid primary button on each screen, and a solid red one to delete; other actions are outline or text buttons."
      - "R4: inputs and outline buttons use a border; raised surfaces use a shadow."
      - "R5: counts are tabular numbers, pills on a navigation row (accent on the chosen one); key hints are plain 12px text, hidden at phone widths."
      - "R6: icons are visual anchors: every navigation item, section heading, menu entry and settings group has an icon from the icon pack the user chose in Settings; an empty slot keeps alignment."
      - "R11: the default tone is Vivid: accent fills, selection and data colours more saturated. The settings offer Calm, Balanced and Vivid; each moves the accents, the selection, the data colours and the tint of the sidebar and lanes, so the three read apart at a glance."
      - "R12: toasts stack up to ten; Z, outside a text field, undoes the newest action still undoable, and each further Z undoes the one before, in time order."
      - "R13: every settings section shows only its essential choices; the rest sits under its own Advanced fold, closed by default."
      - "R7: radii 4, 6 and 10px, or a theme's `sharp` 2/4/6 or `round` 6/10/14; round shapes only for avatars, dots and switches; 4px spacing grid; heights 36/32/28px (compact 32/28/24; large 40/36/32); icons 16 or 14px; weights 400, 500 and 600; text sizes from tokens."
      - "R8: the focus ring is 2px in the accent text colour with a 2px offset, at least 3:1 in every theme, on every control."
      - "R9: accent text keeps 4.5:1 on both page surfaces in every theme; the theme rule takes step 12 where step 11 falls short."
      - "R10: data colours (what the user colours, labels, events) appear as 8px dots."
    must-avoid:
      - Side rails and accent bars on cards or fields.
      - A border and a shadow on the same element.
      - Key hints drawn as boxes.
      - Sparkles, bolts or info icons as decoration.
      - Gradients.
      - Glass or blur effects.
      - Emoji in the interface, except the Emoji icon pack when the user picks it (R6).
      - Looping animation, except loading skeletons.
      - Colour values outside the theme engine.
      - Data colours as filled blocks.
    preserve:
      - "Park UI native form: controls are 36px (normal density; its 40px md is large), 14px text; the light sidebar is the default and the dark column stays an option."
      - "Checkbox, radio and switch boundaries keep 3:1; fields and outline buttons use the light divider (owner, 2026-11-22)."
      - "Toasts: a column, ten at most (R12), the newest at the bottom; the oldest leaves from the top; an error stays until closed; inverted: dark in light mode, light in dark."
      - "Motion: short Fluent 2 tweens, only after a gesture, enabled by the application, no springs; with motion on, colours ease in 100ms; all works with motion off or reduced."
      - "Colours come only from the theme engine; Park and Radix 12-step palettes are the target palette system; user themes follow the same curves."
      - "Accessibility exception to R7 (approved): with a coarse pointer every control and row is at least 44px at every density."
      - "Exception to R10 (approved): the colour picker shows 24px filled swatches; there the colour is the content."
      - "One backdrop for every overlay that dims: the drop colour at 40%."
      - "Two font roles: the interface stack and the monospace stack of inline code."
  implementation:
    token-source: src/styles/theme.css
    component-sources:
      - src/components/ui
      - src/components
      - src/internal
    style-sources:
      - src/theme-engine.ts
      - src/theme-catalog.ts
      - src/styles/theme.css
    font-assets:
      - src/styles/fonts.css
    image-assets: []
    icon-assets:
      - lucide-react
      - "@fluentui/react-icons"
      - "src/icon-packs.generated.ts (four drawn packs)"
    checks: design-check.config.json
  unresolved:
    - "The 12-step Park and Radix palettes are the target; the engine computes each role in OKLCH and has no step names."
    - "Interface measurements at phone widths are not recorded."
    - "The colour values below are an app's default theme from before 2026-11-19, not the toolkit's: the toolkit ships only the gray baseline (`BASE_THEME`); restate them as roles, or as the baseline's values."
  layout:
    content-max: 1152px
    viewport-min: 320px
  breakpoints:
    md: 860px
  border:
    width-default: 1px
    color-control: "{colors.control-border}"
    color-divider: "{colors.divider}"
  elevation:
    xs: "0 1px 2px #14171726, 0 0 1px #14171730"
    sm: "0 2px 4px #14171717, 0 0 1px #14171717"
    md: "0 4px 8px #14171717, 0 0 1px #14171717"
    lg: "0 8px 16px #14171717, 0 0 1px #14171717"
    float: "0 16px 24px #14171717, 0 4px 8px #14171717, 0 0 1px #14171726"
    xs-dark: "0 1px 1px #05060678, inset 0 0 1px #E3E5E554"
    sm-dark: "0 2px 4px #05060678, inset 0 0 1px #E3E5E554"
    md-dark: "0 4px 8px #05060678, inset 0 0 1px #E3E5E554"
    lg-dark: "0 8px 16px #05060678, inset 0 0 1px #E3E5E554"
    float-dark: "0 16px 24px #0506068C, inset 0 0 1px #E3E5E554"
  motion:
    duration-press: 100ms
    duration-tooltip: 100ms
    duration-follow: 100ms
    duration-leave: 100ms
    duration-mark: 100ms
    duration-release: 150ms
    duration-turn: 150ms
    duration-popup: 150ms
    duration-slide: 150ms
    duration-land: 150ms
    duration-list: 200ms
    duration-row: 200ms
    duration-sheet: 200ms
    duration-toast: 200ms
    easing-enter: "cubic-bezier(0,0,0,1)"
    easing-exit: "cubic-bezier(.8,0,.78,1)"
    easing-move: "cubic-bezier(0.33,0,0.67,1)"
    tooltip-delay: 500ms
  icons:
    size-md: 16px
    size-sm: 14px
    dot: 8px
    stroke: 1.75
    cap: round
  layers:
    tooltip: 45
    overlay: 50
    toasts: 70
  density:
    compact: "controls 32/28/24px, pads 10/8/6px, row 32px, row-pad 4px"
    large: "controls 40/36/32px, pads 14/12/10px, row 48px, row-pad 12px"
  accessibility:
    target-min: "{spacing.touch-target}"
    focus-width: 2px
    focus-offset: 2px
    focus-color: "{colors.accent-text}"
    contrast-text: 4.5
    contrast-control: 3
  modes:
    dark:
      colors:
        primary: "#267C77"
        primary-hover: "#116E6A"
        on-primary: "#F6FEFD"
        accent-text: "#81C6C1"
        accent-soft: "#0C3230"
        selected: "#1A3634"
        on-selected: "#DBF0EE"
        surface: "#171919"
        on-surface: "#E3E5E5"
        surface-ground: "#101313"
        surface-raised: "#242727"
        text-soft: "#BCBEBE"
        text-muted: "#989A9A"
        divider: "#2F3232"
        control-border: "#6E7171"
        destructive: "#FF9A8D"
        on-destructive: "#17161A"
        destructive-soft: "#3D2420"
        success: "#7FD3A0"
        warning: "#F0B85A"
        highlight: "#4F3F08"
        subtle-fill: "#232525"
        backdrop: "#05060666"
colors:
  primary: "#006F6B"
  primary-hover: "#00615D"
  on-primary: "#FFFFFF"
  accent-text: "#006F6B"
  accent-soft: "#D4F3F0"
  selected: "#CEEEEB"
  on-selected: "#00504D"
  surface: "#FAFCFC"
  on-surface: "#141717"
  surface-ground: "#F0F3F3"
  surface-raised: "#FFFFFF"
  text-soft: "#3B3E3E"
  text-muted: "#616464"
  divider: "#DEE0E0"
  control-border: "#87898A"
  destructive: "#AD2A1E"
  on-destructive: "#FFFFFF"
  destructive-soft: "#FEF1EF"
  success: "#1C6B3F"
  warning: "#855000"
  highlight: "#FFE38A"
  subtle-fill: "#ECEEEE"
  backdrop: "#14171766"
typography:
  title-lg:
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.33
  title-md:
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
  title-sm:
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.56
  headline-md:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
  body-lg:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  body-sm:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.38
  label-md:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
  label-sm:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
  code-sm:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.38
spacing:
  hairline: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  section: 32px
  control-xs: 28px
  control-sm: 32px
  control-md: 36px
  touch-target: 44px
  pad-xs: 8px
  pad-sm: 10px
  pad-md: 12px
  row-height: 40px
  row-pad: 8px
rounded:
  l1: 4px
  l2: 6px
  l3: 10px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.l2}"
    padding: "{spacing.pad-md}"
    height: "{spacing.control-md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.l2}"
    padding: "{spacing.pad-md}"
    height: "{spacing.control-md}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.l2}"
    padding: "{spacing.pad-md}"
    height: "{spacing.control-md}"
  button-secondary:
    backgroundColor: "{colors.subtle-fill}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.l2}"
    padding: "{spacing.pad-md}"
    height: "{spacing.control-md}"
  button-ghost:
    textColor: "{colors.text-soft}"
    typography: "{typography.label-md}"
    rounded: "{rounded.l2}"
    padding: "{spacing.pad-md}"
    height: "{spacing.control-md}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-destructive}"
    typography: "{typography.label-md}"
    rounded: "{rounded.l2}"
    padding: "{spacing.pad-md}"
    height: "{spacing.control-md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.l2}"
    padding: "{spacing.md}"
    height: "{spacing.control-md}"
  input-error:
    backgroundColor: "{colors.destructive-soft}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.l2}"
  checkbox-checked:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.l1}"
  segment-thumb:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.l3}"
    padding: "{spacing.pad-md}"
    height: "{spacing.control-md}"
  label-pill:
    backgroundColor: "{colors.subtle-fill}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.l2}"
    padding: "{spacing.sm}"
  key-hint:
    textColor: "{colors.text-muted}"
    typography: "{typography.label-sm}"
  menu:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.l3}"
    padding: "{spacing.xs}"
  menu-item-highlighted:
    backgroundColor: "{colors.surface-ground}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.l2}"
    padding: "{spacing.sm}"
    height: "{spacing.control-md}"
  overlay-card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.l3}"
    padding: "{spacing.lg}"
  tooltip:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.l2}"
    padding: "{spacing.sm}"
  toast:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.l3}"
    padding: "{spacing.lg}"
  calendar-day-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.l2}"
    height: "{spacing.control-sm}"
  accent-label:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.l2}"
  selection-row:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.on-selected}"
    typography: "{typography.body-md}"
    rounded: "{rounded.l2}"
  backdrop:
    backgroundColor: "{colors.backdrop}"
  description:
    textColor: "{colors.text-muted}"
    typography: "{typography.body-md}"
  control-boundary:
    backgroundColor: "{colors.control-border}"
    size: 1px
  separator:
    backgroundColor: "{colors.divider}"
    size: 1px
  status-success:
    textColor: "{colors.success}"
  status-warning:
    textColor: "{colors.warning}"
  status-match:
    backgroundColor: "{colors.highlight}"
---

# Sigrid UI

## Overview

The toolkit is the shared design system of the owner's apps. Ark UI and Base UI supply behaviour, Park UI recipes the form, the theme engine every colour. Apps pass their own themes; these values are examples. The owner rules R1 to R13 are in `x-zsd.preferences`.

### Implementation

Read `docs/component-inventory.md` and `docs/tokens.css` before a UI change. Run `npm run showcase` to see every state.

## Colors

- `primary`: Use for the fill of the one solid action, the chosen calendar day and main-view icons.
- `primary-hover`: Use for the solid action under the pointer.
- `on-primary`: Use for text on `primary` and `primary-hover`.
- `accent-text`: Use for today, unread, add actions, progress and the focus ring.
- `accent-soft`: Use for the accent tint behind accent text.
- `selected`: Use for the current selection, one tint per view.
- `on-selected`: Use for text on `selected`.
- `surface`: Use for the page, inputs and outline buttons.
- `on-surface`: Use for body text, checked boxes, the tooltip and the toast surface.
- `surface-ground`: Use for lanes, the segment track, quiet fills and highlighted items.
- `surface-raised`: Use for cards, menus, popovers, dialogs, sheets and the segment thumb.
- `text-soft`: Use for secondary text and the label of the plain button.
- `text-muted`: Use for placeholders, descriptions, metadata and key hints. It keeps 4.5:1.
- `divider`: Use for lines and the border of inputs, selects and outline buttons.
- `control-border`: Use for checkbox and radio borders and the switch track. It keeps 3:1.
- `destructive`: Use for destructive text and invalid borders.
- `on-destructive`: Use for text on a filled `destructive` surface.
- `destructive-soft`: Use for the error box of a field and an invalid chip.
- `subtle-fill`: Use for quiet fills: the secondary button, label pills and chips (`QUIET_CHIP`). The code draws it as the ink at 6%: the value is that fill over `surface`.
- `backdrop`: Use behind every overlay that dims the page (`BACKDROP`). It is the drop colour at 40%.

### Data colours

Eighteen user colours and eight label pairs come from the engine. Show them as dots of `x-zsd.icons.dot` size. Each dot keeps 3:1.

## Typography

- `title-lg`, `title-md`, `title-sm`: Use for an app's page, section and card titles.
- `headline-md`: Use for dialog, sheet and empty-state titles.
- `body-lg`: Use for field text below the `md` breakpoint, so phones do not zoom.
- `body-md`: Use for body text, menu items and field text.
- `body-sm`: Use for dates and counts beside a title.
- `label-md`: Use for button and segment labels.
- `label-sm`: Use for badges, key hints, tooltips and section labels.
- `code-sm`: Use for inline code in notes (`font-mono`).

Use weights 400, 500 and 600 only. Use tabular numbers for counts.

## Layout

Use the `xs` to `section` spacing steps. Controls use `control-md`; dense rows `control-sm`, `control-xs`. `pad-md`, `pad-sm`, `pad-xs`, `hairline` stay inside controls; rows use `row-height`, `row-pad`. `x-zsd.density` holds compact and large.

### Responsive behavior

Below `x-zsd.breakpoints.md` the sidebar becomes a drawer and fields use `body-lg`. With a coarse pointer controls and rows grow to `touch-target` (approved exception to R7). Key hints disappear on a phone (narrow and coarse).

## Elevation & Depth

Raised surfaces use a shadow from `x-zsd.elevation` and no border. Inputs, selects and outline buttons use a border and no shadow.

- Use `xs` for the segment thumb, board cards and file tiles.
- Use `sm` for the tooltip, `md` for menus and select lists.
- Use `lg` for popovers, dialogs, sheets, toasts and the date card.
- Use `float` for a dragged item.

The shadow colour is the ink in light mode and a near black in dark mode. In dark mode an inner ring of `on-surface` replaces the outer ring.

## Shapes

- `l1`: Use for parts inside a control: checkbox, chip, select item.
- `l2`: Use for controls: buttons, fields, selects, badges, menu items, the tooltip.
- `l3`: Use for surfaces that hold controls: menus, popovers, dialogs, toasts, the segment group, file tiles.
- `full`: Use for avatars, dots, radios and switches only.

The checkbox keeps `l1`. `--radius-check` defaults to `full`, so an app can round its own boxes.

## Components

### Button

Use `button-primary` for the one solid action of a screen and `button-primary-hover` under the pointer. Use `button-outline` or `button-secondary` for other actions, `button-ghost` for the weakest, `button-destructive` to delete. Disabled buttons drop to half opacity and take no pointer.

With `loading` a button keeps its size and focus and ignores clicks; `loadingText` can replace the label. No spinner.

### Input

Use `input` with a visible label; an error is the `input-error` box under it. Selects, date fields and the chips field share its border and height.

### Select

With `invalid` the border is `destructive`. With `disabled` the select drops to half opacity.

### Checkbox

Use `checkbox-checked` for the checked and indeterminate boxes, the radio dot and the switch when on.

### Segment

Use `segment-thumb` for the chosen item of a single-choice group. The thumb slides only with `animated`.

### Label

Use `label-pill` for a user label, with a dot in its colour.

### Accent

Use `accent-label` only for today or unread state.

### Selection

Use `selection-row` with stronger text and a short accent bar for the chosen row, one tint for each view. A row under the pointer takes a share of that tint, in every list.

### Description

Use `description` for the sentence under a title.

### Control

Use `control-boundary` as the border of checkboxes and radios, `separator` as that of inputs, selects and outline buttons.

### Separator

Use `separator` for decorative lines between groups.

### Key

Use `key-hint` after an action label. Inside a filled button the hint takes the button text colour.

### Menu

Use `menu` for menus and select lists, and `menu-item-highlighted` for the item under the pointer or keyboard. Put destructive items last, after a separator.

### Overlay and backdrop

Use `overlay-card` for popovers, dialogs, sheets and the date card. Use `backdrop` behind them.

### Tooltip

Use `tooltip` to repeat the name of an icon-only button. It never holds new information.

### Toast

Use `toast` for the result of an action. Undo and quick choices sit in the toast; Esc does not close it.

### Status

Pair `success` or `warning` with a word. `highlight` marks hits.

### Calendar

Use `calendar-day-selected` for the chosen day. Today is a short `accent-text` dash under the number.

## Do's and Don'ts

- Do keep one solid primary action on each screen.
- Do give navigation items and headings an icon (R6).
- Do show data colours as dots.
- Do write key hints as plain text.
- Do not add a rail or an accent bar to a row.
- Do not put a count in a pill.
- Do not add a colour outside the theme engine.

## Motion

`MotionProvider` enables gesture feedback across an app. Controls can override it with `animated`. Use Fluent 2’s enter, exit and move curves. Limit press travel on wide buttons. Reduced motion changes states immediately.

## Iconography

Use the chosen icon pack (R6); Lucide, the default, keeps the stroke and caps of `x-zsd.icons`. Use `x-zsd.icons.size-md` in controls and `x-zsd.icons.size-sm` in dense rows. Give an icon-only button an accessible name and a tooltip. A row without an icon keeps an empty slot.

## Imagery

Thumbnails show an attachment's image, cropped square. Its alternative text is empty: the row names it.

## Accessibility

Every focusable control shows the ring of `x-zsd.accessibility`: width, offset and colour. Inside the inverted toast the ring takes the toast text colour. Text keeps 4.5:1 and control borders and rings keep 3:1 on every surface of every theme; `test/contrast.test.ts` and `test/theme-engine.test.ts` check this. Hidden inputs show focus through their label.

### Review checks

Open items stay in `x-zsd.unresolved`. Each approved deviation from Ark UI or Park UI names its decision in `docs/component-inventory.md`.
