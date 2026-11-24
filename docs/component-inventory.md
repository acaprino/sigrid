# @acaprino/sigrid: component inventory

Extracted 2026-11-20 (Marionette step `design-system-extract`, intent `ui.component-inventory`) from the code of
`design/toolkit/src` at commit `a7f94d5`, from the showcase (`design/toolkit/showcase/`, `npm run showcase`; screenshots
before any change in the review's `toolkit-5/showcase-before/`), from Ark UI 5.39.3's part anatomy (`@ark-ui/react/anatomy`,
as installed) and from Park UI's recipes (`packages/preset/src/recipes/*.ts` at `102769c`). The tokens are in
[`tokens.css`](./tokens.css). The findings are judged by the owner's agreed rules of 2026-11-20 (recorded as rules in
[`../DESIGN.md`](../DESIGN.md), same numbering):

- R1 no side rails or accent bars; active = neutral fill and stronger text; selection = one accent tint per view.
- R2 accent only for the single primary action, the current selection, today/unread, and focus.
- R3 one solid primary button per screen.
- R4 border or shadow, never both: inputs and outline buttons a border; raised surfaces (cards, toasts, menus, popovers, file tiles, the segment thumb) a shadow.
- R5 counts are plain tabular numbers; key hints plain 12px text, hidden at phone widths; pills only for labels.
- R6 an icon only when it tells something; an empty slot rather than a repeated icon; no decorative sparkles, bolts or info icons.
- R7 radii 2/4/6 (the same when this inventory was made; 4/6/10 for a time in between) (round only for avatars, dots, switches); 4px spacing grid; heights 36/32/28 (at normal density; 32/28/24 at compact, 40/36/32 at large; 40/36/32 at normal when this inventory was made: added after this inventory, `src/density.ts`); icons 16/14; weights 400/500/600; text sizes from tokens.
Since 2026-11-22 the owner's design changed several of the rules below: the chosen row has a short accent bar (R1), a destructive button is solid red (R3), counts on a navigation row are pills (R5), checkbox, radio and switch are filled with the accent, fields and outline buttons have the light divider border, and a field's error is a box. `DESIGN.md` states the rules as they are now; the findings below are as they were when this inventory was made.

- R8 focus ring 2px in the accent-text colour, 2px offset, at least 3:1 in every theme, on every focusable control.
- R9 accent text at least 4.5:1 on both page backgrounds in every theme; step 12 where step 11 falls short.
- R10 data colours (projects, areas, labels, events) as 8px dots only.
- Decisions: Park native form (md 40px, 14px text), light sidebar by default; control borders at 3:1; toasts an inverted column (dark in light mode, light in dark mode) of at most 3, newest at the bottom; motion only on a gesture, no loops but skeletons; colours only from the theme engine, Park/Radix 12-step palettes as the target.

Each finding is marked:

- **approved**: a deviation from Ark, Park or another component that a recorded decision allows (the decision is named);
- **defect**: to fix, with a severity (high, medium, low);
- **open**: needs a product decision; listed as a question, not fixed.

## Summary

| Group | Components |
|---|---|
| Foundations | colour tokens (theme engine), type scale, radii l1/l2/l3, elevation xs/sm/md/lg/float, icon stroke, focus ring (no token) |
| Atoms | Button, Badge, Kbd, Shortcut, Input, Textarea, Checkbox, RadioGroupItem, Thumbnail, AttachmentMarks |
| Molecules | ToggleGroup, Select, RadioGroup, Swatches, ChipsInput, DateField, DateTimeField, DurationField, Tooltip, Empty, InlineMarkdown, MarkdownBlocks |
| Organisms | DropdownMenu (14 parts), Popover (7 parts), DialogRoot (10 parts), Sheet (8 parts), Calendar, AttachmentsSection, AttachmentViewer, Toasts |
| Templates | Dialog (centred, drawer) |
| Headless (no form) | Collapsible (with a form: `Disclosure`), Field, PopoverPrimitive (Base UI re-exports) |

Behaviour: Ark UI carries Calendar/DateField/DateTimeField (DatePicker), ChipsInput (TagsInput), AttachmentsSection
(FileUpload) and Toasts (Toast); Base UI carries the other primitives, and that split is meant to stay (2026-11-22). Form: Park UI recipes translated to Tailwind.

## Findings at a glance

