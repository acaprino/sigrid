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
- R7 radii 4/6/10 (2/4/6 when this inventory was made) (round only for avatars, dots, switches); 4px spacing grid; heights 36/32/28 (at normal density; 32/28/24 at compact, 40/36/32 at large; 40/36/32 at normal when this inventory was made: added after this inventory, `src/density.ts`); icons 16/14; weights 400/500/600; text sizes from tokens.
- R8 focus ring 2px in the accent-text colour, at least 3:1 in every theme, on every focusable control: on the border of a control that has one (fields, selects, outline buttons; since 2026-11-22), 2px away otherwise (2px away everywhere when this inventory was made).
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
| Headless (no form) | Collapsible, Field, PopoverPrimitive (Base UI re-exports) |

Behaviour: Ark UI carries Calendar/DateField/DateTimeField (DatePicker), ChipsInput (TagsInput), AttachmentsSection
(FileUpload) and Toasts (Toast); Base UI carries the other primitives. Form: Park UI recipes translated to Tailwind.

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
| F24 | Popover | Park parity | low | Width 288px (`w-72`; Park `xs` = 320px); title 14px medium (Park md 16px). | defect |
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
| F37 | Input, Textarea, DateField | Park parity | — | 14px text from 860px (Park md: 16px); 16px below 860px (iOS does not zoom). | approved (decision: Park native, md = 40px controls, 14px text) |
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
| Radii | Controls `rounded-md` (l2, 6px): Button, Input, Textarea, Select trigger, DateField, Badge, Kbd, menu items, select list, tooltip; `rounded-sm` (l1): Checkbox, select items, chip; `rounded-lg` (l3): menu, popover, toasts, date card, segment group and items, attachment tiles; Dialog `rounded-xl` (alias of l3) | Dialog names `xl` where the others name `lg` (same 6px) — F25 fixed with it |
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
- **Tokens**: `ink` (card), `paper` (text), `shadow-sm`, `radius-md`, `text-2xs` semibold, px 8 py 6, max 320px, z 45.
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
- **Parts**: `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent` (`side`, `showCloseButton`, `onCloseAutoFocus`, `animated`), `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`.
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

- A right sheet with a header (title, "Page n of m", zoom − / % / +, download) and a page column; states loading (spinner, F18), error (alert icon, F17), ready. Pages `shadow-sm` + `ring-1 ring-line` (F03). Ark/Park: Sheet's. **Do**: keep the zoom steps. **Don't**: animate the loading.

### Toasts

- **Purpose**: the result of an action, with undo and quick choices.
- **States**: entering, resting, held (pointer or focus: time suspended), leaving (inert), pushed out by a fourth; pressed quick choice (paper fill).
- **Tokens**: `ink` (card), `paper` (text), `shadow-lg`, `radius-lg`, `paper` at 15% (hover), at 40% (outline of choices, hint box F05), `text-sm`, timer `text-xs`.
- **Composition**: Ark `Toast` (Toaster group, root props, Title) + `Button` (ghost xs).
- **Accessibility**: region `role="status"`, `aria-relevant="additions"`, F6 reaches it; Esc does not close a notice; the timer is `aria-hidden`.
- **Ark parity**: real Ark; not used: description, actionTrigger, closeTrigger (own buttons, with the toolkit's form).
- **Park parity**: l3, lg shadow — same; colours inverted (F39 approved); padding 6px (F28).
- **Findings**: F01 (region ring), F05, F28, F34, F39.

### Empty

- Title (`text-lg` medium, F12), optional sentence (`text-sm ink-soft`), optional action, optional icon in a 48px circle (F12). No Ark/Park part (Park has no empty state recipe). **Do**: words first. **Don't**: an illustration or an icon tile.

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
| `Count` | none | 12px tabular figures in the muted ink | R5: never a pill; zero shows nothing (`reserve` keeps the room) |
| `NavList`, `NavItem` | `<nav>` with a list; a row is a button, or a link with `href`; `aria-current="page"` | A row of the density's height, l2, 14px | R1: the selection tint, no bar. R6: the icon slot stays when empty. `tone="sidebar"` uses the sidebar's own ink and selection |
| `Sidebar`, `SidebarGroup` | `<aside>` with a `<nav>` of named lists; below 860px a `Sheet` from the left; a group heading that opens is a button with `aria-expanded` | The sidebar surface and inks (`sidebar-*`), 256px wide, or one row wide as a rail | R1: the selection tint, no bar. R6: a heading has an icon slot. Shrunk to a rail a row keeps its name for screen readers and shows it as a hint. The search hides the rows that do not hold the text. Generic navigation, not an app's product sidebar (2026-11-22). |

| `Slider` | Ark `Slider`, one thumb; Up and Down act as Right and Left | Park `slider` md, outline: 8px track, 20px thumb with a 2px border | The track is the `input` colour (3:1), the range and the thumb's border the ink (R2), no shadow on the thumb (R4). 44px area with a coarse pointer |
| `SearchField` | A native `type="search"` input; a button empties it and gives it the focus back | The toolkit's `Input`, with a 16px magnifier and a 32px clear button | The browser's own clear button is hidden; the caller names the field |
| `Combobox` | Ark `Combobox`: typing filters, arrows move, Enter chooses, Esc closes the list first | Park `combobox` md: the input, and the select's list (l2, md elevation) | The chosen row carries a check in the ink (R2). The list stays inside the sheet that holds it (no portal) |
| `Avatar` | Ark `Avatar`: initials until the picture loads, and again if it fails | Park `avatar`, subtle, round: 40, 36 or 32px | A neutral fill for every person: a person's colour is a dot beside the name, never the fill (R10) |

Extended: `ChipsInput` takes `suggestions` (and `onQuery`): a list under the box, on Ark's Combobox sharing the text
box with the TagsInput. `Sheet` takes `modal={false}`: a panel beside the page, with no backdrop. `Tooltip` takes
`shortcut`, plain text after the name (R5). `DateField` and `DateTimeField` take `min`, `max`, `disabled`, `locale`
and `words`.

Words (owner, 2026-11-21: «il contenuto dei componenti lo imposta l'app, mica sigrid»; the toolkit has at most
placeholders, and lets an app make them multilingual): every word a component says by itself is in `src/words.tsx`
(`DEFAULT_WORDS`, English placeholders, about seventy in twelve groups) and an app replaces them with
`WordsProvider`, all or some. Before, they were written in the components.

Also added: an app's own icon meanings (`IconPackProvider`'s `icons`) and the status colours `success`, `warning` and
`highlight` (`theme-engine.ts` `STATUS`). `Select` takes `aria-describedby` and `aria-invalid`, so it sits in a
`FormField`.

## Off-scale values (with locations, before the polish pass)

| Value | Where |
|---|---|
| 44px height (fine pointer) | `button.tsx` sizes `lg`, `icon-lg` |
| 18px text (`text-lg`) | `dialog.tsx` DialogTitle; `Dialog.tsx` drawer title; `empty.tsx` title |
| 10px text | `kbd.tsx` Shortcut separator; `markdown.tsx` check mark |
| 3px radius | `markdown.tsx` check box |
| 6px vertical padding | `Toasts.tsx` notice root (`py-1.5`) |
| 12px / 20px icons | `badge.tsx`, `attachments.tsx` (marks, upload), `chips.tsx` (remove), `empty.tsx`, `thumbnail.tsx` (sheet), `attachment-viewer.tsx` (loader, alert) |
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
