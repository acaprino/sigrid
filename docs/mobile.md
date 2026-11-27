# Sigrid on a phone

What the design system does on a phone, what an app adds, and the layouts to start from. Four parts: the idea, the
guidelines, the layouts, and examples in code.

Two kinds of statement are kept apart here, as everywhere in the toolkit:

- **The toolkit does it.** A fact of the code, kept by the tests: an app gets it without writing anything.
- **Recommended.** A practice, as in `docs/patterns.md`: nothing checks it, and an app that has a reason does otherwise.

The gallery shows all of it live: `npm run showcase`, view Philosophy («On a phone»), view Guidelines («On a
phone»), view Practices («Phone layouts»: one small app in a frame as wide as a phone). Open the showcase on a phone,
or in the browser's device mode, to see what follows the pointer itself.

## The idea

Sigrid is ADHD first: calm surfaces, one accent, one clear action at a time (`DESIGN.md`, R1 to R14). A phone does not
change that. It makes it stricter, because there is room for one thing.

1. **The same app, in one column.** Do not design a second app. The regions of the frame give way in a fixed order
   until one column is left: the inspector becomes a page, the sidebar a drawer, the words beside icons go. What the
   user learned on the wide window still holds.
2. **One screen, one job.** One list, or one thing to read, with one solid action (R3). Whatever else can be done waits
   in a menu. An eye that is easily pulled away has one place to land.
3. **Read at the head, act at the foot.** The bar at the head says where the user is and the way back. The thumb
   reaches the foot: the views are tabs there, and so are the actions, the solid one last.
4. **State in sight, without a pointer.** A finger has no hover, so nothing may live only under the pointer. The chosen
   row, the unread dot and the counts are always drawn (R1, R5). An icon nobody would guess keeps its word, since no
   hint will explain it.
5. **Undo, do not ask.** A finger slips. An action that can be taken back is done at once, and the notice that says so
   carries Undo (R12). Only what cannot be undone asks first.
6. **Nothing shrinks.** The text sizes are the ones of the wide window, a field is 16px so the page does not zoom, and
   every control and row is at least 44px at every density.
7. **Controls stay where they are.** A control that is on every page, or in every state of a page, never changes place:
   the bar at the foot and its plus, the tools of the bar at the head, a two-state switch (it stays where it is in both
   states), the checkbox and the menu of a row. A tool that one view lacks leaves its place empty; it does not shift the
   others. An eye that is easily pulled away learns where a control is once; a control that jumps when it is pressed
   distracts and frustrates. The height a screen is laid out to is the host's, measured, never a guess (below,
   «Heights and orientation»).

## Guidelines

### What «a phone» is

| Name | Media query | In code | Decides |
|---|---|---|---|
| Narrow | `(width < 860px)` | `NARROW`, `useMedia(NARROW)`, the `md` breakpoint | The 16px fields, the place of the notices |
| Coarse | `(pointer: coarse)` | `COARSE`, `useMedia(COARSE)`, the `pointer-coarse:` variant | The 44px sizes, on a tablet too |
| Phone | both | `usePhone()`, `max-md:pointer-coarse:` | The hidden key hints, the date card as a sheet |
| Short | `(height < 500px)` | `SHORT`, `useMedia(SHORT)`, the `short:` variant | A phone lying down, a window shrunk in height: the bottom bar is 44px, a view's word goes beside its icon |

The frame is a fourth measure, and the one that lays the screen out: `AppShell` reads its own width, not the screen's
(`useAppShell()`). A window half-snapped on a wide screen and a phone held upright are the same narrow frame. Its
height is what the person sees (`--app-height`), measured by the frame itself: see «Heights and orientation».

### The toolkit does it

