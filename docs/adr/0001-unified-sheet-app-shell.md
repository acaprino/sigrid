# ADR-0001: Unified Sheet `AppShell` Composition & Document Tabs

- **Status:** Approved (2026-11-27)
- **Date:** 2026-11-27
- **Scope:** `@acaprino/sigrid` (`src/layout`, `src/primitives`, `src/styles`, `src/words`, `showcase/editor`, `showcase`, `docs`, `agents`)

---

## 1. Context & Intent

Sigrid currently provides `AppShell` (`src/layout/app-shell.tsx`) with two visual frames (`frame="line"` and `frame="sheet"`), both sharing a **stacked** top geometry: a full-width `TitleBar` above the `Sidebar` and work area (`app-shell-work`), with `ToolbarTabs` for fixed app views.

Document-centric apps (such as a notes or multi-document workspace) need a second, equally native desktop/web shell composition where:
1. The sidebar toggle (`[|]`) sits at top-start with a vertical divider (`|`), never shifting horizontally between expanded column and collapsed rail.
2. The app identity (brand mark + name) sits in the sidebar header cell on the **same top row** as the document tabs, with no separate full-width bar above them.
3. The active document tab fuses seamlessly into the elevated `bg-paper` work sheet below via a continuous `1px` border and concave bottom fillet.
4. Scrollable tabs expose an explicit overflow scroll control (`>`) in a fixed slot so desktop mouse users can advance without shifting the trailing add button.
5. A new-tab button (`+`) sits at the trailing end after a vertical divider, followed (in desktop/Tauri windows) by drag space and `WindowControls`.

At the same time, Sigrid must remain **composable** across both layouts (in consumer apps, the visual editor `showcase/editor/`, exported JSX, and showcase examples) while preserving:
- `AGENTS.md` ("One look for every app", zero custom app CSS / `own-class`),
- `DESIGN.md` (R1–R14, especially ADHD-first accent guidance R1/R2, border-or-shadow R4, Sigrid Icons / no emoji R6, radii scale R7, fixed shared controls R14),
- `docs/mobile.md` (thumb-first bottom navigation for 2–5 top-level views, no drawer on phone for this pattern, `44px` coarse touch targets, safe areas),
- `test/layers.test.ts` (strict layer ordering `primitives -> components -> layout -> assemblies`),
- `AppShell desktop` invariants (window dragging via `app-region: drag`, OS insets `--titlebar-start`/`--titlebar-end`, overlays confined below the top bar, `F6`/`Shift+F6` region cycling).

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Support both classic stacked-bar shells (`top="bar"`, default) and unified-top-row document shells (`top="unified"`, inside `frame="sheet"`) through a single `AppShell` component, with zero breaking changes to existing call sites.
- Provide a reusable `DocumentTabs` / `DocumentTab` layout assembly in `src/layout/` (built on `src/primitives/tabs.tsx`) that supports closable/addable tabs, explicit overflow scroll controls (`>` / `<`), keyboard focus management, and attached-sheet geometry.
- Keep responsive adaptation deterministic (`full -> rail -> drawer` at `850 / 620px`, `docked -> drawer` at `1000px`), supporting **no-drawer mobile** via `bottomBar` (`ToolbarTabs edge="top" layout="stacked"`) with full-width document tabs at the head.
- Carry the composition cleanly through `showcase/editor/` (`model.ts`, `catalog.ts`, `builder.tsx`, `render.tsx`, `codegen.ts`, `entries.ts`), `showcase/` layout patterns, `docs/patterns.md`, and `agents/examples/`.