| ID | Component(s) | Axis | Severity | Finding | Status |
|---|---|---|---|---|---|
| F01 | Button, Badge, Input, Textarea, Checkbox, Radio, Select, Calendar, ChipsInput, DateField, Sheet, Dialog close, AttachmentsSection, AttachmentViewer, Toasts, ToggleGroup, Swatches | a11y / R8 / internal parity | high | Focus is drawn five ways: a 3px box-shadow of the ink at 50% (`ring-[3px] ring-ring/50`), a 2px ink ring offset 2px (dialog close), a 2px ink outline offset 1px (segment) or 6px (swatch), and the ink as `--color-ring`. R8 asks for a 2px outline in the accent-text colour, 2px offset, on every focusable control. | defect |
| F02 | Kbd inside Button | a11y | high | `Kbd` is `text-ink-soft` on `bg-ink/6`: inside a solid button the hint is unreadable unless the caller passes `bg-current/15 text-current` (showcase, "key hint": "Enter" invisible on the fill). | defect |
| F03 | Button `secondary`, Select trigger, Sheet, AttachmentViewer page | slop / R4 | high | Border and shadow together: `border border-line … shadow-xs` (secondary), `border border-input bg-raised … shadow-xs` (select), `border-l … shadow-lg` (sheet), `shadow-sm ring-1 ring-line` (viewer page). | defect |
| F04 | AttachmentsSection item | R4 / Park parity | medium | A file tile is a raised item with a hairline (`border border-line bg-raised`, Park's item): R4 gives file tiles a shadow, not a border. | defect (deviation from Park approved by R4) |
| F05 | Kbd, Shortcut, DropdownMenuShortcut, Toasts hint | slop / R5 | high | Key hints are boxes: a tinted key (Kbd, Park subtle), a bordered key (toast `border-paper/40`), 13px letter-spaced text (`text-xs tracking-widest`, menu), a 10px separator; none is hidden on a phone. R5: plain 12px text, hidden at phone widths. | defect |
| F06 | `SUBTLE_ACCENT` chips (now `QUIET_CHIP`) | slop / R2 | high | The quick-destination chips are an accent tint with accent text (`bg-accent-soft text-accent`, hover `bg-selected`). R2: chips are neutral. | defect (fixed; renamed by Q9) |
| F07 | Badge `default`, Badge `link` | R2 | medium | The default badge is a solid accent fill; the link badge is accent text. R2: accent only for the primary action, the selection, today/unread and focus; labels are neutral. Park's own default badge is `subtle`. | defect |
| F08 | MarkdownBlocks checklist | R2 / internal parity | medium | A done item's box is an accent fill (`border-primary bg-primary`), while `Checkbox` uses the ink. | defect |
| F09 | AttachmentsSection drop zone | R2 | low | While dragging, the zone's border turns `border-primary` (accent): not one of R2's four uses. | defect |
| F10 | ChipsInput | R10 | high | Label colours are filled blocks (`TAG_COLOR`: `bg-(--tag-bg) text-(--tag-ink)`). R10: data colours as 8px dots only. An app's own label pills already follow it (neutral pill with a dot). | defect |
| F11 | Swatches | R10 | — | The colour picker shows 18 filled 24px circles: a picker has to show the colour it offers. | approved (Q2): an exception to R10, the colour is the content, not a data label |
| F12 | Empty | R6 / R7 | medium | The optional icon sits in a 48px round tile (`size-12 rounded-full bg-paper-2`) with a 20px icon; the title is `text-lg` (18px, no token). | defect |
| F13 | DialogTitle, Dialog (drawer title) | R7 / Park parity | medium | `text-lg` (18px): no token names 18px (theme.css: titles are 16px `base`). Park's dialog title is lg, its drawer title xl. | defect (16px; deviation from Park approved by R7) |
| F14 | Button `lg`, `icon-lg` | R7 | medium | 44px at a fine pointer: R7's heights are 40, 36 and 32. No consumer uses them (the consuming apps: 0 uses). | defect |
| F15 | every control (`pointer-coarse:min-h-11`) | R7 vs. touch targets | — | 44px with a coarse pointer (test/targets.test.tsx): a guarantee kept; R7 governs the fine-pointer sizes. | approved (Q6): an accessibility exception to R7's heights |
| F16 | Badge icons, AttachmentMarks, ChipsInput remove, Empty, AttachmentsSection upload, Thumbnail (sheet), AttachmentViewer loading/error | R7 icons | medium | Icons at 12px (`size-3`) and 20px (`size-5`): R7 allows 16 and 14. | defect |
| F17 | AttachmentsSection upload icon, AttachmentViewer error icon | R6 | low | Decorative icons above text that already says it ("Add a file"; the error sentence). | defect |
| F18 | AttachmentViewer loading | motion rules | medium | `Loader` with `motion-safe:animate-spin`: a loop; the motion rules allow loops only for loading skeletons. | defect |
| F19 | fonts.css | R7 weights | low | IBM Plex Sans 700 is loaded (2 files); the toolkit uses 400/500/600. The only `font-bold` is in an app's own component, outside the toolkit. | defect |
| F20 | Shortcut separator, MarkdownBlocks check, entry.css safelist | R7 text | low | `text-[10px]` (separator, check mark), `text-lg`/`text-xl`/`text-2xl` in the precompiled CSS safelist. | defect |
| F21 | MarkdownBlocks check box | R7 radii | low | `rounded-[3px]`: off the 2/4/6 scale. | defect |
| F22 | DropdownMenuCheckboxItem / RadioItem | internal parity | low | The indicator slot is 14px (`size-3.5`) holding a 16px check icon. | defect |
| F23 | RadioGroupItem | internal parity / Park parity | low | The radio is 16px, the checkbox 18px (Park sm: both 18px); the radio has no `data-state` (the checkbox has, as Ark). | defect |
| F24 | Popover | Park parity | low | Width 288px (`w-72`; Park `xs` = 256px); title 14px medium (Park md 16px). | defect |
| F25 | DialogHeader | Park parity / slop | low | Centred text on narrow screens (`text-center sm:text-left`, shadcn's); Park and every other surface align left. | defect |
| F26 | DialogContent close | slop / states | low | The close button rests at `opacity-70` (a dimmed control); the sheet's close is `text-ink-mute` with a hover fill. | defect |
| F27 | Sheet vs Dialog backdrop | internal parity | low | `bg-drop/30` (sheet) vs `bg-drop/50` (dialog); Park uses one backdrop for both. | fixed (Q7): one `BACKDROP` (`bg-drop/40`) for dialog, sheet, drawer and viewer; DESIGN.md `colors.backdrop` |
| F28 | Toasts | R7 spacing | low | The row has 6px vertical padding (`py-1.5`), off the 4px grid. | defect |
| F29 | Button | states | — | No loading state (Park's button has `loading` with a spinner). | fixed (Q3): `loading` (size kept, `aria-busy`, `aria-disabled`, clicks ignored) and `loadingText`; no spinner |
| F30 | Select | states | — | No `disabled` and no `invalid` on the component (Base UI has both). | fixed (Q4): `disabled` (half opacity, Base UI's disabled) and `invalid` (`aria-invalid`, destructive border) |
| F31 | ToggleGroup | Ark parity / a11y | low | A single-choice group exposed as toggle buttons (`role="group"`, `aria-pressed`); Ark's SegmentGroup is a radio group (arrows select). | approved (behaviour kept, tests depend on it) |
| F32 | Theme engine | R9 | medium | Accent text reaches 4.5:1 by moving lightness in fine steps; R9 asks for the palette rule "step 11, or step 12 where step 11 falls short". The engine has no 12-step palette. | defect (implemented as a two-step rule on the engine's own scale) |
| F33 | Theme engine | R9 / a11y | medium | Accent text is not checked on the selection tint (`selected`): a focus ring in the accent on a selected row is not guaranteed 3:1. | defect |
| F34 | Overlay hooks | naming | low | DOM hooks of the notices named after one of the apps, in the shared toolkit. | fixed (Q1): `data-toasts`, `--toasts-room`, `--bottom-bar-room` |
| F35 | Checkbox | R2 / Park parity | — | The checked box is the ink, not Park's solid accent. | approved (R2: accent not for checkboxes) |
| F36 | Input, Textarea, Select, ChipsInput, DateField | Park parity | — | Control border `input` (3:1), darker than Park's step-7 border. | approved (decision: control borders keep 3:1) |
| F37 | Input, Textarea, DateField, Select, ChipsInput, Combobox | Park parity | — | 14px text from 860px (Park md: 16px); 16px below 860px (iOS does not zoom). | approved (decision: Park native, md = 40px controls, 14px text) |
| F38 | ToggleGroup | Park parity | — | The thumb is a raised sheet with the xs shadow and no border (Park's indicator has a border). | approved (R4: the segment thumb gets a shadow) |
| F39 | Toasts | Park parity | — | An inverted surface (`bg-ink text-paper`: dark in light mode, light in dark mode), a column of at most 3, newest at the bottom (Park: light card, stacked). | approved (decision: toasts; Q8) |
| F40 | Radio, Checkbox (`--radius-check`), switches | R7 round shapes | — | The radio is round (Park, every platform); the shape token `--radius-check` is round (9999px) by default, for an app that rounds its own boxes (the toolkit's `Checkbox` keeps l1). | approved for the radio (a dot control); Q5: the toolkit states its default and an app may round its boxes (an app's setting) |
| F41 | Tooltip, Popover | Ark parity | — | No arrow part. | approved (Park's form has none by default) |
| F42 | every surface | R1 | — | No component of the toolkit draws a rail or an accent bar; active rows (menu, select) are neutral fills. | approved (follows R1) |
| F43 | `test/__snapshots__/animated.test.tsx.snap` | AGENTS.md "no test snapshots" | low | A snapshot file in the toolkit's tests. | open (outside the design review; reported) |

## Internal parity

| Axis | Values in the code | Inconsistencies |
|---|---|---|
| Control heights (at normal density; since density, `--control-md/sm/xs` and `--row-height`) | Button 40/36/32 (`lg` 40 since F14); Input 40; Textarea 1 line = 40; Select 40/36; DateField trigger 40; ToggleGroup item 40; Menu and Select items min 40; ChipsInput control min 40 | Button `lg` 44 (F14); the time input of DateTimeField is 36 beside a 36 button (consistent) |
| Small parts | Checkbox 18; Radio 16; Kbd 18/20/22; Badge 20; chip 28 with a 20px remove; Thumbnail 64/40 | Radio 16 vs Checkbox 18 (F23) |
| Side padding (at normal density; `--pad-md/sm/xs`) | Button 14/12/10 (md/sm/xs); Input 12; Select 12 left, 10 right; DateField 12; segment item 14; menu item 8; select item 8 (+32 for the check); chips control 6 | Select's 10px right edge holds the chevron (approved: Park's indicator) |
| Radii | Controls `rounded-md` (l2): Button, Input, Textarea, Select trigger, DateField, Badge, Kbd, menu items, select list, tooltip; `rounded-sm` (l1): Checkbox, select items, chip; `rounded-lg` (l3): menu, popover, toasts, date card, segment group and items, attachment tiles; Dialog `rounded-xl` (alias of l3) | Dialog names `xl` where the others name `lg` (same level) — F25 fixed with it |
| Elevation | xs: secondary button, select trigger, segment thumb; sm: tooltip, viewer page; md: menu, select list; lg: popover, dialog, sheet, toasts, date card | xs on bordered controls (F03) |
| Focus | see F01 (five forms) | F01 |
| Icon sizes | 16 (`size-4`) standard; 12 in Badge, AttachmentMarks, chip remove, Checkbox mark; 20 in Empty, upload, thumbnail placeholder (sheet), viewer states; 8 (dot) menu radio | F16 (the check mark inside an 18px box and the menu radio dot are glyphs, approved) |
| Label styles | Radio label 14 medium `leading-none`; DateTimeField "Time" 14 regular; DurationField labels 13 `ink-soft`; Select/Menu group label 14 medium `ink-mute`; Attachments heading 12 semibold uppercase 0.07em `ink-mute`; captions 13 `ink-soft` | Radio label medium vs the other inline labels regular: approved (it is the radio's own label part) |

## Components

Each section: purpose; variants and sizes; states; tokens; composition; accessibility; Ark parity (parts, data
attributes, keyboard); Park parity (recipe, sizes, variants, states, radius level, shadow level); do and don't.

### Button

- **Purpose**: an action. One solid button per screen (R3); the others outline, plain (`ghost`) or text (`link`).
- **Variants**: `default` (Park solid), `outline` (Park outline), `secondary` (Park subtle in the gray), `ghost` (Park plain, one step quieter: medium weight, soft ink), `destructive` (Park subtle in red), `link` (ours). `QUIET_CHIP` (constant, before `SUBTLE_ACCENT`, Q9): the neutral quiet chip, Park subtle in the gray, for chips.
- **Sizes**: `xs` 32, `sm` 36, `default` 40, `lg` 44; `icon-xs/sm/icon/lg` square at the same heights; 44 minimum with a coarse pointer.
- **States**: rest, hover, active (pressed), focus-visible, disabled (`opacity-50`, no pointer), invalid (`aria-invalid`: red border), loading (`loading`: same size, `aria-busy` and `aria-disabled`, focus kept, clicks and pointer ignored; `loadingText` takes the label's place in one grid cell, so the width is the wider of the two; no spinner, no loop: F29, Q3). With `animated`: pressed scale 0.96 (down in 100 ms, back in 150 ms), no hover scale, never with reduced motion.
- **Tokens**: `primary`, `primary-foreground`, `accent-hover`, `ink`, `ink-soft`, `line`, `destructive`, `destructive-soft`, `ring`, `radius-md` (`--radius-button`), `shadow-xs` (secondary), `text-sm`/`text-base`, weight 600 (500 for ghost and link).
- **Composition**: `<button>` or the child with `asChild` (Base UI `useRender`); icons 16px; may hold a `Kbd`.
- **Accessibility**: `type="button"` by default; icon-only buttons need `aria-label` (and a `Tooltip`). Focus F01; Kbd inside F02.
- **Ark parity**: Ark has no button part (plain element). n/a.
- **Park parity**: base l2, semibold, gap 8, sizes xs/sm/md/lg = 32/36/40/44, paddings 10/12/14/16 — same. Park's solid `md` icon is 20px, ours 16px (R7, approved). Park's surface has no shadow (the toolkit's `secondary` added `shadow-xs`: F03). Disabled: Park `opacity 0.67` + grayscale, ours `opacity-50` (approved: one disabled look across the toolkit).
- **Findings**: F01, F02, F03, F06, F14, F15, F29.
- **Do**: one `default` per screen, the rest `outline`/`ghost`. **Don't**: two solid buttons side by side; `secondary` with an extra shadow.

### Badge

- **Purpose**: a label (R5: pills only for labels, never for counts).
- **Variants**: `default` (solid accent), `secondary` (ink at 6%), `destructive` (solid red), `outline` (hairline), `ghost` (none), `link` (accent text). One size (Park md).
- **States**: rest; as a link (`asChild` on `<a>`) hover; focus-visible.
- **Tokens**: `primary`, `ink`, `destructive`, `border`, `paper-2`, `radius-md` (`--radius-chip`), `text-2xs`, weight 500, tabular numbers.
- **Composition**: `<span>` or the child with `asChild`; 12px icons (F16).
- **Accessibility**: text only; colour never the only signal.
- **Ark parity**: none in Ark. n/a.
- **Park parity**: md: 20px tall, 12px medium, px 8, l2, tabular — same. Park's default variant is `subtle`; ours `default` is solid accent (F07).
- **Findings**: F07, F16.
- **Do**: `secondary` for a label. **Don't**: a badge for a count, or an accent badge.
- **Tone** (added 2026-11-24, hook H2 below): `tone` = `success`, `warning`, `danger`, `info` draws a status as a label:
  the status colour on its soft ground and a 6px dot before the word, in place of the variant's colours. Absent, the
  badge is as above.

### Kbd and Shortcut

- **Purpose**: the key that does the same thing as a control ("Ctrl K", "Z"); `Shortcut` writes a combination with one accessible name.
- **Variants**: one (Park subtle: a tinted key). **Sizes**: `sm` 18 (default), `md` 20, `lg` 22.
- **States**: none (not interactive).
- **Tokens**: `ink` at 6% (fill), `ink-soft` (text), `ink-mute` (separator), `radius-md`, `text-2xs`/`xs`/`sm`, weight 500.
- **Composition**: `<kbd>`; `Shortcut` = `span[role=img]` + `Kbd` per key + a separator.
- **Accessibility**: inside a button the hint should be `aria-hidden` (the button carries `aria-keyshortcuts`).
- **Ark parity**: none. **Park parity**: Park `kbd` sizes 18/20/22, default `subtle` md. R5 picks Park's `plain` variant at 12px (F05).
- **Findings**: F02, F05, F20.
- **Do**: plain 12px text after the label. **Don't**: a boxed key, or a hint on a phone.
- **Boxed** (added 2026-11-24, hook H1 below): under a theme with `keys: 'boxed'` a key is a 20px cap with a hairline.
  The theme asks for it; a caller never draws a box on a `Kbd`.

### Input

- **Purpose**: one line of text.
- **Variants**: one (Park outline). **Size**: md 40px.
- **States**: rest, placeholder, hover (none: approved, Park's outline has none), focus-visible, disabled (`opacity-50`), invalid (red border; 20% red ring).
- **Tokens**: `input` (border), `ring`, `muted-foreground` (placeholder), `destructive`, `radius-md`, `text-base` → `text-sm` from 860px.
- **Composition**: Base UI `Input` (native `<input>`).
- **Accessibility**: label by the caller (`<label htmlFor>` or `aria-label`); border 3:1.
- **Ark parity**: Ark `Field.Input` (data-invalid, data-disabled): ours uses native `disabled` and `aria-invalid`; no Field wrapper (Base UI `Field` re-exported). Parity of states holds.
- **Park parity**: md: 40px, px 12, l2, outline; text 16px in Park (F37 approved); border colour (F36 approved); focus ring inside the border in Park, outside with 2px offset under R8 (approved by R8).
- **Findings**: F01, F36, F37.
- **Do**: pair with a visible label. **Don't**: a fill and a shadow on a field.
- **Border** (2026-11-22, then 2026-11-24): the light divider (`line`) at rest and `input` under the pointer; under a
  theme with `controls: 'strong'` (hook H3 below) the control border (`input`, 3:1) at rest.

### Textarea

- As Input; Park `textarea` md: px 12, py 7 (one line = 40px with the 1px border), l2; Park's default variant is `surface` (a fill), ours `outline` (R4: inputs get a border, approved). `field-sizing-content`, min 64px. Findings: F01, F36, F37. **Do**: let it grow. **Don't**: fix `rows` in the toolkit.

### Checkbox

- **Purpose**: an on/off choice in a list or a form.
- **Variants**: one (Park solid in ink). **Size**: 18px (Park sm), touch area 30px (56 with a finger).
- **States**: unchecked, checked, indeterminate × rest, hover (none), focus-visible, disabled, invalid; `animated`: the mark is stamped once after a click (from half size, 100 ms).
- **Tokens**: `input` (border at rest), `ink` (fill), `paper` (mark), `ring`, `destructive`, `radius-sm`.
- **Composition**: Base UI `Checkbox.Root` as `<button>` + `Indicator` + a 12px stroked mark.
- **Accessibility**: Space toggles, Enter does not (WAI-ARIA); `<label htmlFor>` names it.
- **Ark parity**: Ark parts root/label/control/indicator/group → ours root(=control)/indicator; label is the caller's. `data-state="checked|unchecked|indeterminate"` on the control (Ark's), plus Base UI's `data-checked`/`data-unchecked`/`data-indeterminate`/`data-disabled`. Keyboard: same.
- **Park parity**: sm 18px, l1, 12px icon — same; fill ink not accent (F35 approved); border `input` (F36 approved).
- **Findings**: F01, F35, F36, F40 (the round `--radius-check`).
- **Do**: pair with a label. **Don't**: an accent-filled checkbox.

### RadioGroup and RadioGroupItem

- **Purpose**: one choice among a few visible options.
- **Variants**: `radio` (circle with a dot), `swatch` (a filled colour, for `Swatches`). Orientation vertical (`grid gap-3`) or horizontal (`gap-4`).
- **States**: unchecked, checked, focus-visible, disabled (`opacity-50`), invalid (border).
- **Tokens**: `input`, `ink`, `paper`, `ring`; swatch: `--mark-dot` and the 2px ink selection ring offset 2px.
- **Composition**: Base UI `RadioGroup` + `Radio.Root` as `<button>` + `Indicator` + optional `<label>`.
- **Accessibility**: one Tab stop, arrows move and select (wrapping), Home/End added; the label is a real `<label>`.
- **Ark parity**: Ark root/label/item/itemText/itemControl/indicator → ours root/item(control)/indicator/label; group label by `aria-label` (no label part); `data-checked` but no `data-state` (F23); Ark's sliding indicator is not used.
- **Park parity**: Park radio-group sm control 18px, round, solid fill when checked; ours 16px with an ink dot (F23; the dot style is approved, as the checkbox's ink).
- **Findings**: F01, F23, F40.
- **Do**: 2 to 5 options. **Don't**: a radio for an on/off choice.

### Swatches

- **Purpose**: the colour of an area or project (18 named colours).
- **Composition**: `RadioGroup` horizontal + `RadioGroupItem variant="swatch"`; name from `COLOR_NAMES`, never the hex.
- **States**: chosen (ink ring offset 2px), focus (accent-text outline offset 6px), touch 44px. Filled 24px swatches: the approved exception to R10 (Q2).
- **Ark/Park parity**: Ark ColorPicker swatch parts (swatchTrigger, swatch) are not used: a radio group is the right semantics for a fixed palette (approved). Park color-picker swatch: l2 square; ours round 24px.
- **Findings**: F01 (focus colour), F11 (open).
- **Do**: name each colour. **Don't**: show the hex.

### ToggleGroup

- **Purpose**: a single choice shown as a segmented control (view, scheme).
- **Variants**: one (Park segment-group md). `animated`: the thumb slides (150 ms).
- **States**: pressed (raised thumb, semibold, ink), unpressed (ink-mute, hover ink), focus-visible, disabled.
- **Tokens**: `paper-2` (track), `line` (inner ring), `raised` + `shadow-xs` (thumb), `ink`, `ink-mute`, `ring`, `radius-lg`, `text-sm`, 500/600.
- **Composition**: Base UI `ToggleGroup` + `Toggle`; `Highlight` from the motion chunk.
- **Accessibility**: `aria-label` required; one Tab stop, arrows move, Space/Enter choose (F31).
- **Ark parity**: Ark SegmentGroup root/label/item/itemText/itemControl/indicator, `data-state="checked"`; ours root/item, `data-pressed`, indicator only when animated (F31 approved).
- **Park parity**: md item 40px, px 14, 14px medium, l3 for track and items, inset 1px ring on the track — same; thumb shadow without border (F38 approved).
- **Findings**: F01, F31, F38.
- **Do**: 2 to 4 short labels. **Don't**: use it for navigation between pages.

### Select

- **Purpose**: one value from a list too long for a segmented control.
- **Variants**: one; `renderMark` draws an app's mark before each label; `groups` with headings. **Sizes**: `default` 40, `sm` 36 (auto width).
- **States**: rest, hover (none), focus-visible, open (`data-popup-open`: the ink border), placeholder, item highlighted (`paper-2`), item selected (check), item disabled, disabled (`disabled`: `opacity-50`, no pointer, out of the Tab order), invalid (`invalid`: `aria-invalid`, `destructive` border, also when open) (F30, Q4).
- **Tokens**: `input`, `raised`, `shadow-xs` (trigger, F03), `popover`, `shadow-md` (list), `paper-2`, `ink-mute`, `radius-md` (trigger, list), `radius-sm` (items), `text-sm`.
- **Composition**: Base UI `Select` (Root, Trigger, Value, Icon, Portal, Positioner, Popup, List, Item, ItemText, ItemIndicator, Group, GroupLabel); lucide `ChevronDown`, `Check` (16px).
- **Accessibility**: `aria-label` or `id` + label; arrows, type-ahead, Enter, Esc, Home/End from Base UI.
- **Ark parity**: Ark select parts trigger/valueText/indicator/positioner/content/list/item/itemText/itemIndicator/itemGroup/itemGroupLabel are all present under Base UI names; label/control/clearTrigger are not (label by the caller). Data: `data-highlighted`, `data-selected` (Ark `data-state="checked"`), `data-popup-open` (Ark `data-state="open"`).
- **Park parity**: trigger md 40, px 12, l2; list l2, md shadow, p 4, gap 2; items min 40, px 8, l1 — same. Park's default trigger is `outline` (no fill, no shadow); ours is `surface` with an added shadow (F03).
- **Findings**: F01, F03, F30, F36.
- **Do**: label every select. **Don't**: a select for two options.

### DropdownMenu

- **Purpose**: the actions of a row or a button ("…").
- **Parts**: `DropdownMenu`, `Trigger` (`asChild`), `Content`, `Group`, `Label`, `Item` (`variant` default/destructive, `inset`, `onSelect`), `CheckboxItem`, `RadioGroup`, `RadioItem`, `Separator`, `Shortcut`, `Sub`, `SubTrigger`, `SubContent`, `Portal`.
- **States**: item rest, highlighted (`paper-2`), disabled (`opacity-50`), destructive (red text, red 10% highlight), checked (check / dot), sub open; content `data-state` open/closed; `animated`: the card fades in from the side it was placed on, flipped or not (8px, 150 ms).
- **Tokens**: `popover`, `shadow-md`, `paper-2`, `muted-foreground` (icons), `destructive`, `border` (separator), `radius-lg` (card), `radius-md` (items), `text-sm`; shortcut `text-xs` `tracking-widest` (F05).
- **Composition**: Base UI `Menu`; lucide `Check`, `ChevronRight`, `Circle`.
- **Accessibility**: Enter/Space/ArrowDown open with focus on the first item; arrows do not wrap; type-ahead; Esc returns focus; the trigger carries `data-state`.
- **Ark parity**: Ark menu content/item/itemGroup/itemGroupLabel/itemIndicator/separator/trigger/triggerItem/positioner — present; `Label` is not a group label part (it sits in the card, documented); no `contextTrigger` (no context menu) and no arrow (approved). Data: `data-highlighted`, `data-disabled`, `data-state`.
- **Park parity**: md: card l3, md shadow, p 4, gap 2; items min 40, px 8, l2; label h 40 — same.
- **Findings**: F05, F22.
- **Do**: verbs, destructive last after a separator. **Don't**: more than one level of submenu.

### Popover

- **Purpose**: a non-modal card anchored to a control (notifications, a quick form).
- **Parts**: `Popover`, `PopoverTrigger` (`asChild`), `PopoverContent` (`align`, `side`, `sideOffset`, `animated`), `PopoverAnchor`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription`.
- **States**: open/closed (`data-state` on trigger and content).
- **Tokens**: `popover`, `shadow-lg`, `radius-lg`, p 16, `text-sm`, `muted-foreground`.
- **Accessibility**: Esc and outside click close, focus returns to the trigger.
- **Ark parity**: Ark trigger/anchor/positioner/content/title/description/closeTrigger/arrow → no closeTrigger part and no arrow (approved); title is a `div`, not Base UI's `Popover.Title` (no `aria-labelledby`): low a11y note.
- **Park parity**: l3, lg shadow, padding 16 — same; width 288 vs 320 and title 14 vs 16 (F24).
- **Findings**: F24, F41.
- **Do**: short content, one action. **Don't**: a form that needs a modal.

### Tooltip

- **Purpose**: the name of an icon-only button, on hover (500ms) and focus.
- **Tokens**: `ink` (card), `paper` (text), `shadow-sm`, `radius-md`, `text-2xs` semibold, px 8 py 6, max 256px, z 45.
- **Accessibility**: the card is `aria-hidden`; the name is the button's `aria-label`; Esc closes.
- **Ark parity**: trigger/positioner/content; no arrow (approved). **Park parity**: l2, sm shadow, xs semibold, px 8 py 6, max xs — same.
- **Do**: repeat the button's name. **Don't**: put new information only in a tooltip.

### DialogRoot parts and the Dialog surface

- **Purpose**: a modal window (short confirmations, small forms); `Dialog` with `drawer` opens it as a right sheet.
- **Parts**: `DialogRoot`, `DialogTrigger`, `DialogPortal`, `DialogOverlay`, `DialogContent` (`showCloseButton`), `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`.
- **States**: open (`data-state`), close button rest (`opacity-70`, F26)/hover/focus.
- **Tokens**: `raised`, `shadow-lg`, `BACKDROP` (`drop` at 40%, Q7), `radius-xl` (= l3), p 16/24, gap 24, title `text-lg` (F13), description `muted-foreground`.
- **Accessibility**: focus trapped, initial focus immediate, `aria-modal`, Esc, focus restored (`restoreFocusTo`); a click on a toast does not close it.
- **Ark parity**: Ark trigger/backdrop/positioner/content/title/description/closeTrigger — all but positioner (the content centres itself).
- **Park parity**: l3, lg shadow, p 16 → 24 from md, gap as padding — same; title lg (F13), header centred on phones (F25).
- **Findings**: F01, F13, F25, F26.
- **Do**: a title that says what will happen. **Don't**: a dialog over a dialog.

### Sheet

- **Purpose**: a side panel (the details of an item, the viewer, a drawer dialog).
- **Parts**: `Sheet` (`closesOnEscape`: asked at each Esc, `false` leaves it open and the key to the page), `SheetTrigger`, `SheetClose`, `SheetContent` (`side`, `showCloseButton`, `onCloseAutoFocus`, `animated`), `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`.
- **Tokens**: `background`, `shadow-lg` + `border-l` (F03), `BACKDROP` (`drop` at 40%, F27, Q7), close `ink-mute`.
- **Accessibility**: modal, swipe to dismiss in the side's direction, focus restored; a toast does not close it.
- **Ark parity**: Ark drawer backdrop/content/title/description/closeTrigger/trigger present; positioner = Base UI viewport; no grabber (removed, approved) and no swipeArea (Base UI swipes the popup).
- **Park parity**: lg shadow, no border; title xl semibold (ours inherits 14px semibold; the Dialog drawer sets 18px, F13).
- **Findings**: F01, F03, F13, F27.

### Calendar, DateField, DateTimeField

- **Purpose**: choose a day (and a time) for a due date or a reminder.
- **Variants**: `DateField` (day, closes on choice, "Clear the date"), `DateTimeField` (day + optional time, "Done").
- **States**: day rest, hover (`ink/6`), focus-visible, today (semibold + accent dash), selected (accent fill), outside month (`ink-soft`), disabled; trigger empty (placeholder `ink-soft`) / filled.
- **Tokens**: `primary`, `primary-foreground`, `accent-hover`, `ink-soft`, `ink-mute`, `popover`, `shadow-lg`, `radius-lg` (card), `radius-md` (cells), cells 36px (44 with a finger).
- **Composition**: Ark `DatePicker` (Root, Control, Trigger, Positioner, Content, View, ViewControl, Prev/View/NextTrigger, RangeText, Table, TableHead/Header/Body/Row/Cell/CellTrigger); `Checkbox`, `Input`, `Button`.
- **Accessibility**: the trigger is named by the field's label; grid keyboard from Ark plus Home/End for the week; weekday headers readable with `abbr`.
- **Ark parity**: real Ark. Not used: input, label, clearTrigger, presetTrigger, month/year selects, valueText (own button text). Data attributes used: `data-today`, `data-selected`, `data-outside-range`, `data-focus`, `data-disabled`.
- **Park parity**: content l3, lg shadow, p 16, gap 12; nav and cells plain 36px buttons, l2; selected solid — same. Trigger = Park input md.
- **Findings**: F01 (cells, nav, trigger).
- **Do**: show the chosen date in words. **Don't**: a second accent mark besides today and the selection.

### ChipsInput

- **Purpose**: a list of labels typed as chips.
- **States**: rest, focus-within, chip reached with the arrows (`data-highlighted`), remove hover/focus.
- **Tokens**: `input`, `ring`, `--tag-bg`/`--tag-ink` (F10), `radius-md` (control), `radius-sm` (chip), chip 28px, remove 20px with a 12px icon (F16).
- **Composition**: Ark `TagsInput` (Root, Control, Item, ItemPreview, ItemText, ItemDeleteTrigger, Input) + `Badge` + `Tooltip`.
- **Accessibility**: Ark's announcements in English; one Tab stop; arrows walk the chips.
- **Ark parity**: real Ark; not used: label (the caller's), clearTrigger, itemInput (not editable).
- **Park parity**: tags-input md: control min 40, px 6, gap 6, l2; items 28px l1 with a 20px delete — same.
- **Findings**: F01, F10, F16.

### DurationField

- Two number inputs (64px wide), two 13px `ink-soft` labels, four `secondary` xs buttons (`aria-pressed`) and a `ghost` "None". Inherits F03 through `secondary`. Ark/Park: none of its own (NumberInput of Ark not used: two native number fields). **Do**: shortcuts for the frequent cases. **Don't**: free text.

### AttachmentsSection, AttachmentMarks, Thumbnail

- **Purpose**: list an item's attachments and add files or links; show a row's attachment count; show an image.
- **States**: attachment ready / arriving / not uploaded / over the limit / text only; drop zone rest, drag over (`border-primary`, F09), focus; notice.
- **Tokens**: `raised`, `line` (tile border, F04), `input` (dashed zone), `paper-2`, `ink`, `ink-soft`, `ink-mute`, `radius-lg` (tiles, zone), `radius-md` (thumbnail, trigger), `text-2xs` uppercase heading with 0.07em tracking.
- **Composition**: Ark `FileUpload` (RootProvider, HiddenInput, Trigger) + `useDropTarget` + `Input` + `Button` + `Tooltip` + `Thumbnail`.
- **Accessibility**: the zone is a real button; the input is outside the accessibility tree; focus moves to the next row after "Remove"; the thumbnail button is out of the Tab order.
- **Ark parity**: real Ark for the picker; dropzone and items are ours (links are attachments too: approved, documented).
- **Park parity**: file-upload dropzone l3, 2px dashed, px 24 py 16 — same; items l3 with a 1px border (F04); upload icon (F17).
- **Findings**: F04, F09, F16, F17.

### AttachmentViewer

- A right sheet with a header (title, "Page n of m", zoom − / % / +, download) and a page column; states loading (spinner, F18), error (alert icon, F17), ready. Since 2026-11-24 the error is a `Note` with `tone="error"` (the one look of a failure: its icon is the tone's mark, not a decoration above the sentence), the message as its title and «Open the original» as its action; there is no retry. Pages `shadow-sm` + `ring-1 ring-line` (F03). Ark/Park: Sheet's. **Do**: keep the zoom steps. **Don't**: animate the loading.

### Toasts

- **Purpose**: the result of an action, with undo and quick choices.
- **States**: entering, resting, held (pointer or focus: time suspended), leaving (inert), pushed out by a fourth; pressed quick choice (paper fill).
- **Tokens**: `ink` (card), `paper` (text), `shadow-lg`, `radius-lg`, `paper` at 15% (hover), at 40% (outline of choices, hint box F05), `text-sm`, timer `text-xs`.
- **Composition**: Ark `Toast` (Toaster group, root props, Title) + `Button` (ghost xs). An error (`kind: 'error'`) is marked with Sigrid's `error` icon by its meaning (the circle with an X, the one mark of a failure, as in a `Note`), no longer Lucide's `CircleAlert` by its name (2026-11-24).
- **Accessibility**: region `role="status"`, `aria-relevant="additions"`, Alt+T reaches it, and in an `AppShell` F6 does in the frame's round (F6 was Ark's key here until 2026-11-23, when it became the frame's); Esc does not close a notice; the timer is `aria-hidden`.
- **Ark parity**: real Ark; not used: description, actionTrigger, closeTrigger (own buttons, with the toolkit's form).
- **Park parity**: l3, lg shadow — same; colours inverted (F39 approved); padding 6px (F28).
- **Findings**: F01 (region ring), F05, F28, F34, F39.

### Empty

- Title (`text-lg` medium, F12), optional sentence (`text-sm ink-soft`), optional action, optional icon in a 48px circle (F12). No Ark/Park part (Park has no empty state recipe). **Do**: words first; only «nothing here». **Don't**: an illustration or an icon tile; a failure (that is a `Note` with `tone="error"`, 2026-11-24).

### InlineMarkdown, MarkdownBlocks

- Read-only rendering of notes: strong 600, code `paper-2` 4px in `font-mono` (DESIGN.md `code-sm`, Q10), link underline `ink-mute`, quote `border-l-2 line` (a quote mark, not a row rail: approved), lists, checklists (F08, F20, F21). No Ark/Park part.

## Gaps (open, not invented)

- No focus-ring token (width, offset, colour as one name) — F01's fix gives the colour a token (`ring` = accent text) and the width/offset a shared class.
- No 12-step palette names (step 11/12) in the engine — F32's fix states the two-step rule on the engine's scale.
- No z-index tokens; no letter-spacing tokens; no heading sizes above 16px in the toolkit's own scale.
- No context menu in the toolkit (Ark has one; nothing consumes it yet). The switch, the tabs with panels and the
  combobox were added on 2026-11-21: see «Added after the review».

## Added after the review (2026-11-21)

For a second app that is to use the toolkit alone (a mail app with its own primitives until now), with the same
references: Ark UI for behaviour, Park UI's recipes for form, the owner's rules.

| Component | Behaviour | Form | Rules |
|---|---|---|---|
| `Switch` | Ark `Switch`; the hidden input is given `role="switch"` | Park `switch` md, solid: 40x20px track, 16px thumb | Off: the `input` border colour (3:1). On: the ink, as the checkbox (R2). No shadow on the thumb (R4). Slides only with `animated`. 44px area with a coarse pointer |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Ark `Tabs`: one Tab stop, arrows move and choose (or only move, `activation="manual"`) | Park `tabs` md, subtle: 40px triggers, 14px semibold, l2 | The chosen tab is the selection tint with its ink; Park's `line` variant (a bar) is not offered (R1) |
| `FormField` | The toolkit's own wiring: `id`, `aria-describedby`, `aria-invalid`, `required` on the one child | Park `field`: 6px gap, 14px medium label, 14px helper and error | The required mark is the ink (R2); the error takes the helper's place and is announced |
| `Count` | none | 12px tabular figures in the muted ink | R5: a plain number, but a pill on a navigation row, drawn by `NavItem` (the accent on the chosen row, neutral on the others, 2026-11-22); zero shows nothing (`reserve` keeps the room) |
| `Steps` | none: an ordered list (`<ol role="list">`); the step the user is on has `aria-current="step"`; each step says done, current or not started in words (`words.steps`); a step already done is a button only with `onStepSelect` | A 24px round dot (R7) joined by a 1px line, in a column with the descriptions beside the dots, or in a row. Done: a check (14px) on the accent tint; current: the one solid dot with its number and its name semibold; to come: the quiet fill and the muted name; the line is the accent as far as the steps done | R2: the accent is progress. Nothing moves (state always in sight). No bar or rail on a card (R1). After NTG Claude Tips 81, style 04, for an app that walks a user through a task. A step that failed (`status: 'error'`) is red with Sigrid's `error` icon (the circle with an X, the one mark of a failure, 14px in the dot) and says so; a row (`orientation="horizontal"`, which needs a width of its own) too narrow for the names keeps the current one and says «Step 2 of 4» (a container query) (2026-11-22) |
| `Progress`, `ProgressRing`, `ProgressSegments` | None from Ark, by decision: Ark's Progress names the bar with its own value and gives no `aria-valuetext`, and there is no keyboard to inherit. `role="progressbar"` named by the app, `aria-valuemin/max/now`, always `aria-valuetext` (`words.progress`, in any language); no `aria-valuenow` where it is not known how far it is | The bar: Park `progress` (102769c), a track 8px (`sm`) or 10px (`md`) with the corners of a control (l1); the range from the start. The ring (viewBox 36, stroke 4, from the top, clockwise) and the blocks (up to 24, 4px apart) are ours: Park's circular recipe was not read | R2: the range is the accent as progress; done is the success colour, a failure the destructive one, each with a word (DESIGN.md "Status"). A failure has the one mark of a failure, Sigrid's `error` icon (the circle with an X): 16px inside the ring, 14px before the «Failed» of the bar and of the blocks (2026-11-24). Not taken from Park: stripes, the indeterminate gradient and every animation (no gradient, no loop but the skeletons), the pill shape (R7). Not knowing how far it is: a track with no range and «In progress». Nothing moves: a progress set by events is not a gesture, so the range jumps, no tween (DESIGN.md Motion). The range is `primary`, as the checkbox and the switch (DESIGN.md Colors). Done, failed and not known always say their word, with or without `showValue` (DESIGN.md Status) (2026-11-22). The styles of NTG Claude Tips 81 refused: striped, gradient, battery, liquid (DESIGN.md must-avoid); the upload card is a composition (patterns.md) |
| `NavList`, `NavItem` | `<nav>` with a list; a row is a button, or a link with `href`; `aria-current="page"`; `actions` sit beside the row, outside it (a button cannot hold a button); the rail shows neither `description` nor `actions` | A row of the density's height, l2, 14px; with `description`, a second 13px line in the muted ink | R1: the selection tint, stronger text and a short accent bar at the left edge (2026-11-22). R5: a `Count` at the end of a row is a pill, the accent on the chosen row. R6: the icon slot stays when empty. `tone="sidebar"` uses the sidebar's own ink and selection |
| `Sidebar`, `SidebarGroup` | `<aside>` with a `<nav>` of named lists; below 860px a `Sheet` from the left; a group heading that opens is a button with `aria-expanded` | The sidebar surface and inks (`sidebar-*`), 256px wide, or one row wide as a rail | R1: the selection tint, stronger text and a short accent bar (the rows are `NavItem`s). R6: a heading has an icon slot. Shrunk to a rail a row keeps its name for screen readers and shows it as a hint. The search hides the rows that do not hold the text. Generic navigation, not an app's product sidebar (2026-11-22). |
| `pageTint`, `accentSuggestions`, `duoTheme` | A base colour keeps its hue at an OKLCH lightness of 0.985 and a chroma of 0.018 at most; the accents are the base's harmonies on the OKLCH wheel (150°, 180°, 120°, 30°, 0°) at the lightness of a button, ranked: a split complement first, a hue moved out of the red of errors, one beside the success green or the warning amber, and an olive (85° to 120°) lower. A base with no hue gets eight hues round the wheel, the blue first | The engine's `own` theme: the page from the base, the sidebar, sheets, lines and ink from the page | The owner's model of 2026-11-22: two colours, the base (white unless chosen, always very light) and an accent chosen by the principles of colour harmony and suggested by the toolkit. Every contrast threshold is the engine's (test/harmony.test.ts) |
| `toneHasEffect`, `TonePresetChoice`'s `noEffect` | Compares the colours of a theme in the calm and the vivid tone, channel by channel | none | A choice that changes nothing is not offered: on the gray baseline (no hue) the three tones keep every interface colour and move the data colours by a few units of 255, so the cards would be three copies of one preview. With `noEffect` the chooser says so in their place (2026-11-22) |
| `AppShell desktop`, `useDesktopGuard`, `guardDesktop` | The frame as the window of a program: overlays mount in a layer under the title bar (`PortalContainerProvider`, a transformed box that bounds `position: fixed`); the guard refuses the browser's keys in the capture phase, its menu outside fields and selected text, the mouse's side buttons and the drag of pictures and links | Chrome not selectable with the arrow cursor; content, the inspector's body, fields and `data-selectable` selectable (theme.css) | Imago's techniques in the toolkit's own writing; no host API (test/no-shell.test.ts). Off on a page in a browser tab (2026-11-22) |
| `AppShell`, `Inspector` | Seven regions after Imago's `im-shell`; a `<main>` with a skip link; F6 and Shift+F6 move the focus between title bar, sidebar, content and inspector, skipping a closed one (after Imago's `regions`, 2026-11-23); the frame measures its own width (`ResizeObserver`) and the `Sidebar` and the `Inspector` read the step from it; the inspector is never modal (docked, or a `Sheet` with `modal={false}`): a press outside it does not close it, it opens without taking the focus, and closed with the focus in it (a menu it opened counts) it gives the focus back to what last had it outside, or to the content; closed with the focus elsewhere it moves nothing; the same when it is taken out of the page open; when the control that had the focus in it is removed, the focus stays in the inspector, on the inspector itself (`tabindex="-1"` in both forms). Its button closes it; Escape does with the focus in it, in both forms, but not on a field that holds text or with a list or menu open; Escape with the focus elsewhere is the field's or the app's command, in both forms; a swipe towards its edge closes the panel only (2026-11-24) | The page surface; lines between regions (R4); the status and the foot are one 12px line; the inspector is 300px | Steps at 1000, 850 and 620px of the frame, not of the screen. One solid action for the window, last in the actions (R3). A rail the width forces has no button to widen it (2026-11-22) |
| `Toolbar`, `ToolbarButton`, `ToolbarGroup`, `ToolbarSeparator`, `ToolbarTitle`, `ToolbarSpacer` | Base UI `Toolbar`: one Tab stop, the arrows move among the items, a disabled item stays reachable | The `Button` recipe at the dense height (32px): `ghost`, `outline`, or `default` for one item | A button that shows an icon alone has its name as its hint, with its key as plain text (R5). A switch that is on has the selection tint (R1), not the accent fill. One solid action (R3) |
| `ToolbarBrand` | A mark hidden from screen readers and the name; both carry the bar's drag mark | A 24px square in the accent, l2, with the initial of the name in 13px semibold; the name in 14px semibold | The accent here is the app's identity, after Imago's `im-mark`. No drawn logo. Under 256px of toolbar the name goes (2026-11-22) |
| `ToolbarTabs`, `ToolbarTab` | Items of the toolbar (one Tab stop, the arrows move); the view the user is in carries `aria-current="page"`: they are places, not panels | Words as tall as the bar, 14px; the current one semibold with a 2px bar in the accent on the bar's lower edge | After Xiox's title bar. The short accent bar is R1's, here under a word; no tint, so the bar stays quiet. In the bar or in a toolbar under it (`AppShell`'s `tabs`) (2026-11-22) |
| `CommandPalette`, `useCommandKey` | The toolkit's `Dialog` with a combobox field and a listbox; every word typed must be in a command's name or keywords; the arrows skip a disabled command; Enter runs and closes | The dialog's raised card near the top of the window; rows of the density's height; the highlighted row is `ROW_HIGHLIGHT`; a key is 12px plain text (R5), hidden on a phone | After Imago's palette. The commands are the app's. Ctrl+K, or Cmd+K (2026-11-22) |
| `CommandsProvider`, `useCommand`, `useCommands`, `useCommandPalette`, `formatKeys`, `KeyHints` | One registry of an app's commands: each declared once while its component is mounted, with a key as a combination (`Escape`, `F6`, `Ctrl+F`) run from one listener on the window; a plain key is left to a field, every key to an open dialog, menu or list of options and to the places `ownKeysIn` names; a command whose `when` is false does not run and is listed dimmed; Ctrl+K (Cmd+K on a Mac) is the registry's own command (`PALETTE_COMMAND`, off with `palette={false}`) and opens a `CommandPalette` given no list; the registry keeps the order of declaration; `KeyHints` lists, in the order the app names them, the keys of the commands that can be done now, and follows them as they come and go | No form of its own: the palette's rows, each key in the system's words («Ctrl F», «Cmd F») | After Imago's `createRegistry` and `mountApp`. A combination another handler refused (`useDesktopGuard` on Ctrl+F) still runs the app's command; a plain key a widget handled is the widget's. A command not available now stays in the palette, dimmed (docs/patterns.md) (2026-11-23) |
| `useSchemeCommands`, `applyKeptScheme` | Three commands of the registry (`sigrid.scheme.light`, `sigrid.scheme.dark`, `sigrid.scheme.system`) in a group of their own where the hook is called, each named so that it stands alone without the heading («Light theme», «Dark theme», «System theme»: a screen reader says «Light theme, checked»), the one in use `checked`; a choice is put on the document's root at once (`applyTheme` with the app's theme) and kept as a word under the app's key in `localStorage`; every hook of the page with that key reads it at once, another tab through the `storage` event; the system's choice, the default, follows `prefers-color-scheme` (`useMedia`); a value kept that is not one of the three is the system's. The storage is read first: whenever it can be read it is the answer, so what another page or a clear keeps is followed and a write it refused (a full quota) does not hold; only where it cannot be read at all (turned off, some private modes) does a choice hold in the page until it is closed. On a server the hook says the system's choice, drawn light, and reads no storage. `applyKeptScheme` puts the kept choice on the root as soon as the entry's script runs, before React renders; what the stylesheet painted before it is in the system's scheme, and the toolkit cannot hold that paint. A Tauri app gives the `scheme` it returns to `useWindowTheme` (`./tauri`) | No form of its own: the palette's rows under the group's heading, each with its icon (`sun`, `moon`, `appearance`, R6); the one in use has a check in the ink at the end of its row, the others keep its room. The check is the look of `Combobox`'s chosen option; its ARIA is not: `aria-checked` on the option, because the palette's `aria-selected` marks the highlighted row | After Imago's `mountApp`, whose look commands made the one in use unavailable: here it is checked, not dimmed. No visible switch for the scheme: the owner chose the palette's commands, the same in every app. Words `scheme` (2026-11-23) |
| `ItemList`, `ItemRow` | A named list; a row is a button, or a link with `href`, so nothing in it is a control; the chosen row carries `aria-current`; an unread row says «Unread» to screen readers | A row of the density's height, or two lines; l2; 14px title, 13px line under it, 12px tabular fact at the end | R1: the selection tint, stronger text and the short accent bar. R2: unread is a dot in the accent and a semibold title. The same hover as every list. Things, not places: places are `NavItem` (2026-11-22) |
| `Column`, `Cluster`, `Split`, `Grid`, `Spacer`, `Section`, `ScrollArea`, `Page`, `Text` | The layout of a screen with no class of the app's own: a pile, a row that wraps, two groups at the ends of a row, cells in as many columns as the width holds, a spacer, a region named by its heading, a named region that scrolls and takes the keyboard, the body of a page, the weight of a line; a class or a style passed in spite of the types is dropped | Gaps and paddings only `xs` to `xl` (4 to 24px); `Grid` columns at least 12, 17 or 24rem; `ScrollArea bounded` under 48% of what is seen (`--app-height`); `Page` at `content-max` (1152px), its sections 24px apart; `Text`: muted ink, 12px caption and kicker | After Imago's helpers (the owner's rule of 2026-11-23: an app has no interface code of its own). `Section`'s heading keeps its icon slot when empty (R6) |
| `ToolbarSearch` | A `ToolbarButton` that opens into the `SearchField`; Esc empties and closes it, leaving it empty closes it; inside the field the arrows move the caret | The magnifier, then a 256px field at the dense height | It stays open while it holds text. The app binds the key that opens it (`open`). Closed it is the magnifier, or a quiet field with its key (`closed="field"`). The narrow steps follow the toolbar's own width (a container query, as Imago's frame): under 448px a word beside an icon and the field give way, under 256px the title |
| `TitleBar`, `WindowControls` | A `<header>`; `app-region: drag` on the bar and `no-drag` on its controls (theme.css); a host's own drag mark as `dragProps`; three buttons that only call back | The page surface with a line under it (R4), 48px at normal density; the window buttons are 44px wide and as tall as the bar, the last one the accent under the pointer, as in Imago (red is for danger). `maximizeRef` and `maximizeState` serve a host that lays the system's Snap Layouts over the middle button | `size="compact"` is a 32px caption with 28px items in its toolbar (`Toolbar size="sm"`): a measure chosen with a parameter, for the dense bars of a classic desktop program. No window API in the toolkit (test/no-shell.test.ts). `--titlebar-start` and `--titlebar-end` keep clear of the system's own buttons (2026-11-22) |

| `Slider` | Ark `Slider`, one thumb; Up and Down act as Right and Left | Park `slider` md, outline: 8px track, 20px thumb with a 2px border | The track is the `input` colour (3:1), the range and the thumb's border the ink (R2), no shadow on the thumb (R4). 44px area with a coarse pointer |
| `InputGroup`, `InputGroupText`, `InputGroupButton` | The toolkit's `Input` with fixed parts before or after the text: words, an icon, a small button; a `FormField` wires the `<input>` inside; a press on the words puts the caret in the field | One field: the input's border, height and corners around the parts and the text; the parts muted, the buttons `ghost` at 28px | R4: one border, none inside. The ring is on the field's border while the text has the focus; a button of the group shows its own. The buttons are off with the field. Never the solid action (R3) |
| `CopyButton` | A button that puts `value` on the clipboard; then a polite status says «Copied», or that the system refused | The copy icon becomes a check, and the word «Copied», for two seconds; the icon keeps its box and the word the room of the wider text | The answer is in the button itself: no toast (that is for an action to take back). `ghost` and icon-only by default, with a hint; in an `InputGroup` it takes the group's size and is off with the field |
| `Disclosure` | Base UI `Collapsible`: a button with `aria-expanded` that names its panel; the panel stays in the page while closed, so what was written in it is kept | A quiet row, the chevron in the icon slot (it turns when open), the name in 14px medium, an optional fact after it; the panel opens under the row | Progressive disclosure: what most people do not need on most visits. Named for what it holds. Two levels at most. Never hides what people need before they commit |
| `SearchField` | A native `type="search"` input; a button empties it and gives it the focus back | The toolkit's `Input`, with a 16px magnifier and a 32px clear button | The browser's own clear button is hidden; the caller names the field |
| `Combobox` | Ark `Combobox`: typing filters, arrows move, Enter chooses, Esc closes the list first | Park `combobox` md: the input, and the select's list (l2, md elevation) | The chosen row carries a check in the ink (R2). The list stays inside the sheet that holds it (no portal) |
| `Logo` | None from a library: a plain `img` whose load and failure are followed. `src` (an SVG or a PNG the app serves), `name` (its accessible name, `role="img"`; without it or with `decorative` it is hidden), `icon` (drawn in the box while it loads and when it fails; none, an empty box). `TreeNode.image` and `GraphNode.image` draw it | A square box of 16px (`sm`) or 20px (`md`) that never changes size, the picture whole in it (`object-contain`): no border, no ground, never recoloured or inverted, the same in light and in dark | R6: a logo is content (the mark of a service, a framework, a library), not an icon of the interface; those stay Sigrid's one set (`Icon`), and a logo never stands for an action or a kind of thing. Not an `Avatar` (a person) |
| `Avatar` | Ark `Avatar`: initials until the picture loads, and again if it fails | Park `avatar`, subtle, round: 40, 36 or 32px | A neutral fill for every person: a person's colour is a dot beside the name, never the fill (R10) |
| `OverflowList` | none from a library: a flex row that wraps, one row tall, with `overflow: clip`, so what does not fit wraps onto a row that is not shown. The items below the first one are counted when drawn, when the box changes size (`ResizeObserver`) and when the fonts are ready; they get `inert` and `data-cut`. The cue says the count to the eye («+2») and to screen readers (`words.list.more`). No layout, or no `ResizeObserver`: nothing is cut | The caller's box, as tall as one row of its items; the cue 8px after the line, in 13px muted tabular figures | R5: a count is plain tabular figures. Cut from the end and whole, never wrapped onto a second line; the first item always stays. A cut item is not read, so the item's page holds all of it. No motion (2026-11-23) |
| `Tree`, `TreeNode` | Ark `TreeView` and its tree collection. Parts used: `Root`, `Label` (hidden: it names the tree), `Tree`, `NodeProvider`, `BranchControl` (made the `treeitem` of a branch: `role`, `aria-level`, `aria-expanded`, `aria-selected`, `aria-current`, `aria-busy`, and `aria-owns` the group of its rows), `Item`; not used: `Branch` and `BranchContent` (Ark's collapsible would keep a closed branch's rows in the page until a frame and an animation end: the group is drawn while the branch is open, and only then), `BranchIndicator`, `BranchText`, `ItemText` (the row's content is ours, memoised), `BranchTrigger` (the whole row opens), `BranchIndentGuide`, `ItemIndicator`, `NodeCheckbox`, `NodeRenameInput`, and Ark's `loadChildren` (it keeps a branch «loaded» for ever and asks again on a second Enter). One Tab stop: the row last reached, else the chosen one, else the first, whichever is in sight (a row the filter hides gives it up). Down, Up, Right (opens, then goes in), Left (closes, then goes out), Home, End, the first letters typed (a plain «a» too: Ark keeps `a` for Cmd+A, so it is sent again as «A»), `*` opens the branches beside; Enter, Space or a press choose, and open or close a branch (Ark's `expandOnClick`). The row that has the focus is the `treeitem`, on a branch as on a leaf. One choice, never several; the choice, the open branches and the text of the filter controlled or not; `onExpandedChange` only with a changed list. Ours: the loads of a branch with `hasChildren` (`loadChildren`, `aria-busy` meanwhile, Enter and Right ignored on it, so no second request; a failure leaves it closed and opening it again tries again; a load given up says nothing); loaded children belong to the node object they came for, and another object for the id, or none, drops them and aborts a load under way; each row named by its name alone (`aria-labelledby`), with the fact, the count or the state of its load as its description, the state read live; the filter (`query`, `defaultQuery`, `onQueryChange`, drawn as a field with `search`) keeps what `match` finds (default: the name holds the text, whatever the case) with all it holds and opens the branches that lead to a find, from the nodes as they are; a branch never loaded is not searched; what the person opens goes into their own list, what they close of the filter's is kept closed while the text is the same, and clearing gives back their list with those changes; nothing found says «No results» (`words.sidebar.empty`, the word of every search) | Park `tree-view` (102769c): rows of the density's row height (44px with a coarse pointer), l2, 14px; one level in 20px (Park's 22px, off the 4px grid), so the chevron of a row sits under the icon of the row that holds it; at the start the chevron of the sidebar's groups (14px in a 16px slot, a quarter turn when open, turning with Motion only with `animated`), then the icon (16px, Sigrid's one set, `openIcon` while open; an empty slot in a tree where other rows have one, R6), the fact in 12px tabular figures at the end and a `Count` after it, «Loading» or «Not loaded» in the fact's place | R1: the look of every list of things (`ROW_HOVER`, `ROW_CHOSEN` of `lib/rows.ts`, shared with `ItemRow`): the chosen row has the selection tint, its ink and the short accent bar at its start, its name semibold; under the pointer a share of the tint. R5: a count is a `Count`. R2: the chevron is chrome, in the muted ink (Park's is the accent). Not taken from Park: the semibold of the first level (semibold says «chosen»), the line that guides the eye down a branch, the transitions. A failed load in the destructive ink and in words, never by colour alone. The parts that draw a row are memoised (Ark's own parts are painted again at each move of the focus, as its context changes). It is not the graph: `GraphCanvas` and its tree mode share no code with it (the owner, 2026-11-23). Left out: a virtual tree, dragging, several chosen rows, checkboxes, renaming (2026-11-23) |
| `Note`, `NoteTone` | No Ark part (Ark has no alert). A message that stays in the page until the app removes it: no close button, no timer. One need, one look: a failure the page shows is a note with `tone="error"` (with «Retry» when it can be tried again), never an `Empty` (only «nothing here»); a passing event is a toast. An error or a warning is `role="alert"`, announced when it appears, unless `announce={false}` (a warning that is a fact of the item shown, which would be read again at each selection); information and a success have no live role (a polite `role="status"` is read by some screen readers as soon as it is put in the page, and again at each change of its text), so they are met in the page's order. The root is keyed on its tone: a note whose tone changes in place is drawn anew, so an information or a warning that becomes an error is announced (a focused button inside it loses the focus). The tone's word is read before the title, hidden from the eye: `words.common.error` («Error», the word of an error toast) for an error, `words.note` («Information», «Success», «Warning») for the others; a title does not start with it. `items` is a `<ul>`, `actions` the app's buttons after it. A long word breaks where it must (`overflow-wrap: anywhere` on the root, inherited by the title, the text and the list); a tool's output goes in the text as `<Text pre>` | Park `alert` (102769c), its default `subtle` variant at `md`: the icon at the start and the content beside it, 12px apart, 16px of padding, l3 (it holds controls), 14px text; the title semibold over the text, 4px apart; the actions 8px apart, 12px under the text. The fill is the tone's soft status token (`success-soft`, `warning-soft`, `destructive-soft`, as the error box of `FormField`), information the quiet fill (the ink at 6%); the icon (16px, Sigrid's `info`, `check`, `alert`, `error`) and the title in the tone's colour (information: the soft ink and the ink), the text and the list in the ink | Never colour alone (DESIGN.md "Status"): an icon of its own for each tone and the word. `error` is Lucide's circle with an X, the one mark of a failure in every part (a toast's error, a failed `Progress` and step), so it never looks like `info` (the circle with an «i»). R2: information is never the accent. R4: a fill, with neither a border nor a shadow: it lies in the page, it is not raised. R3: the actions are `outline` or `ghost`, a solid one only as the one primary action of its screen. R7: the icon at 16px, not Park's 20px. Contrast: the ink, the labels of the actions (`outline`'s ink and `ghost`'s soft ink, at rest and under the pointer, 4.5:1) and the focus ring on every fill, the tone on its soft fill, in every theme and scheme and with the user's own theme (`test/theme-engine.test.ts`, `test/contrast.test.ts`). Not taken from Park: its colour palettes (blue, orange, green, red), the `solid`, `surface` and `outline` variants, the `lg` size. Left out: a note the person closes, a skeleton, a panel that waits (`Progress` with no value, `Empty`) (2026-11-23; one look for a failure, `announce`, the tone as its key and the long words, 2026-11-24) |
| `Chat`, `ChatMessage`, `ChatTool` | No part of its own: `Conversation`, `Message`, `Reasoning`, `ToolCall`, `Note`, `Suggestions` and `PromptInput`, put together from the messages the app holds as data. It tells the app what the user did (`onSend`, `onStop`, `onRetry`, `onVote`) | A column: the thread fills, then the suggestions, then the field, 12px apart | What every chat does alike is decided here: no actions on an answer still being written, its reasoning open until the text starts, «try again» on the last answer only, a failed answer as an error note with «Try again», a suggestion fills the field and gives it the focus |
| `Conversation`, `Message` | No library part: a scroll region with `role="log"` that follows its end while the reader is within `CONVERSATION_NEAR_PX` of it (after each draw, and when its content changes size), `aria-busy` while an answer is written; a message is an `article` that says who it is from before its text | A reading column (48rem at most, 24px between turns). A user's turn: the quiet fill (the ink at 6%), l3 corners, at the end of the row, four fifths wide at most. An answer: plain 14px text on the page (`MarkdownBlocks` for a string). Actions: quiet 32px icon buttons in a fixed order (time, copy, try again, good, bad, the app's) | No typing dots and no shimmer (no loops). The button back to the latest message is a raised surface (shadow, no border: R4), shown only while the reader is away from the end. A pressed vote is the neutral fill, never the accent (R2) |
| `PromptInput` | A `<form>` around a native `<textarea>` (`field-sizing: content`, one line to eight); Enter sends unless Shift is held, a composition is open or the pointer is coarse; an empty text is never sent | One field (`lib/field.ts`): the field's border around the text and its row, the focus ring on that border while the text has the focus. The row: the app's tools at the start, the count, a 32px button at the end | One button in one place: solid «Send» (the screen's primary, R3), `outline` «Stop» while `busy` (R14) |
| `Suggestions`, `Suggestion` | A named group of buttons | `QUIET_CHIP` at the `sm` size, wrapping | Neutral, never the accent (R2); an icon only when it tells the kind of request (R6) |
| `Reasoning`, `ToolCall`, `ToolCallStatus` | `Disclosure` (Reasoning) and Base UI `Collapsible` (ToolCall). A reasoning follows `busy` until the reader toggles it. A tool's call is a button only when it has `input` or `output` | Reasoning: the disclosure row («Thinking», «Thought for 4 s») over soft text behind a hairline. ToolCall: the chevron's slot (empty when it does not open), the state's icon, the name, a muted summary; strings in a quiet block that wraps | The state is said three ways (icon, colour, a word for screen readers), as the tones of a `Note`. No spinner while running: the bolt, still |
| `SwipeDeck`, `SwipeDirection` | No library part: pointer events with capture on the top card (`touch-action: pan-y`, so the page still scrolls), the arrows with the card in focus, and two buttons. Controlled: the app takes the decided card out. A polite status says how many are left, after a decision. `SWIPE_DISTANCE_PX`, `SWIPE_FLICK` | A raised card (l3, sm elevation, no border: R4), the next one under it, still; two `outline` buttons under the deck. Dragged past the mark, the word of the side shows on the card | The drag is drawn at once (it is the gesture); the throw (`throwCard`, 200ms, accelerating) only with motion on. No stack that zooms, no colour wash, no stamps |
| `EmailComposer`, `EmailDraft` (`./rich-text`) | A `<form>` of the toolkit's own fields: `ChipsInput` for the addresses (comma, semicolon, blank or Enter close one; one that is not an address is marked, not refused), `Input` for the subject, `RichTextField` for the text. Controlled: the app holds the draft and sends it. Ctrl+Enter sends. A draft that cannot go is not sent: an alert says why and the focus goes to «To» | Rows with their name at the start (64px, muted), 8px apart; «Cc, Bcc» a ghost button at the end of the «To» row; the buttons at the foot: the app's tools at the start, «Discard» ghost and «Send» solid at the end | One solid button (R3). No close button, no window of its own: the app puts it in a `Dialog`, a `Sheet` or a region. While sending the button waits in its place, with no spinner |

Extended: `ChipsInput` takes `suggestions` (and `onQuery`): a list under the box, on Ark's Combobox sharing the text
box with the TagsInput. `Sheet` takes `modal={false}`: a panel beside the page, with no backdrop. `Tooltip` takes
`shortcut`, plain text after the name (R5). `DateField` and `DateTimeField` take `min`, `max`, `disabled`, `locale`
and `words`.

Words (owner, 2026-11-21: «il contenuto dei componenti lo imposta l'app, mica sigrid»; the toolkit has at most
placeholders, and lets an app make them multilingual): every word a component says by itself is in `src/words.tsx`
(`DEFAULT_WORDS`, English placeholders, about seventy in twelve groups) and an app replaces them with
`WordsProvider`, all or some. Before, they were written in the components.

Also added: the status colours `success`, `warning` and `highlight` (`theme-engine.ts` `STATUS`). `Select` takes
`aria-describedby` and `aria-invalid`, so it sits in a `FormField`. An app's own icon meanings were added here too, and
left on 2026-11-23 with the packs (below).

Icons (the owner, 2026-11-23: «Sigrid deve avere un suo unico icon set»): one set, Lucide, the same in every app.
`Icon` draws Sigrid's names (`ICON_NAMES`) with Lucide's drawings; an app's own icon is its mark, never an icon of its
interface. The other five packs (Phosphor Duotone, Solar Duotone, Fluent Color, Fluent Emoji Flat, Twemoji), the
user's choice of a pack (`IconPackChoice`, `ICON_PACKS`, `IconPack`, `DEFAULT_ICON_PACK`, `isIconPack`) and
`IconPackProvider` with an app's own icons are gone, with `@fluentui/react-icons` and the drawings of the four drawn
packs. An icon a function needs that is not among the names is added to Sigrid's names, never by an app.

## Added on 2026-11-23: parts that rest on a library of their own

Four parts whose behaviour is hard to get right by hand and already exists, well kept, under the MIT licence. Each is
in its own entry of the package, so an app that does not use it does not load its library; the versions are pinned
(`THIRD_PARTY.md`, `test/provenance.test.ts`). The form, the words (`src/words.tsx`) and the rules are the toolkit's.

| Component | Entry | Behaviour | Form | Rules |
|---|---|---|---|---|
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | `./primitives` | The browser's own table; `current` on a row is `aria-current` | 12px medium headings in muted ink, 14px cells, one line between rows, the density's row height; `align="end"` sets numbers at the end in tabular figures; `sticky` keeps the headings in sight | R1: the chosen row has the selection tint, stronger text and the short accent bar on its first cell. R4: lines, no shadow |
| `DataTable` | `./table` | TanStack Table (sorting) and TanStack Virtual (rows in sight). A heading with a `sortValue` is a button: up, down, as given; `aria-sort` says which. Rows without a value stay last. With `onRowPress` the rows are one Tab stop, the arrows, Home and End move among them, Enter and Space press. With `virtual`: spacer rows, `aria-rowcount`, `aria-rowindex` | The `Table` parts; an arrow of 14px beside the heading sorted by, whose room is kept when hidden | Texts sort by the user's language, with the numbers inside them as numbers. No rows: the app's sentence, or the toolkit's word |
| `VirtualList` | `./virtual` | TanStack Virtual. Draws the rows in sight and a few beyond; measures one row and takes the rest to be as tall; the room of the others is padding. `aria-setsize` and `aria-posinset` on every row | The rows are the app's (`ItemRow`): the same gap as `ItemList` | The box needs a height |
| `ReorderList`, `moveItem` | `./reorder` | dnd-kit. The handle alone drags (pointer after 4px, a finger, Space and the arrows); Escape puts the row back; each step is announced in the app's words; `onReorder` gives the new order | A 28px handle (44px with a finger) of six dots in muted ink; the row taken is on the raised surface with the `float` elevation | R4: the row taken has a shadow and no border. Motion: the others slide in 200ms only with `animated`, never with reduced motion |
| `RichTextField` | `./rich-text` | TipTap on ProseMirror, with the starter kit cut down to what the buttons offer: bold, italic, underline, two lists, a quote, undo, redo. Headings, code, links, rules and strike are off, so a paste brings them in as plain text. The value is HTML. In a `FormField` it takes its name from the label, which also gives it the focus | The border and focus ring of a field; the toolkit's `Toolbar` (small) above the text, with Sigrid's icons; 16px text below 860px, 14px above | R6: Sigrid's icons. A button that is on has the selection tint. Disabled: no buttons, half opacity |

| `GraphCanvas`, `visibleGraph`, `layoutGraph` | `./graph`, `./graph.css` | React Flow (canvas, pan and zoom, lines, joining by hand, small map; only what is in the view is drawn) and dagre (places, by ranks, when the app gives none). The app's places, all or nothing: with an `x` and a `y` on every thing, in both modes, the things are drawn there at their `width` and `height`, a line with `points` (two or more) follows that route, and nothing is laid out; when one has none (a thing just added) dagre places them all, at the sizes given, and no line follows a route. A new `layoutKey` fits the view once the new places are drawn; a draw on the same key keeps the view, and a change of the box's size keeps one the user moved (the chosen thing still in it) and fits again one nobody moved; without it the view is fitted at the first paint and at every change of size. Things open and close; the chosen one and what is joined to it stay, the rest is dimmed; a field finds a thing and opens what hides it. `editable`: add under, join, take away, each through `onChange`. `selected` is one id or several (an app's thing drawn in several places): each tinted, the first in the order the one choice (the Tab stop, the only one `aria-selected` or `aria-current`, the only plus; never `aria-multiselectable`), the others described as chosen with it (`graph.chosenToo`), `onSelect` still one. `external`: the word «external» after the name (`graph.external`), also in the name (never the icon `external`, which is a press that leaves the app). In the graph mode `hiddenCount` (above 0), how many the app keeps inside: the count at the end and in the name (`graph.hides`); the tree mode counts its own. Lines of kind `child` (the mode's own line) or `link` (no effect on the tree or the ranks, drawn while both ends are in sight), with words, a dash, a tone and an arrowhead; a thing's `link` lines are in its description; `labelShown: 'chosen'` draws a line's words only while one of its ends is chosen or has the focus, or while the line is the path's. An edge with an `id` is always a line of its own: two between the same things are two, each with its words, and `editable` takes away that edge alone; one without is named by its two ends and a number for a second that differs, and its exact copies (ends, `kind`, `label`, `labelShown`, `style`, `tone`, `directed`, no `points`) are one line, said once and taken away together. Without routes, two lines or more between the same things are drawn side by side (the line type `apart`). `steps` numbers a path: tint, numbers (also in the thing's name), one line between two of its things (the first in the order of the edges) in the accent or in its own tone, the rest dimmed, what hides it opens. The view is fitted at the first paint, at every change of size, with the button and the key, never under `minFitZoom` (0.8; `0` shows a whole map first), its edges never across a thing; a `ref` gives `focus`, `fit`, `zoomTo`. With a `layoutKey` and a thing chosen, a change of the box's size never fits again (the view stays, the chosen thing kept in it). `GraphNode.image`: a picture of the thing (a logo, the app's own SVG or PNG; the toolkit's `Logo`) in the icon's 16px, whole, decorative, the `icon` in its place while it loads and when it fails; content, not an interface icon (those stay Sigrid's set). `GraphEdge.path`: when any edge has it, those lines alone are the path's and the others are dimmed. A thing with more than two steps shows the first and «+N» (`graph.moreSteps`). Groups opened in place (graph mode): `open: true` is a frame (title, count, a button «Close Orders», a line and a quiet fill, under things and lines; a `group` owning its things through `aria-owns`, named `graph.holds`), `open: false` a thing with a button «Open Orders», both asking `onToggle`; a node's `group` puts it in an open group (React Flow's `parentId`), its `x` and `y` from the group's corner; without places dagre lays each group out, the innermost first. `movable`: a drag after 4px, or Alt and an arrow (16px), the place kept until `layoutKey` changes or «Reset the layout» (among the view's buttons only while something was moved), `onMove`. `animated` or `MotionProvider`: after a gesture that changes the places (the canvas's own, or a press or a key in it that a new `layoutKey` follows within a second) the things glide in 200ms, the lines hidden meanwhile, and the view goes where a gesture sends it; a layout the app pushes by itself jumps; never with reduced motion, at the first paint or during a drag. An arrow towards a thing not drawn moves the view to it and it takes the focus; a thing in the view stands in for a Tab stop that is out of it, by its tabindex alone; the focus of a thing that leaves goes to the Tab stop. In the tree mode (the default) the keyboard and the roles are a tree's: one Tab stop, Down, Up, Right, Left, Home, End, Enter. `model="graph"`: nothing closes and every thing is in sight; the arrows follow a thing's first line out or in along the ranks and go through the order given across them, Home, End, Enter; the arrows, Home and End also from a thing's ›; only a thing with an `openLabel` (the name of its › and of the action) opens, by a double press or its ›, which call `onOpen(id)` once (no `onOpen` or no `openLabel`, no ›), and the › of the Tab stop is the next Tab stop; the box is a `group` named by the app with `aria-roledescription` «graph» (`graph.roleDescription`; React Flow's own box inside it is always an `application`), the things buttons named by their name and second line, described by where their lines lead and come from (`graph.leadsTo`, `graph.comesFrom`), the chosen one `aria-current`; with `editable` the plus adds after the chosen thing, the first of several (`graph.addAfter`). In both modes + (or =), − and 0 zoom in, out and fit. The box is 384px tall, or with `fill` as tall as the region that holds it, what the other parts of a `Page fit` body or a `Column fill` leave, giving way with it and never under 224px, 232px with a finger (the field and the small map whole) | A thing is a raised surface of the app's `width` and `height`, or 208px wide, 44px tall or 56px with a second line; a line with a route is straight pieces through its points, the others go from side to side; lines in the muted ink, those of the chosen thing in the soft ink; a `link` dashed (6 4) or dotted (round dots every 4px, 2px), in the accent (2px), the warning or the destructive colour, words of 12px in the soft ink on the canvas's ground; two lines or more between the same things without routes side by side, 20px apart (from three on, within 16px of the middle of the sides), each bending at its own place; the line of the path 2px, in the accent or its own tone; «external» in 12px (`text-2xs`) muted ink after the name, on the tint as the second line, cut before the name, which keeps 64px; in the graph mode the count of what a thing hides at its end, as the tree's; a step is a 20px round dot on the raised ground with its number in the accent; the buttons of the view and the small map are raised surfaces; in the graph mode the › and the plus are 24px ghost buttons at the end of the thing (the › in the muted ink), 44px with a coarse pointer, each with a tooltip | R1: selection tint and stronger text on each chosen thing, the tint alone on the things of the path. R2: the accent on the path's lines (one between two of its things; a line's own warning or destructive tone is kept) and numbers. R4: shadow, no border (an external thing says so in words). R10: a thing's colour is an 8px dot. Meaning never by colour alone: a line's kind is its dash and its words. No motion: the layout and the view jump. The library's name stays at the foot (its makers ask it) as plain 12px text |
| `GraphLegend`, `GraphLegendEntry` | `./graph`, `./graph.css` | None from a library: a `ul` (`Cluster as="ul"`, so `role="list"`), named by the app (`aria-label`), one `li` per entry in the order given; an entry is `{ style, tone, label, count }`, `style` and `tone` typed as a `GraphEdge` takes them; no entries, nothing drawn. The sample is an SVG hidden from screen readers; the word and the count are read, a space between them, the count with the entry's word as its `label` («12 calls»). One definition for the key and the canvas: `src/assemblies/graph-lines.ts` (`lineLook`, `lineVars`) gives the colour, width, dash and ends of each style and tone (and of a line of the chosen thing or of the path), carried as four custom properties (`--sigrid-line-stroke`, `-width`, `-dash`, `-cap`) on each line of the canvas and each sample, and one rule of `graph.css` draws both, each property falling back on the default line (solid, 1px, the muted ink); `lineVars` gives one object for one look, so a memoised line whose look is the same is not drawn again. A line of the canvas has no class for its look, only `sigrid-graph-dim` when it is dimmed | A row that wraps (12px between entries); an entry is a 24 by 8px sample of the line, then its word in 12px (`text-2xs`) soft ink, then its `Count`; the sample's ends are kept 2px in, so a dot of a dotted line is not cut | R5: a count is a `Count` (zero shows nothing). Meaning never by colour alone: each kind of line has its word, and its dash. R2: the accent only on the line the app draws in it. It keys the lines only, not the things (2026-11-24) |

Cost, measured on the production build of the showcase: a table of ten thousand rows scrolls with about 1.3 ms of
script a frame and sorts by a text column in about 30 ms; a key in the rich text costs about 1.3 ms; nothing runs
while nothing happens. With the processor four times slower the scroll stays under 7 ms a frame.

## Added on 2026-11-23: heights that are the host's, and controls that do not move

The owner's words of 2026-11-23: the toolkit, not the app, adapts a screen to its height and to a phone lying down,
and «between one page and the next the main or cross-page controls must never change position, above all on
mobile». After what an app had written by hand and checked in headless Chrome with touch emulation (411x741, 360x640,
320x568, the keyboard open at 441px, the text at 130% and 160%: the document never scrolled).

| Part | Behaviour | Form | Rules |
|---|---|---|---|
| `useAppHeight`, `APP_HEIGHT_VAR` | Writes `--app-height` on the root in px: `visualViewport.height` times its `scale`, or the window's height where there is none; again on its `resize` and `scroll` and the window's `resize` and `orientationchange`, one write a frame; the property goes when the last part that runs it stops. Nothing on a server | A token: `100dvh` until measured | Never `100vh`, which is taller than the screen while the address bar shows |
| `AppShell` (heights) | Runs `useAppHeight`; is as tall as `--app-height`, never taller than its box (`max-h-full`). Where it is as tall as what is seen it is the whole screen (`data-screen`): it pads its edges with the device's insets and writes what it keeps at its foot (actions, footer, `bottomBar`) to `--bottom-bar-room` (taken off when it goes). A frame in a box of the app's does neither | Insets `--safe-area-inset-top`, `-left`, `-right`; the bottom bar, or the foot without one, `--safe-area-max-inset-bottom`; under 500px of height (`short:`) the bottom bar is 44px and a stacked view puts its word beside its icon | The live `env(safe-area-inset-bottom)` sizes nothing: from Chrome 135 it changes while the page scrolls |
| `Page fit` (with `header`, `footer`) | As tall as the frame's content, or `--fit-height` outside a frame; the head and the foot keep their height, the body gives way (`min-h-0 flex-1 overflow-y-auto overscroll-contain`); `data-fit` stops the document's overscroll (theme.css) | The margins of `Page`, the same with or without `fit` | The document never scrolls: the body does. Failure modes in `docs/mobile.md` |
| `ToolbarButton absent`, `ToolbarSearch absent` | The tool is an empty box of its own size, the same classes and content, invisible, `inert`, hidden from screen readers and out of the toolbar's arrows | As the tool | A tool a view lacks keeps its place; the others do not move |
| Steady labels (`ToggleGroupItem`, `TabsTrigger`, `ToolbarTab`) | A text label carries its own text again, semibold, in an `::after` with no height or visibility, so it is as wide chosen (semibold) as not (medium) | No change | A two-state switch stays where it is in both states; before, the chosen one was a few px wider and the items beside it moved |

## Exported parts the inventory lacked (rows added 2026-11-23)

Parts the package exports that had no row above, written from their source as it is.

| Component | Behaviour | Form | Rules |
|---|---|---|---|
| `Panel` | A `<section>` named by its title (`aria-labelledby`), so a screen reader can jump to it; the heading is `h2`, or `h3` with `level={3}`. Every part but the title is optional: `subtitle`, `actions`, `tools`, `footer`. The body alone scrolls | Paints nothing: it lies on the surface of the region that holds it. A header of the row's height with the title (14px semibold), the subtitle (12px muted, cut) and the actions at its end; the tools in a row under it; the foot with a line above it, its actions at the end | R4: one line, above the foot, no shadow. The inner layout of a region after Imago's `im-panel` and Xiox's list |
| `ThemeGallery` | A `radiogroup` named by `label`, one `radio` per theme; the arrows move and choose (`radioArrows`), Tab enters on the chosen one; an optional last tile (`custom`) stands for a theme of the user's own, chosen when `selected` is null, its editor the caller's | Tiles two per row, three from 22rem: each draws its theme in the scheme and tone given (the name on the theme's primary, a small page with a sidebar, two rows and a button); l3 corners, a line border; the chosen tile has the primary border and ring and a round check mark | R2: the accent marks the chosen tile. The choice is not shown by the border alone (the mark) |
| `ColorMatch` | Two `radiogroup`s, each named by its words: the theme colour (the app's colours, and one of the user's own through the system's colour field) and the spot colour (the three proposals of `spotSuggestions`, from quiet to loud, none, or one of the user's own). The arrows move and choose. A sample below, hidden from screen readers, is drawn with the theme the two colours make (`colorTheme`) | Colour dots of 24px (44px with a finger), the chosen one with a 2px ring in the ink; the user's own is dashed until chosen; the proposals are outline chips with a 16px dot | R10: the colour picker is the approved exception, where the colour is the content. Every word is the app's (`text`) |
| `FileDrop` | Ark `FileUpload` for the picker (a real button and the input behind it, emptied before each choice) and the checks of type, size and count; the drop is the toolkit's `useDropTarget`, so dragging is never the only way (WCAG 2.5.7). `onFiles` gets what passes, `onRefuse` what does not, with its reason; a dropped text or link is refused as a `type`. `busy`: its line takes the label's place and is announced, the button keeps its focus and takes nothing. `error` is under the zone, announced at once | Park `file-upload`: the raised surface, l3 corners, a 2px dashed border in the `input` colour, solid in `ink` (not the accent, R2) and on `paper-2` while a file is over it, destructive with an error; two lines (14px medium, 12px soft), 96px tall at least; no icon | R6: no upload icon, the words say it. No animation. Every word is the app's |
| `DateRangeField`, `rangePicks` | A `DateField` for two ends (Ark `DatePicker`): a click chooses the first day, a second the last and closes, in either order, on the same day for a range of one day; the days between take the selection tint. `onChange` hears of a range only when it has both ends; a value whose ends are not dates or are the wrong way round reads as null. Quick choices above the calendar (`rangePicks()`: this weekend, the next seven days) | The `DateField`'s button and card; the range written with the locale's `formatRange` («November 20 – 24, 2026») | R1: the selection tint on the days of the range. The empty button says `words.date.noRange` |
| `MotionProvider`, `loadMotion`, `preloadMotion`, `useMotion` | Turns motion on for a subtree and its portals (`animated`); a control's own `animated` overrides it. While one provider is on, the root carries `data-motion`, and theme.css eases the state changes of the controls under it where the system allows motion. Motion is a chunk of its own, loaded the first time it is needed; a failed load resolves `null` and is tried again | none | Motion only after a gesture, under 250ms, off by default, never with reduced motion (DESIGN.md Motion). Everything works with it off |
| `NeedThumbnail` | Asks for a thumbnail once per mounted row: when `when` turns true it calls `onNeed(id)`, then never again for that id, even if the value stays null (no loop) | Draws nothing | none |
| `ChoiceGroup` | A choice's heading (`h3`, or `h4` with `level={4}`) with an optional `id` that names its options, and its hint | 14px semibold heading (level 4: medium, soft ink); the hint 12px muted, no wider than a line of prose | R13: a settings section is made of these |
| `ChoiceCards`, `ChoiceCard` | A `radiogroup` named by `labelledBy`; each card a `radio` (`aria-checked`, Tab on the chosen one); the arrows move and choose (`radioArrows`). With motion on, the chosen border slides from card to card | Cards two per row, three from `sm` (or two with `columns={2}`): the raised surface with a line border, l3 corners, an optional preview, a 14px medium name and a 12px muted note; the chosen card has the primary border and ring and a check; 44px at least with a finger | R2: the accent marks the chosen card. The choice is not shown by the border alone (the check) |
| `ChoicePreview`, `PaletteStrip`, `TonePreview` | Hidden from screen readers. `PaletteStrip` and `TonePreview` draw again only when what they show changes | `ChoicePreview`: a 56px frame with l2 corners and a line border on the page. `PaletteStrip`: five bands of a pick (page, sidebar, selection, accent, the filled button). `TonePreview`: the sidebar's tint and selected row, three data colours as dots and the filled button | R10: the data colours are dots. A palette, not a miniature of the app (the owner, 2026-11-20) |
| `BaseColorChoice` | A `ChoiceGroup` with a `radiogroup`: the theme's own colours (no palette), each of the ready `COLORS` (named by `words.colors.names`), and any colour from the system's colour field. A colour makes the palette (`palette.ts`), keeping the combination chosen; `seed` is where a new palette starts | A pill for the theme's own colours, colour dots of the `xs` control size (44px with a finger), the chosen dot with a 2px ring in the ink; the colour field a control-sized square with its label | R10: the colour picker is the approved exception, where the colour is the content |
| `PaletteComboChoice` | `ChoiceCards` of the three combinations (`PALETTE_COMBOS`: clean, bold, soft); a card keeps the base colour and sets the combination | Each card's preview is the `PaletteStrip` that combination makes from the base colour | R11 and R13: few choices, each shown by what it does |
| `TonePresetChoice` | `ChoiceCards` of the three tones (`TONE_PRESETS`: calm, balanced, vivid) on the colours in use. With `text.noEffect`, when the tone changes nothing (`toneHasEffect`), the hint says so and no card is drawn | Each card's preview is a `TonePreview` | R11: the tones read apart at a glance; a choice that changes nothing is not offered |
| `ThemeCatalogChoice` | A `radiogroup` of the app's ready-made themes; `chosen` is the theme on the page, or null when a palette from a base colour replaces it (then none is chosen and Tab enters on the first) | Cards two per row, three from `sm`, five from `lg`: the theme's `PaletteStrip` in the scheme shown, its name and the app's note, the check on the chosen one; the raised surface, a line border, l3 corners | R13: the finer choice, for the app's Advanced fold |
| `DensityChoice` | `ChoiceCards` of the densities the app offers (`DENSITIES` or its own); `chosen` is the id on the page, the app applies the one picked (`applyDensity`). A density without words of the app's shows its own label | Each card draws three rows of a list at a quarter of their size: the row's height and the room between two | R7: the densities are the scale's own |

## Added on 2026-11-23: what the examples needed to write no class

The owner's rule of 2026-11-23 (`AGENTS.md`, «One look for every app»): an app writes no class of its own. The examples
agents start from broke it: the apps written by the editor's export (`agents/examples`) carried 123 classes, and the
four example apps of the showcase drew their stacks, their words, their cards and their dots by hand. What a function
had no part for was added here, generic; what a part already did was used. Each takes no class and no style of the
app's, and is in the gallery (Components, «Card, Heading, Dot, …»).

| Part or prop | Behaviour | Form | Rules | Needed by |
|---|---|---|---|---|
| `Card` (`variant`, `pad`, `gap`, `as`) | A group of content on a surface of its own; its inside is a pile | `raised`: the raised surface, `shadow-xs`; `quiet`: the quiet fill (`bg-paper-2`); the large corner; 16px inside and 12px between by default | R4: a shadow or a fill, never a border. Not for every group («Lines and space, not boxes») | Ethel (the Now strip, the Sort card, the areas), Qamille (the essentials), the editor (Card, the lanes and cards of Board) |
| `Heading` (`size`, `level`, `icon`) | The title of a page, a section, a card, a small title, or the label over a group; the level is the outline's, apart from the size | 24, 20, 18, 16px semibold in the ink; the label 12px medium muted; the icon in a muted 16px slot | R7: the type scale of DESIGN.md (title-lg, title-md, title-sm, headline-md, label-sm) | The editor (Heading), Ethel, Qamille |
| `Dot` (`color`, `tone`) | A colour of the palette in the theme's shade of it (`markHueAttrs`), or the colour of a state; hidden from screen readers | 8px, round | R10: a colour a person chose is an 8px dot. Never alone: the word beside it says the fact | Ethel, Qamille (projects, labels, accounts), Shinatama (the state of the resources); the copy in the showcase's hosts is gone |
| `Separator` (`decorative`) | A horizontal rule between two groups | A hairline in the divider's colour, no room of its own | «Lines and space, not boxes»: after space, a hairline | The editor (Line), Qamille (above the attachment) |
| `DescriptionList` (`items`: `name`, `value`, `code`) | A `<dl>`: each name read with its value; a fact left out with `null` | Two columns, the names muted, 16px apart, 8px between facts; a value that is code in the monospace face, broken anywhere | Colours from the tokens | Xiox (the facts of the item in the inspector) |
| `SettingRow` (`label`, `description`, `control`, `onClick`) | A choice of a settings page: the name at the start, the control at the end; with `onClick` and no control the row is a button that opens more | 48px at least (44px with a finger), a hairline under it, a chevron at the end of a row that opens more | docs/patterns.md «Sidebar and page»: a choice takes effect at once | The editor (Setting row), the phone guide |
| `SidebarRow` (`leading`, `end`) | A line of the sidebar's head or foot that is not a place: the account, a switch of the view, the name of the list with its actions | The rows' padding (`--row-pad`) and height, the sidebar's ink, the words cut with an ellipsis | R14: the foot of the sidebar is the same on every page | Ethel (the account), Shinatama (the head with its actions, the foot with its check box), the editor (Account), the gallery |
| `DrawerButton` (`onOpen`, `label`) | In the bar only where the frame made the sidebar a drawer (`useAppShell().sidebar === 'drawer'`) | A `ToolbarButton`, Sigrid's `sidebarOpen` icon, its name as a hint (`words.sidebar.open`) | docs/patterns.md: the button only where the sidebar is a drawer | Ethel, Qamille, the editor's Menu button, the gallery's patterns, the phone guide (it was written five times) |
| `Empty fill` | The whole of a view with nothing to show | As tall as its region, centred, 24px margins | No illustration (unchanged) | Ethel, Qamille, Shinatama, the editor (Empty state) |
| `ToggleGroup fill`; as wide as its items by default | With `fill` the group is as wide as its place and its items share it; without, it never stretches in a pile | `w-full` and items `flex-1` with 8px sides; else `w-fit` | R14: the two halves of a switch are equal, so neither grows when pressed | Ethel (Dump/Sort, When, Priority on a phone), the editor (Segment control) |
| `Progress inline` | A bar in a line of words: it does not give way | 192px | docs/patterns.md «Progress of a task»: a `Progress` of a fixed width in the status row | Xiox, the editor (Job) |
| `Checkbox label` | The box and its words in one `<label>`: a press on the words checks it, the words name it | Gap 8px, the height of the smallest control (44px with a finger), the text of what is around it | As the checkbox | Ethel (subtasks), the editor (Check box) |
| `Column width`, `Cluster wrap`, `Text` `soft`, `strong`, `note` | A pile kept to a column of text (`prose`) or of content (`page`, 768px), centred; a row kept on one line; the soft ink of running text, the medium weight of the words that carry a line, the 13px muted note beside a title | Tokens only | R7 | The editor (the body of a screen, Person, Text), the four apps |
| `CommandsProvider keysIn` | The keys of an app that is one part of a page run only while the focus is inside the place named | No form | One key, one action: four examples on one page do not all answer it | The four example apps, with `KeyHints` in their foot |
| Icon `back` | Sigrid's name for the way back (a chevron to the start) | Lucide's `ChevronLeft` | R6: an icon a function needs is added to Sigrid's names | Ethel, Qamille (the way back to the list on a phone) |
| `ItemRow control`, `controlSide`, `facts`, `wrapTitle` | A thing one both ticks and opens: one control beside the row's button, at its start or end. The control and the row are two tab stops with their own names; a press on the control never opens the row. `facts`: short facts under the title (a dot for a person's colour, `accent` for today, `strong` for a priority); `wrapTitle`: two lines before the cut | The list item is the row: its tint, its ink and the accent bar when chosen (`aria-current` on the button), the hover, 44px with a finger; the button keeps the 12px between the control and the words. Facts 13px, 8px apart, wrapping | R1, R2 (today in the accent, not on the chosen row), R10 (the dot) | Ethel (a task and its box; it drew the row by hand, 9 classes); Xiox's table does the same in a cell |
| `ContentSplit` (`aside`, `asideLabel`, `width`, `show`, `step`, `onPanesChange`) | Two panes in the content: a column with the list, the thing chosen in the room left (the inspector is for details, in 300px). It measures its own width; under `step` (twice the column by default) one pane shows, the one `show` names, and the other stays in the page, hidden; the app hears of the form and puts its way back in the bar | The column `sm` 240, `md` 320, `lg` 360px, a hairline at its inner edge, each pane scrolling by itself; the column is a region named `asideLabel` | R4: a line, not a box. docs/patterns.md «List and detail» | Qamille (the messages beside the message, 3 classes), Shinatama (the tree beside the file) |
| `VirtualList fill`, `pad` | A long list as tall as the region that holds it (as `Empty fill`, `Page fit`), or in a `Column fill` as what its other parts leave; `pad` the room around the rows | `h-full` and `flex-1`, the box scrolls; `pad` a step of the scale | Tokens only | Qamille (a folder of the Archive, 2 classes) |
| `GraphCanvas fill` | A canvas as tall as the region that holds it (the content, a pane), or in a `Page fit` body or a `Column fill` as what the other parts leave; it gives way with it and the view is fitted again. In a plain `Column` (or a `Page` that does not fit), which has no height to give, it is its floor and no more: `Column fill` or a `Page fit` body is what gives it the rest. Without it the box is 384px | `h-full`, `w-full` and `flex-1`; never under a control and 188px (224px, 232px with a finger, with the density): the field (15px from the head) and 8px under it the small map (150px, 15px from the foot) whole; in less the region scrolls | Tokens only | An app that maps code: the canvas under its filters, over its key (2026-11-24) |
| `Column fill` | A pile as tall as the region that holds it, so that a part that fills (`GraphCanvas`, `VirtualList`, `Empty`, a `Column`) takes the height its other parts leave. With a `GraphCanvas` that fills in it, it is never shorter than what its parts need: the region scrolls, the canvas covers nothing that follows the pile and the padding at its foot stays (not beside a part that scrolls by itself, a list, a tree, a split, a panel, a scroll area: that one gives way as ever). Without it a pile is as tall as its parts and has no height to give | `h-full`, `min-h-0`, `flex-1`; with a canvas `min-h-min`; a field that is a part of it keeps its height | Tokens only | The same app; before it only the body of a `Page fit` gave what was left, with a page's margins and width (2026-11-24) |
| Icons `code`, `branch`, `package`, `layers`, `graph`, `gateway`, `device`, `key`, `globe`, `external` | Sigrid's names for the parts of a project and of a system, and for a press that leaves the app. `globe` says what a thing is (the web, a site, a browser), `external` what a press does (a page opened outside the app); a thing outside what a graph is about says the word «external» (`GraphNode.external`), beside whatever icon it has. Not `structure` (what holds what), `service` (what answers), `account` (the person), `data`, `archive` nor `link` (the address) | Lucide's `CodeXml`, `GitBranch`, `Package`, `Layers`, `Waypoints`, `Router`, `MonitorSmartphone`, `Key`, `Globe`, `ExternalLink` | R6: an icon a function needs is added to Sigrid's names; no drawing has two of these meanings | The same app (2026-11-24) |
| `SheetContent width` | The widest a sheet at the side grows: `sm` (the default), `md`, `lg`; at the top or the foot it is as wide as the window | 384, 448, 512px from the `sm` width of the window; three quarters of it under | R7: steps of the scale, named with the toolkit's words for a size | Qamille (the composer beside the mail, 1 class) |

## Added on 2026-11-24: four looks a theme asks for by name

The owner approved them on 2026-11-24 for a shell that stands on Sigrid. Each is off unless a theme asks: with none
asked, no colour, class, attribute or measure of the toolkit changes, and an app that does not ask keeps the rule as it
is written. `test/theme-hooks.test.tsx` holds each one and measures the contrast of the preset they were approved for.

| Hook | What a theme writes | What changes, and only then | Rule it is an exception to |
|---|---|---|---|
| H1 Boxed keys | `ThemeDef.keys: 'boxed'` (the default is `plain`); the engine writes `data-keys="boxed"` on the root, `copyTheme` carries it | `Kbd` and each key of a `Shortcut`: a cap 20px tall and at least 20px wide, a 1px `line` hairline, l1 corners, 4px at the sides, 12px medium in the monospace face, the muted ink. In a button: the label's colour, the hairline at 35% of it. Hidden on a phone as before. The hairline is decoration (under 3:1): the key is read by its letter | R5, the must-avoid «Key hints drawn as boxes», the law «Keys as words» |
| H2 Badge tone | `Badge tone="success" \| "warning" \| "danger" \| "info"` (no tone by default), and the tokens `info` and `info-soft` in both schemes (`STATUS`) | The badge is the status text colour on its soft ground (`success`, `warning`, `destructive`, `info` on their `-soft`), with a 6px dot before the word, in the same colour. Each word holds 4.5:1 on its ground in every theme | None: a status is a meaning with a word (R2 keeps the accent out of it; R10's 8px dots are the colours a person gave). The 6px dot is new |
| H3 Strong control borders | `ThemeDef.controls: 'strong'` (the default is `divider`); the engine writes `data-controls="strong"` on the root | Fields (`FIELD_SURFACE`: input, textarea, select, combo box, date, labels, input group, prompt, formatted text) and the outline button take `input` (3:1) in place of `line`. The rule sits in `:where()`, so the invalid red, the focus ring and every state win over it as they do over the divider. A field then has no step left under the pointer: its border is already `input` | The light divider on fields and outline buttons (the owner, 2026-11-22) |
| H4 Stated control border | `Surfaces.input` (`#rrggbb`) on a curated palette (absent by default) | The engine starts from that colour and moves it until it holds 3:1 on the page, the sidebar, the sheets **and the chosen row**. Without it the border is derived from the dividers and held on the page, the sidebar and the sheets only, as before: on a chosen row it can fall under 3:1 | None: it lets a palette reach a threshold the derived border misses |

## Off-scale values (with locations, before the polish pass)

| Value | Where |
|---|---|
| 44px height (fine pointer) | `button.tsx` sizes `lg`, `icon-lg` |
| 18px text (`text-lg`) | `dialog.tsx` DialogTitle; `Dialog.tsx` drawer title; `empty.tsx` title |
| 10px text | `kbd.tsx` Shortcut separator; `markdown.tsx` check mark |
| 3px radius | `markdown.tsx` check box |
| 6px vertical padding | `Toasts.tsx` notice root (`py-1.5`) |
| 12px / 20px icons | `badge.tsx`, `Attachments.tsx` (marks, upload), `ChipsInput.tsx` (remove), `empty.tsx`, `thumbnail.tsx` (sheet), `AttachmentViewer.tsx` (loader, alert) |
| 3px focus ring at 50% | 16 places (F01) |
| font weight 700 face | `styles/fonts.css` |

## Questions for the owner

- **Q1** Neutral names for the DOM hooks of the notices, which were named after one of the apps? Resolved on 2026-11-20: `data-toasts`, `--toasts-room` and `--bottom-bar-room` (F34).
- **Q2** The colour picker (`Swatches`): keep 24px filled swatches (a picker must show the colour), or 8px dots with a label, as R10 reads literally? Resolved on 2026-11-20: keep them, an approved exception to R10 (F11).
- **Q3** Should `Button` get a loading state (Park's `loading`: a spinner is a loop, so a static "Saving…" label)? Resolved on 2026-11-20: `loading` and `loadingText`, no spinner (F29).
- **Q4** Should `Select` take `disabled` and `invalid`? Resolved on 2026-11-20: yes, with Park's look (F30).
- **Q5** The default `--radius-check` (9999px: round boxes an app may give its own checkboxes): an exception to R7's round shapes, or square by default? Resolved on 2026-11-20: round boxes are an app's setting; the toolkit states its default and that an app may round its boxes (F40).
- **Q6** Touch targets: every control grows to 44px with a coarse pointer (a tested guarantee). Confirm this stays outside R7's 40/36/32. Resolved on 2026-11-20: an approved accessibility exception to R7 (F15).
- **Q7** Backdrops: the sheet dims the page less (30%) than the dialog (50%). One value for both? Resolved on 2026-11-20: one backdrop, the drop colour at 40%, for every overlay that dims (F27).

## Status after the review (2026-11-20)

The polish pass (Marionette step `design-review`) fixed F01 to F10, F12 to F14, F16 to F26, F28, F32 and F33, and
four more found on the way: the outline button's border below 3:1 (now the `input` border), the pressed duration
shortcut with no visible state (now the selection tint), the disabled radio label at 70% (now 50%), the open select
in the accent (now the ink). The drift inspection then found two differences, both corrected: the subtle fill
recorded as `surface-ground` in DESIGN.md (now `subtle-fill`) and the detached dialog's description in `ink-soft`
(now muted, as the other descriptions). Left as decided or open: F11 (Q2), F15 (Q6), F27 (Q7), F29 (Q3), F30 (Q4),
F31, F34 (Q1, fixed afterwards: see the table), F35 to F42 (approved), F43 (snapshot file, outside this review), the radio's `data-state`
(F23, deferred), and three new questions:

- **Q8** In the dark scheme the inverted toast is a light card (the ink of dark is light); the decision says "a dark
  inverted surface". Keep the inversion, or a dark toast in both schemes? Resolved on 2026-11-20: keep the inversion,
  "an inverted surface: dark in light mode, light in dark mode" (F39).
- **Q9** `SUBTLE_ACCENT` is neutral now (R2) and keeps its name for compatibility: rename it (an API change)? Resolved
  on 2026-11-20: renamed `QUIET_CHIP` in the toolkit and in its consumer (F06).
- **Q10** The hand font (Shantell Sans, `font-hand`) and the monospace font of inline code are not in DESIGN.md's
  typography: record them, or drop them from the toolkit? Resolved on 2026-11-20: the hand font was used nowhere and is
  gone (its files, `@font-face` and `--font-hand`); the monospace stack of inline code is a font role of DESIGN.md
  (`code-sm`, `--font-mono`), permitted by rule rather than by an exception.

## Recommended next steps

DESIGN.md records these tokens and the rules (step `design-file`); the polish pass fixes the defects above in severity
order (step `design-review`); the drift measurement compares the showcase's computed styles with DESIGN.md
(step `design-file-inspection`); code checks keep the rules (step `design-file-integration`).