| What | On a phone | Where |
|---|---|---|
| Controls and rows | At least 44px tall with a coarse pointer, at every density. A density that asks for more gets more | `--touch-target`, `TOUCH_TARGET`, `theme.css` |
| Fields | 16px text below 860px, so iOS does not zoom the page on focus. No other text size changes | `Input`, `Textarea`, `Combobox`, the date fields |
| Key hints | Hidden: `Kbd`, the shortcuts of a menu and of the command palette (R5); the key beside a toast's «Undo» too, on a phone that also has a pen | `max-md:pointer-coarse:hidden`; the toast's `pointer-fine:inline md:any-pointer-fine:inline` |
| Sidebar | A drawer when the frame is under 620px (outside a frame, when the screen is under 860px). A swipe towards its edge closes it | `Sidebar`, `APP_SHELL_STEPS.rail` |
| Inspector | Under 1000px a panel over the end of the content, three quarters of the frame wide, not modal: a press outside it does not close it (the list beside it is still chosen from), a swipe towards its edge and its button do, and Esc with the focus in it (not on a field that holds text; with the focus elsewhere Esc is the field's or the app's command, and the panel stays). It opens without taking the focus, and closed with the focus in it gives it back to where it was | `Inspector`, `APP_SHELL_STEPS.inspector` |
| Toolbar | Under 448px of its own width a button keeps its icon and drops its word, and a search field is its magnifier. Under 256px the app's name goes. The buttons never go | `Toolbar` |
| Sheets | Close with a swipe in the direction of their side, as well as with Esc and a press outside (the inspector's panel is the exception: a press outside leaves it open, and so does Esc with the focus outside it) | `Sheet` |
| Date card | A sheet at the foot of the screen, 85% of its height at most, with room for the home indicator | `DateField`, `DateRangeField`, `DateTimeField` |
| Dialog | As wide as the screen less 16px at each side | `Dialog` |
| Notices | In the middle of the foot below 860px, above what the frame keeps there (its actions, its footer and its bottom bar: the frame writes that room to `--bottom-bar-room`; an app with a bar of its own sets it) | `Toasts`, `--bottom-bar-room` |
| Steps | A row too narrow for its names keeps the current one and says «Step 2 of 4» | `Steps` |
| Hover | Drawn only where the pointer can hover: a tap leaves no stuck hover | Tailwind's `hover:` |
| Height | The frame is as tall as what the person sees: the browser's bars, the keyboard, a rotation are followed, never `100vh`; it is never taller than the box it is put in | `AppShell`, `useAppHeight`, `--app-height` |
| Edges | Where the frame is the whole screen it keeps clear of the notch, the status bar and the gesture bar (`env(safe-area-inset-*)`, the foot with its maximum, which does not change while the page scrolls) | `AppShell` (`data-screen`), `--safe-area-max-inset-bottom` |
| A short window | Under 500px of height the bottom bar is 44px and each view puts its word beside its icon | `AppShell`, `ToolbarTab`, `short:` |
| One screen | A page that must fit is as tall as what is seen less the bars; its head and foot keep their height and its body gives way and scrolls, never the document, which does not bounce | `Page fit` |
| Places | A segment, a tab or a view of the bar is as wide chosen as not, so the others never move; a tool a view lacks keeps its place, empty | `ToggleGroup`, `Tabs`, `ToolbarTabs`, `ToolbarButton absent`, `ToolbarSearch absent` |

Measured on a phone 390px wide, at normal density (the showcase, in the browser's device mode):

| Part | Height |
|---|---|
| Title bar | 60px (a 44px control and 8px above and below) |
| Bottom bar | 49px (48px and its line); the label of a tab is 12px, under a 16px icon |
| A row of one line | 44px |
| A row of two lines | 50px (14px title, 13px line under it) |
| A button, a field, a segment | 44px; the text of a field is 16px |
| Status strip (`footer`) | 44px |

The least width the layouts are made for is 320px (`DESIGN.md`, `x-zsd.layout.viewport-min`).

### Recommended: what the app adds

The page:

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Do not switch the user's
  zoom off.
- `viewport-fit=cover` draws the page edge to edge: under the notch, the status bar and the gesture bar. The frame
  keeps clear of them by itself; what the app draws outside the frame (a bar of its own, a `fixed` button) must do it
  too (`--safe-area-inset-top|left|right`, and at the foot `--safe-area-max-inset-bottom`, never the live
  `env(safe-area-inset-bottom)`). Without it the browser keeps those edges for itself and the insets are 0.
- Put `AppShell` in the page as it is, or in a box that has a height: no `h-dvh`, `h-screen` or `100vh` around it. The
  frame is as tall as what is seen, and never taller than its box. A box taller than the window (a preview of a whole
  window in a page) leaves the frame shorter than the box: give it `className="h-full"` there.

The frame:

- Keep the shared controls where they are on every screen (R14): the bar at the head and the views at the foot are
  there on every page, in the same order and place; a control that does nothing on a page is disabled, not taken
  away. On a phone a control that moves is one the thumb misses. `docs/patterns.md` says how.
- Let `AppShell` measure itself. Do not switch on `usePhone()` to lay a screen out: a narrow window with a mouse wants
  the same layout. Use `usePhone()` for what belongs to a finger on a small screen: a swipe on a row, capture from the
  plus.
- Leave `desktop` and `useDesktopGuard()` off: they are for a program in a window of its own.
- Leave the `status` and `footer` strips out. With a finger each is 44px tall, and the notices (`Toasts`) say the last
  result better.
- Put the views at the foot in `AppShell`'s `bottomBar`: the frame then tells the notices how tall it is
  (`--bottom-bar-room`). A bar of the app's own, outside the frame, sets `--bottom-bar-room` on the root itself
  (`BOTTOM_BAR_ROOM_VAR`), with the foot's maximum inset in it.

Navigation:

| The app has | Use | Built with |
|---|---|---|
| Two to five views of the same weight | Tabs at the foot, an icon over a word | `AppShell`'s `bottomBar`, `ToolbarTabs` with `edge="top"` and `layout="stacked"` |
| Six places or more, or places with counts | The drawer, opened from the first button of the bar | `Sidebar` with `open`; show the button where `useAppShell().sidebar === 'drawer'` |
| A place inside a place (a task of a list) | A page, with the way back in the bar by its name | Swap the content; `ToolbarButton keepWord` |

One place for the views on one screen: never tabs at the foot and a drawer that list the same places.

The bar at the head:

- The app and the place first (`ToolbarBrand page`): on a narrow bar the name gives way and the place stays.
- Then at most three actions, the solid one last. More than that goes in one menu.
- An action whose icon nobody would guess keeps its word (`keepWord`) or goes in the menu. The way back always keeps
  its word: «‹ Today», not an arrow alone.

Actions:

- One solid action on the screen (R3). On a list it is the add button, last in the bar. On a page about one thing it
  is at the foot (`AppShell`'s `actions`), last, with the quieter ones before it.
- A destructive action is never where the thumb rests: in the menu, last, after a separator.
- What can be undone is done at once with Undo in the notice. Z has no key on a phone, so the button in the notice is
  the way back: do not rely on the key alone.

Lists and rows:

- A row is two lines at most: a title cut with an ellipsis, a line under it, one fact at the end.
- The details under a title are one line. What does not fit is cut from the end, whole, and counted («+2»); it never
  wraps onto a second line and never pushes out the first detail (`OverflowList`). The row's page shows them all.
- A press on a row opens it. What else can be done to it is in its page, or in a menu at the end of the row. A swipe
  on a row is a shortcut for one of those, never the only way.
- Nothing appears only under the pointer. A button that a wide window shows on hover is always drawn here, or lives in
  the row's page.

Forms:

- One column, the label above the field (`FormField`), the error under it in words.
- Ask for the right keyboard: `type`, `inputMode`, `autoComplete`, `enterKeyHint`.
- A few choices are a segment control or radios, in sight. A `Select` is for more than five.
- The solid button is at the foot of the form or of the sheet, full width in a sheet.

What opens over the page:

- A short task (add, rename, pick) is a `Sheet` from the foot: one field, a few quick choices, one solid button.
- A `Dialog` is for a question that must be answered. A menu stays a menu.
- Ask once, in a dialog. A sentence that only matters before the first use (what is sent, and where) is not a line
  of the page. The first press asks it in a `Dialog` with the two answers, and the app remembers the answer: the
  next presses act at once.
- A hint (`Tooltip`) never opens under a finger: it holds no information that is nowhere else (it never did).

Motion: as everywhere. Short, only on a gesture, a sheet enters from its own edge, nothing loops; all works with
motion off or reduced.

Places:

- A control that is on every page, or in every state, keeps its place (point 7 of «The idea»). A two-state switch
  stays where it is in both states: a `ToggleGroup`, whose words are as wide pressed as not, at the start of its row,
  not centred on a row whose other parts come and go.
- A tool that one view lacks keeps its place, empty: `ToolbarButton absent`, `ToolbarSearch absent`. Do not leave it
  out, or the tools after it move.
- What grows or changes length (a search that opens, the place's name in the brand, a count) sits next to a
  `ToolbarSpacer`, so it takes the spacer's room and not a tool's place. The solid action is last in the bar on every
  page, or at the foot on every page, never one and then the other.
- Tabs keep their order on every page; a tab that does not apply is disabled, not taken away.

### Recommended: a screen that has to fit

A screen where the user decides about one item at a time (sort, triage) does not scroll: the item, its fields and the
two answers are in sight together, so nothing the decision needs is out of view. It is `Page fit`.

```tsx
<AppShell contentLabel="Sort" bottomBar={tabs} actions={<><Button variant="outline" onClick={later}>Later</Button><Button onClick={accept}>Looks good</Button></>}>
  <Page fit header={<ToggleGroup aria-label="Stage" value={stage} onValueChange={setStage}>…</ToggleGroup>}>
    {/* The item: its title, its fields, a row of quick picks. */}
  </Page>
</AppShell>
```

- The page is as tall as what is seen less the bars: in an `AppShell` the frame has taken its bars away already; on a
  page of its own it is `--fit-height` (`--app-height` less `--bottom-bar-room`), and it must then be the only block of
  the page. Never `100vh`: while the browser shows its address bar, `100vh` is taller than the screen, and a page that
  fits still scrolls.
- The head (`header`: the switch, a count) and the foot (`footer`, or the frame's `actions`: the two answers, the solid
  one last, R3) keep their height. The body is what gives way: with a large text, a small phone, the keyboard open or
  a phone lying down it scrolls inside itself, and the document never does. The document does not bounce or pull to
  refresh while the page is shown.
- Short fields (a day, a duration, a list) sit two to a row; a long one (the title, a note) keeps the whole width.
  It is the one exception to the single column of «Forms».
- Quick picks are one row that scrolls sideways, not rows that wrap: the next chip peeks at the edge, and that is the
  sign there are more.
- Where it fails: a head and a foot taller than the screen together (160% text on a phone lying down) leave the body
  no room, and then the frame's content scrolls (in an `AppShell`) or the document does (alone). Keep the head to one
  line and the foot to one row of answers. A fit page outside a frame with something above it (a header of the app's
  own) is taller than the screen: put that in `header`.
- Measure it at 360x640 and at 411x741, lying down (741x411), with the text at 130% and 160% and with the keyboard
  open: the document does not scroll (`document.documentElement.scrollHeight === innerHeight`), and both answers are
  in sight.

## Heights and orientation

A height is the host's, never a guess. The page runs in a browser tab, a Custom Tab, an installed app, a web view or
a window, and each of them takes a different part of the screen, which changes while the page is open: the bars
slide, the keyboard opens, the phone turns. What the toolkit measures and what an app decides:

| Measure | What it is | Where it misleads |
|---|---|---|
| `100vh` | The height with the browser's bars gone (the largest) | Taller than the screen while the address bar shows: a page that fits it scrolls |
| `100dvh` | Follows the bars as they slide | Not the keyboard (by default it stays); not every host updates it. The toolkit's value before a script runs |
| `visualViewport.height` | What the browser says it shows now: what the bars and the keyboard leave; times its `scale` it is in layout px | Nothing on a server. `useAppHeight` reads it and writes `--app-height` |
| `env(safe-area-inset-*)` | The room the device keeps at an edge (notch, status bar, gesture bar), with `viewport-fit=cover` | At the foot it is live: from Chrome 135 on Android the gesture bar slides away while the page scrolls, and the inset with it. Never size anything with it |
| `env(safe-area-max-inset-bottom)` | The most the foot's inset can be (Chrome 135 and later) | Only Chrome; the toolkit falls back to the live inset, then 0 (`--safe-area-max-inset-bottom`) |
| `interactive-widget` | In the viewport meta: what the keyboard resizes. `resizes-visual` (the default from Chrome 108): only the visual viewport, so `dvh` and `fixed` bars stay and the keyboard covers the foot. `resizes-content`: the page itself | Not read by WebView; Safari does not read it either (not from the pages below) |
| Text scale | Mobile browsers leave the system's text size out by default; `<meta name="text-scale" content="scale">` lets `rem` follow it | Everything in `rem` grows taller: a screen that fits must give way, not assume |

By host. What is said of Chrome comes from four pages of developer.chrome.com, read on 2026-11-23 and to be read again
when Chrome changes: <https://developer.chrome.com/docs/css-ui/edge-to-edge> (the gesture bar, the live and the
maximum inset), <https://developer.chrome.com/blog/viewport-resize-behavior> (the keyboard, `interactive-widget`),
<https://developer.chrome.com/blog/url-bar-resizing> (`100vh` and the address bar) and
<https://developer.chrome.com/docs/modern-web-guidance/guides/accessibility/respect-os-text-scale> (text scale). The
rows of the Custom Tab, the WebView's keyboard and iOS Safari are not from them: they are as these hosts are known,
not measured here.

| Host | Bars | Keyboard | Safe areas |
|---|---|---|---|
| Chrome tab, Android | The address bar slides away while the document scrolls; `100vh` is the height without it | Covers the foot (`resizes-visual`); `visualViewport` shrinks | With `viewport-fit=cover`, from 135 the page goes under the gesture bar, whose inset is live; the maximum is fixed |
| Custom Tab, Android | The opening app's toolbar at the top | As a Chrome tab | As a Chrome tab |
| Installed app (PWA), Android | No address bar: `100vh`, `100dvh` and what is seen agree, the keyboard apart | As a Chrome tab | As a Chrome tab |
| WebView, Android | The host app sizes it; `interactive-widget` does nothing | What the host app asks of Android (resize or pan) | What the host app passes on |
| Safari, iOS | The bars shrink while the document scrolls; `100vh` is the height with them small | Covers the page and may pan it (`visualViewport.offsetTop`) | Notch and home indicator; no maximum: the live inset, which does not slide |

The toolkit does, with no code of the app's: the frame's height (`AppShell`, `useAppHeight`, `--app-height`); its
edges where it is the whole screen; the room of its bottom bar (`--bottom-bar-room`); its thin bars on a short window
(`short:`); a page that fits (`Page fit`, `--fit-height`); the notices above the bar; `ScrollArea bounded` at about
half of what is seen.

The app decides: the viewport meta (`viewport-fit=cover`, and `interactive-widget` if the keyboard should resize the
page); whether to let the system's text size in (`text-scale`); the room of a bar of its own; and what a screen shows
when the keyboard is open (the bottom bar stays above it, in the frame).

## Layouts

Seven screens of one small app. The gallery shows them as states of the same app, so a press on a row, the plus and a
tab move between them. Beside the phone, the conditions to try the screen that fits in: a frame 480, 640 or 741px
tall, the text at 100, 130 or 160%, the keyboard open, the phone lying down.

**List.** The first screen: what there is to do, in one column (`ItemList`, `ItemRow`). The views are tabs at the
foot; the one solid action (add) is last in the bar. Today is in the accent (R2). An empty list says so and names the
way to add (`Empty`).

**Detail as a page.** What a wide window shows in the inspector is a page of its own on a phone: the title, the
facts, the text, the few controls. The bar says the way back by its name. The actions are at the foot, the solid one
last. The `Inspector` still works on a phone, as a panel three quarters of the frame wide: it suits a few facts, not a
text to read or a form.

**Capture sheet.** Adding is a sheet from the foot: one field, a few quick choices, one solid button. A swipe down
closes it, and the list behind it has not moved. Enter on the keyboard does what the solid button does.

**Board, one lane.** One lane at a time, chosen from a `ToggleGroup` that shows how many each one holds. The lane is
on the quiet fill, the cards raised with the smallest shadow (R4). A press on a card opens it as a page.

**Settings page.** One column. Each choice is a row at least 48px tall with its name at the start and its control at
the end; it takes effect at once, with no Save button, unless it can fail. The rest sits under Advanced (R13).

**Focus.** The screen a phone is best at: one thing, how many are left, the way out. No tabs and no menu. The actions
are at the foot: skip, later, done. It is the screen where the accent has the least to compete with.

**A screen that fits.** Sorting what came in, one item at a time (`Page fit`): at the head a two-state switch that
stays where it is in both states and a line of progress, in the body the item in a card that gives way, at the foot
the answers, the solid one last. The document never scrolls; the card does, when it must.

A task in steps (`Steps`) is a column on a phone, with Back and Continue at the foot.

## Examples

The frame of a phone app with a few views: tabs at the foot, the solid action last in the bar, the notices above the
bottom bar. The frame takes its height and its edges by itself, and tells the notices how tall the bar is.

```tsx
import { Icon } from '@acaprino/sigrid/primitives'
import { Toasts } from '@acaprino/sigrid/components'
import { AppShell, TitleBar, Toolbar, ToolbarBrand, ToolbarButton, ToolbarSpacer, ToolbarTab, ToolbarTabs } from '@acaprino/sigrid/layout'

function Tasks() {
  const [view, setView] = useState('today')
  return (
    <>
      <AppShell
        contentLabel="Today"
        titleBar={
          <TitleBar>
            <Toolbar aria-label="Tasks">
              <ToolbarBrand name="Tasks" page="Today" />
              <ToolbarSpacer />
              <ToolbarButton label="New task" variant="default" icon={<Icon name="plus" />} onClick={add}>
                New task
              </ToolbarButton>
            </Toolbar>
          </TitleBar>
        }
        bottomBar={
          <Toolbar aria-label="Views of the tasks">
            <ToolbarTabs aria-label="Views" value={view} onValueChange={setView} edge="top" layout="stacked">
              <ToolbarTab value="today" icon={<Icon name="now" />}>Today</ToolbarTab>
              <ToolbarTab value="board" icon={<Icon name="structure" />}>Board</ToolbarTab>
              <ToolbarTab value="settings" icon={<Icon name="settings" />}>Settings</ToolbarTab>
            </ToolbarTabs>
          </Toolbar>
        }
      >
        <ItemList aria-label="Tasks" className="p-2">
          {tasks.map((task) => (
            <ItemRow key={task.id} title={task.title} description={task.list} meta={task.due} onClick={() => open(task)} />
          ))}
        </ItemList>
      </AppShell>
      <Toasts items={notices} durationMs={6000} onDismiss={dismiss} />
    </>
  )
}
```

A tool that one view lacks keeps its place, so the plus at the end of the bar never moves:

```tsx
<ToolbarSpacer />
<ToolbarButton label="Labels" icon={<Icon name="labels" />} absent={view === 'settings'} onClick={showLabels} />
<ToolbarButton label="New task" variant="default" icon={<Icon name="plus" />} onClick={add}>New task</ToolbarButton>
```

The detail as a page: the same frame with the content swapped, the way back in the bar and the actions at the foot.
The way back is its word alone: Sigrid's names (`ICON_NAMES`) have no drawing for «back» yet.

```tsx
<AppShell
  contentLabel={task.title}
  titleBar={
    <TitleBar>
      <Toolbar aria-label="Task">
        <ToolbarButton label="Back to Today" onClick={close}>
          Today
        </ToolbarButton>
      </Toolbar>
    </TitleBar>
  }
  actions={
    <>
      <Button variant="outline" onClick={later}>Later</Button>
      <Button onClick={complete}>Done</Button>
    </>
  }
  bottomBar={tabs}
>
  <article className="flex flex-col gap-3 p-4">…</article>
</AppShell>
```

Done at once, with the way back in the notice:

```tsx
const complete = (task: Task) => {
  markDone(task.id)
  show({ id: task.id, text: `Completed «${task.title}»`, undo: { onClick: () => markOpen(task.id) } })
}
```

The capture sheet, from the foot:

```tsx
<Sheet open={adding} onOpenChange={setAdding}>
  <SheetContent side="bottom">
    <SheetHeader>
      <SheetTitle>New task</SheetTitle>
    </SheetHeader>
    <form className="flex flex-col gap-4 px-4" onSubmit={add}>
      <FormField label="What is there to do?">
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} enterKeyHint="done" />
      </FormField>
    </form>
    <SheetFooter>
      <Button onClick={add}>Add</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

What belongs to a finger on a small screen, and only that, asks `usePhone()`:

```tsx
const phone = usePhone()
return <TaskRow task={task} swipe={phone ? { end: archive } : undefined} />
```

## Before a release

- Open every screen at 320px, 390px and 430px wide, with a coarse pointer (the browser's device mode): no row of
  controls scrolls sideways (a row of quick picks does, on purpose), no word is cut where it is the only name of a
  thing.
- At 320px, on every screen, `document.documentElement.scrollWidth === innerWidth`. One thing too wide widens the
  whole page: a long string that cannot wrap, `whitespace-nowrap` with `shrink-0` in a flex row, a grid track without
  `minmax(0, 1fr)`. Chrome on Android then draws the `fixed` bars on the widened page, and the bottom bar is cut off.
- Nothing is `100vh` or `h-screen` tall: the frame and `Page fit` take the height of what is seen.
- Each screen that must fit, at 360x640 and 411x741, lying down, with the text at 130% and 160%, and with the
  keyboard open: `document.documentElement.scrollHeight === innerHeight` (the document does not scroll), the answers
  are in sight, and only the body scrolls.
- Go from page to page and from state to state: the bar at the foot, the tools of the head and every switch stay
  where they were.
- Every screen has one solid action, and it can be reached with the thumb or is last in the bar.
- Every action has a way that needs no hover, no key and no swipe.
- Type in every field: the page does not zoom, and the keyboard is the right one.
- Do something and undo it from the notice.
- Switch motion off, and the scheme to dark.

## Not there yet

What a phone app still writes by itself, or has to know. Each is a decision for the toolkit, not a rule:

- With the keyboard open the frame is as tall as what is left above it, so its bottom bar stays in sight above the
  keyboard; the frame does not hide it.
- On iOS the keyboard may pan the page (`visualViewport.offsetTop`): the frame follows the height, not the pan.
- `short:` follows the window's height, not the frame's: a frame in a short box of a tall window keeps its 48px bar.
- The measures were checked in tests (jsdom) and, for the same rules in an app, in headless Chrome with touch
  emulation; not on a real phone, a Custom Tab, Samsung Internet or iOS Safari.
- The `status` and `footer` strips take the 44px floor of a control with a finger, though nothing in them is pressed.
- There is no row that swipes and no pull to refresh: an app that wants them writes them.
- `DESIGN.md` still lists the measures at phone widths as unresolved (`x-zsd.unresolved`), and does not name this
  guide: the file is at the size its lint allows. The table above is a first record of the measures.