### Non-Goals
- Replacing or deprecating `TitleBar` + `ToolbarTabs` (the stacked Xiox/Imago layout remains the default).
- Replacing `Workspace` (`src/assemblies/workspace.tsx`) split-pane tiling (though `Workspace` may later adopt `TabsList`'s overflow buttons).
- Building a Figma-style freeform CSS auto-layout editor (arbitrary padding/gap/flex controls in `builder.tsx`).
- Inferring `top="unified"` implicitly at runtime from filled slots (`tabs` + `sidebar`).

### Anti-Goals (Failure Conditions)
- **Control jumping (R14 violation):** sidebar toggle shifting horizontally between column and rail, or `+` shifting when `>` appears/disappears.
- **Broken Tauri desktop windowing:** dialogs/sheets covering window drag areas or `WindowControls`, or missing `app-region: drag` / `--titlebar-start` macOS traffic-light clearance.
- **Layer violation:** `src/layout/` importing from `src/assemblies/` (must fail `test/layers.test.ts`).
- **Token drift:** hardcoded off-scale radii (e.g. hardcoded `12px`), hardcoded colors, emojis in UI, or custom CSS classes in exported editor code (`sigrid-check` with `own-class`).
- **Mixed mobile navigation:** showing both a drawer and a `bottomBar` listing the same places, or using a modal `Sheet` as primary mobile navigation.

---

## 3. Approaches Considered

| Approach | Summary | Trade-offs | Decision |
|---|---|---|---|
| **1. Explicit `top="bar" \| "unified"` on `AppShell` + `DocumentTabs` in `src/layout/`** | One `AppShell`, explicit opt-in geometry inside `frame="sheet"`. Single logical top band above `[data-slot="app-shell-overlays"]`. Shared `DocumentTabs` in `src/layout/`. Deterministic responsive matrix; no drawer on mobile when `sidebar` is omitted on narrow + `bottomBar` is provided. | Adds a small prop surface (`top`, `sidebarHead`, `sidebarCollapsed`/`onSidebarCollapsedChange`, `dragProps`, `windowControls`) and one new layout module (`document-tabs.tsx`). Preserves all Tauri, F6, R14, and editor/codegen invariants cleanly. | **Selected** |
| **2. Full-height `Sidebar` column beside `TitleBar` + sheet** | Keep `Sidebar` reaching the top edge of the viewport and place `TitleBar` only over the right column. | Splits the top horizontal boundary: `[data-slot="app-shell-overlays"]` cannot sit cleanly below both columns' top chrome without duplicating overlay positioning, drag contexts, and macOS inset handling. | Rejected |
| **3. Implicit "auto-layout" inference + Figma-like builder controls** | Auto-switch shell geometry when `sidebar` + `tabs` are present, and add freeform flex/gap/padding controls to `builder.tsx`. | Ambiguous between fixed view tabs (`ToolbarTabs`) and document tabs; produces opaque codegen; freeform builder controls conflict with `AGENTS.md` ("One look") and `own-class`. | Rejected |

---

## 4. Architecture & Decided Design

### 4.1 `AppShell` Composition (`src/layout/app-shell.tsx`)

New optional props on `AppShellProps` (all backward-compatible):

```ts
/**
 * `bar` (default): full-width `titleBar` above sidebar and work area.
 * `unified`: single top row shared by the sidebar head (`[|] | brand`) and the
 * work-area tabs/chrome, flush above the sheet. Active only when `frame="sheet"`.
 */
top?: "bar" | "unified" | undefined
/** App identity shown beside the sidebar toggle in `top="unified"` (hidden in rail). */
sidebarHead?: React.ReactNode
/** Controlled collapsed state of the sidebar when coordinated by `AppShell` in `top="unified"`. */
sidebarCollapsed?: boolean | undefined
/** Called when the unified sidebar toggle is pressed (also forwarded to `Sidebar`). Toggle renders only when provided. */
onSidebarCollapsedChange?: ((collapsed: boolean) => void) | undefined
/** Optional callback to open the sidebar drawer on `< 620px` when an app keeps a drawer in `top="unified"`. */
onSidebarOpen?: (() => void) | undefined
/** Native window drag attributes for `top="unified"` (same contract as `TitleBar.dragProps`). */
dragProps?: TitleBarDragProps | undefined
/** Native window controls for `top="unified"` (same contract as `TitleBar.windowControls`). */
windowControls?: React.ReactNode
/** Optional trailing toolbar actions in `top="unified"` (between tabs/spacer and `windowControls`). */
topActions?: React.ReactNode
```

**Structural invariants when `frame="sheet"` and `top="unified"`:**
1. **Single logical top band (`[data-slot="app-shell-top"]` + `[data-slot="title-bar"]` semantics):**
   - Renders *above* `[data-slot="app-shell-below"]` (and therefore above `[data-slot="app-shell-overlays"]`), preserving `desktop` overlay containment.
   - Height follows `--titlebar-height` (`src/styles/theme.css`).
   - Background sits on the shell ground (`bg-sidebar-paper`, or `bg-paper-2` under `data-sidebar="own"`).
   - Provides `TitleBarDragContext` (`dragProps`), sets `app-region: drag` on non-interactive surface (and `no-drag` on interactive controls), and honors `--titlebar-start` / `--titlebar-end` (macOS traffic lights / WCO).
   - Participates in `F6` / `Shift+F6` cycling as the `TITLE_BAR_REGION` without adding individual button stops.
2. **Start cell (sidebar header) synchronization, surfaces, and macOS inset *(engineering calls)*:**
   - Rendered when `beside` is true (`Boolean(sidebar) && layout.sidebar !== "drawer"`).
   - **Width & macOS clearance:** `max(sidebarWidth, calc(var(--titlebar-start) + var(--control-xs) + 1rem))`, where `sidebarWidth` is `16rem` (`w-64`) when expanded and `calc(var(--row-height) + 1rem)` when collapsed/forced rail. When `--titlebar-start` is `0px` (Windows/Linux/browser), the start cell aligns pixel-for-pixel with the sidebar below; on macOS with non-zero traffic-light inset in rail mode, the start cell widens smoothly just enough to keep `[|]` clear of OS traffic lights without overlap.
   - **`data-sidebar="own"` surface continuity:** under `data-sidebar="own"` (e.g., dark sidebar on a light app), the start cell paints `bg-sidebar-paper text-sidebar-ink` so the sidebar reads as one unbroken column from top to bottom, while the tab region remains on `bg-paper-2`.
   - Inside `AppShellContext` (or a sibling internal context in `src/internal/frame.ts`), `AppShell` passes `{ unifiedTop: true, collapsed, onCollapsedChange }` to `Sidebar` so:
     - `Sidebar` does **not** render a duplicate collapse toggle or duplicate header row when `unifiedTop` is active.
     - Both `AppShell`'s start cell and `Sidebar` read the exact same `collapsed` boolean synchronously (zero 1-frame width desync). Collapse is strictly opt-in/controlled via `onSidebarCollapsedChange` (matching `Sidebar`).
   - **Fixed toggle alignment & forced rail (`620–849px`) (R14):**
     - Toggle button (`[|]`, `Icon name="sidebarClose"` / `"sidebarOpen"`, `size-(--control-xs)`, `pointer-coarse:size-11`) sits at a fixed logical start inset in both expanded column and collapsed rail—it never shifts horizontally.
     - In forced-rail width (`620–849px`, `layout.sidebar === "rail"`), when `onSidebarCollapsedChange` is provided, the `[|]` button stays rendered in its fixed slot as **disabled** (preserving R14 slot stability without pretending the rail can expand at that width; existing `Sidebar` tests in `top="bar"` remain untouched).
     - Vertical hairline divider (`h-4 w-px bg-line`) and `sidebarHead` render immediately after the toggle in expanded mode and hide in rail mode (verified: rail inner width is `32–40px`, so only the toggle fits cleanly).
   - **Optional narrow drawer button (`< 620px`):** when `sidebar` is passed, `layout.sidebar === "drawer"`, and `onSidebarOpen` is provided, `AppShell` renders a plain `Button variant="ghost" size="icon-sm"` (`Icon name="sidebarOpen"`, no `<Toolbar>` ancestor required) at top-start before `tabs`. When `sidebar` is omitted on narrow (the recommended no-drawer mobile pattern), nothing renders at start and `DocumentTabs` takes 100% width.
3. **Work-area top cell (document tabs + drag + window controls) & sheet top-start corner:**
   - Takes `min-w-0 flex-1` directly aligned with `[data-slot="app-shell-work"]`.
   - Renders `tabs` (typically `<DocumentTabs />`), followed by a flexible drag spacer (`flex-1 self-stretch`, carrying `dragProps`), optional `topActions`, and `windowControls` flush at the trailing corner outside any scroll area.
   - **Sheet top-start corner *(engineering call)*:** when `frame="sheet"`, `top="unified"`, and `tabs` is present, `[data-slot="app-shell-work"]` uses `rounded-ss-none` (square top-start corner) so the sheet's start border drops straight and cleanly under the tab strip regardless of which tab is active or scrolled (zero scroll-state coupling between `DocumentTabs` and `AppShell`). Without `tabs`, `rounded-ss-lg` remains.
4. **Fallback when `frame="line"` and `top="unified"`:**
   - Treated safely as `top="bar"` at runtime (no broken borderless geometry); `showcase/builder.tsx` only displays the `top` control when `frame === "sheet"`.

### 4.2 `Sidebar` (`src/layout/sidebar.tsx`)

- Add `toggle?: "foot" | "head" | "head-start"` (default `"foot"`).
  - Existing `"foot"` and `"head"` behavior remains **unchanged** for backward compatibility.
  - `"head-start"` places the toggle at the logical start with a vertical `1px bg-line` divider before `header`, keeping the toggle at the same start offset in rail mode (useful even in `top="bar"` apps).
- When inside `AppShell` with `unifiedTop: true`, `Sidebar` respects the shell-provided `collapsed` state and suppresses its internal toggle button so only one toggle exists.

### 4.3 `TabsList` Overflow Buttons (`src/primitives/tabs.tsx`) & `DocumentTabs` (`src/layout/document-tabs.tsx`)

- **Layering compliance (`test/layers.test.ts`):**
  - `src/primitives/tabs.tsx`: extend `TabsList` (or add a clean internal helper in `src/primitives/tabs.tsx`) with optional `overflow?: "shade" | "buttons"` (default `"shade"`). With `"buttons"`, `TabsList` observes `scrollWidth > clientWidth`, `scrollLeft`, and `ResizeObserver` on the scrolling track and exposes scroll-forward (`>`) — and scroll-backward (`<`) when scrolled past start, or deterministic step scrolling — without changing the outer slot width of trailing controls.
  - `src/layout/document-tabs.tsx`: new module exported from `@acaprino/sigrid/layout` (and registered in `showcase/editor/entries.ts`):
    - **`DocumentTabs`**: wraps `Tabs` + `TabsList` with `overflow="buttons"`:
      - Props: `"aria-label"`, `value: string | null | undefined` *(engineering call: nullable so closing the last tab is type-safe; forwarded internally to Ark UI as `value ?? ""`)*, `onValueChange: (value: string) => void`, `onAdd?: () => void`, `addLabel?: string`, `appearance?: "auto" | "attached" | "pill"` (default `"auto"`: `"attached"` inside `AppShell frame="sheet" top="unified"`, `"pill"` elsewhere), `animated?: boolean`, `className`, `children`.
      - **Slot layout (R14):** `[scrollable tab track] [fixed overflow button slot (>)] [1px divider |] [+ button (when onAdd given)]`.
      - When no overflow exists, the `>` button stays in its reserved slot **disabled** (or visually quiet/invisible via `absent`-like reservation) so the divider and `+` **never shift position** as tabs are added or closed.
      - Clicking `>` scrolls forward by ~75% of the visible tab viewport (RTL-aware using logical scroll direction); at the far end, `>` is disabled (or if `<` is also shown, `<` scrolls back).
      - Keyboard: single Tab stop on the tablist, Left/Right/Home/End via Ark UI, `scrollIntoView({ inline: "nearest" })` on selection change. Closing a tab moves focus to the adjacent tab (next, or previous if last) or to `+` if no tabs remain.
    - **`DocumentTab`**: wraps `TabsTrigger`:
      - Props: `value`, `icon?: React.ReactNode`, `color?: TagColor` (optional 8px `Dot`, R10), `closable?: boolean`, `onClose?: () => void`, `closeLabel?: string`, `disabled?: boolean`, `children`.
      - Supports close via `×` button (`Icon name="close"`, `tabIndex={-1}` so Tab order stays clean, accessible label via `useWords()`), middle-click (`auxclick` button 1), and `Delete` key.
      - Minimum `44px` hit target on `pointer-coarse`.
      - **Attached-sheet visual treatment (when `appearance="attached"`):**
        - Active tab renders on `bg-paper` (or `var(--glass-sheet, var(--color-paper))` under `data-material="glass"`, matching `app-shell-work` with fillets flattened under glass to avoid double-alpha seams — *engineering call*) with `1px` `border-line` on top, start, and end edges, overlapping `app-shell-work`'s top border by `1px` (`-mb-px`) so tab and sheet form one continuous surface.
        - Top corners use `rounded-t-lg` (`var(--radius-lg)` = `6px` default, `10px` soft, `14px` round — 100% R7 compliant).
        - Bottom concave fillets connect the active tab cleanly to the top edge of the sheet using `var(--radius-lg)` and logical start/end positioning (mirrors automatically in RTL). If the active tab is the very first tab flush against the sheet's start edge (when `beside` is true), the start edge drops straight into the sheet's start border (matching the reference screenshot) while the trailing edge curves concavely into the sheet's top border; for middle tabs, both start and end bottom edges curve concavely.
        - **Active state indicator *(owner decision: Option A)*:** combines surface continuity (`bg-paper` + continuous `border-line`), `font-semibold text-ink`, **and** a thin `2px` top accent bar (`bg-primary`, inset from the top corners within the active tab). Uniform across themes (no `data-tabs="bold"` overrides, keeping document tabs distinct from `ToolbarTabs` — *engineering call*) and never collides with `color`'s optional 8px `Dot` (R10).
        - Inactive tabs stay quiet on the window ground (`text-ink-mute hover:text-ink`), with `44px` minimum hit area on `pointer-coarse`.

### 4.4 Responsive & Mobile Behavior (`docs/mobile.md` + `ui-ux-pro-max`)

| Frame width | Sidebar | Top row (`top="unified"`) | Bottom bar | Work sheet (`app-shell-work`) |
|---|---|---|---|---|
| `>= 850px` (wide, expanded) | Full `w-64` column (`bg-sidebar-paper`) | `[|] \| Brand` (`w-64`) + `DocumentTabs` (`Trip ×`, `Ideas ×`, `>`, `\|`, `+`) + drag + `topActions` + `WindowControls` | Omitted (unless app sets `always`) | `data-sheet="beside"`, `rounded-ss-none` (with `tabs`), `border-t border-s`, fused with active tab |
| `620–849px` (forced rail) or user collapsed | Rail `calc(var(--row-height) + 1rem)` | `[|]` only (fixed start inset, brand hidden; disabled when width-forced) + `DocumentTabs` + drag + `topActions` + `WindowControls` | Omitted | `data-sheet="beside"`, `rounded-ss-none` (with `tabs`), `border-t border-s`, fused with active tab |
| `< 620px` (phone, **no drawer**, recommended for 2–5 places) | Omitted (`sidebar: 'wide'`) | **100% width `DocumentTabs`** (`Trip ×`, `Ideas ×`, `>`, `\|`, `+`), no `[|]` toggle, `44px` touch targets | `ToolbarTabs edge="top" layout="stacked"` (2–5 places, icon + label, safe-area inset) | `data-sheet="alone"`, full-width `border-t`, fused with active tab |
| `< 620px` (6+ places app, optional drawer) | `Sidebar` as `Sheet` drawer (`sidebar: 'always'`) | Start icon button (`onSidebarOpen`) + `DocumentTabs` | Omitted (never duplicate places in drawer + bottomBar) | `data-sheet="alone"`, full-width `border-t` |

### 4.5 Showcase Editor (`showcase/editor/`), Examples & Docs *(owner decision: Option A — interactive `DocTabs` + `bar` actions routed to `topActions`)*

1. **`showcase/editor/model.ts` & `showcase/editor/catalog.ts`:**
   - Extend `Settings` with `top: 'bar' | 'unified'` (default `'bar'`; `readApp` defaults missing `top` to `'bar'` for full backward compatibility with saved apps). When `top === 'unified'`, `barSize` is ignored/hidden in `builder.tsx`.
   - Add a `DocTabs` component kind in `showcase/editor/catalog.ts` (configurable initial tab titles, closable, addable) allowed in the `tabs` slot (alongside `ViewTabs` and toolbar items).
   - **Slot routing in `top="unified"`:**
     - `sidebarHead` receives `<ToolbarBrand name={app.name} page={undefined} />` automatically from the app's name.
     - Non-brand, non-menu trailing items in `shared.bar` (e.g. `BarSearch`, `BarButton`, `BarGroup`) route automatically into `AppShell.topActions` wrapped in `<Toolbar aria-label={name}>` so switching any existing starter to `top="unified"` preserves its bar actions cleanly.
     - `shared.tabs`: when it contains `DocTabs`, render `DocumentTabs` directly **without** a Base UI `<Toolbar>` wrapper (Ark UI `Tabs` is its own keyboard tablist); when `shared.tabs` holds `ViewTabs`/toolbar items (e.g. `test/editor-export.test.ts`'s `everything()`), keep the existing `<Toolbar aria-label="Views">` wrapper.
   - **Interactive runtime & codegen for `DocTabs`:**
     - In `RunApp` (`render.tsx`) and exported `App.tsx` (`codegen.ts`), `DocTabs` is genuinely interactive with independent React state (`const [docs, setDocs] = useState([...])` and `const [activeDoc, setActiveDoc] = useState(...)`), decoupled from `screen` navigation (sidebar/bottomBar): clicking `+` appends a new tab and activates it; clicking `×` removes the tab and updates `activeDoc` cleanly. Implemented in `plan.ts`/`codegen.ts` as a frame-level built-in state pattern (analogous to `notices`/`Toasts` and `job`), keeping `ir.ts` simple and readable.
   - Add two starters to `STARTERS`:
     - **`notes`** (`kind: 'app'`): unified sheet shell (`frame: 'sheet'`, `top: 'unified'`, `sidebar: 'wide'`, `bottom: 'narrow'`), 4 navigation places (`All notes`, `Travel`, `Home`, `Archive` with Sigrid Icons, no emoji), interactive document tabs (`Trip`, `Ideas`, addable/closable), note content + inspector.
     - **`unified-sheet`** (`kind: 'layout'`): minimal starter with unified sheet + sidebar + interactive document tabs + mobile `bottomBar`.
2. **`showcase/builder.tsx`:**
   - Show `<Choice label="Top row" options={[['bar', 'Title bar'], ['unified', 'Unified sheet']]} />` when `s.frame === 'sheet'`; hide `Bar size` when `s.frame === 'sheet' && s.top === 'unified'`.
   - Wire sidebar collapse toggle interactively in wide previews (`Laptop 1280px` / `Fill`) where the sidebar is full (not `Tablet 768px` forced rail) so the fixed-start `[|]` toggle can be tested live.
3. **`showcase/editor/render.tsx` & `showcase/editor/codegen.ts`:**
   - Render `AppShell` with `top="unified"`, `sidebarHead`, `sidebarCollapsed`/`onSidebarCollapsedChange`, `onSidebarOpen` (only when `sidebar === 'always'` on narrow), `dragProps`, `windowControls`, `topActions`, and `tabs={<DocumentTabs ... />}`.
   - Export clean, idiomatic `@acaprino/sigrid` JSX with zero custom classes (`sigrid-check` with `own-class` passes).
4. **`showcase/editor/entries.ts`:**
   - Add `DocumentTabs` and `DocumentTab` to `@acaprino/sigrid/layout` (verified by `test/editor-export.test.ts`).
5. **Showcase & Docs:**
   - Add a live unified sheet shell pattern to `showcase/main.tsx` (Layout patterns) and `showcase/examples.tsx`.
   - Document `top="unified"` and `DocumentTabs` in `docs/patterns.md`, `DESIGN.md` (if needed), and regenerate `agents/` via `npm run agents`.

---

## 5. Left to the Builder

The builder decides the cleanest implementation details within the constraints above:
- **Concave fillet CSS technique:** choose the crispest zero-subpixel-seam method (e.g., `radial-gradient` corner masks on pseudo-elements or small inline `aria-hidden` SVG corner arcs sized to `var(--radius-lg)` — note `DESIGN.md` forbids visual `gradients` in `sigrid-check`, so verify `sigrid-check` does not flag the technique; an inline `1x1` / `viewBox` geometric corner or `box-shadow` radial clip/border-radius mask avoids `linear-gradient`/`radial-gradient` lint triggers cleanly!).
- **Overflow scroll UX detail:** whether `<` appears alongside `>` or only when `scrollLeft > 0` (keeping the trailing `>` + `|` + `+` fixed so R14 holds).
- **Exact `Words` keys (`src/words.ts`):** add localized strings for document tabs (`tabs`, `newTab`, `closeTab`, `scrollNext`, `scrollPrev`) reusing existing `workspace` word conventions where possible.
- **Test coverage:** unit tests for `AppShell` (`top="unified"`, `desktop` overlays, F6 cycling, responsive steps, `sidebarCollapsed` sync), `Sidebar` (`toggle="head-start"`), `DocumentTabs` (keyboard, close focus transfer, overflow buttons, RTL logical sides), `test/layers.test.ts`, `test/logical-sides.test.ts`, `test/editor-export.test.ts`, and visual verification in browser at `390px`, `768px`, and `1280px` across default/`soft`/`round` shapes and light/dark modes.
