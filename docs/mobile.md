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

Sigrid is ADHD first: calm surfaces, one accent, one clear action at a time (`DESIGN.md`, R1 to R13). A phone does not
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

## Guidelines

### What «a phone» is

| Name | Media query | In code | Decides |
|---|---|---|---|
| Narrow | `(width < 860px)` | `NARROW`, `useMedia(NARROW)`, the `md` breakpoint | The 16px fields, the place of the notices |
| Coarse | `(pointer: coarse)` | `COARSE`, `useMedia(COARSE)`, the `pointer-coarse:` variant | The 44px sizes, on a tablet too |
| Phone | both | `usePhone()`, `max-md:pointer-coarse:` | The hidden key hints, the date card as a sheet |

The frame is a fourth measure, and the one that lays the screen out: `AppShell` reads its own width, not the screen's
(`useAppShell()`). A window half-snapped on a wide screen and a phone held upright are the same narrow frame.

### The toolkit does it

| What | On a phone | Where |
|---|---|---|
| Controls and rows | At least 44px tall with a coarse pointer, at every density. A density that asks for more gets more | `--touch-target`, `TOUCH_TARGET`, `theme.css` |
| Fields | 16px text below 860px, so iOS does not zoom the page on focus. No other text size changes | `Input`, `Textarea`, `Combobox`, the date fields |
| Key hints | Hidden: `Kbd`, the shortcuts of a menu and of the command palette (R5) | `max-md:pointer-coarse:hidden` |
| Sidebar | A drawer when the frame is under 620px (outside a frame, when the screen is under 860px). A swipe towards its edge closes it | `Sidebar`, `APP_SHELL_STEPS.rail` |
| Inspector | Under 1000px a panel over the end of the content, three quarters of the frame wide, not modal | `Inspector`, `APP_SHELL_STEPS.inspector` |
| Toolbar | Under 448px of its own width a button keeps its icon and drops its word, and a search field is its magnifier. Under 256px the app's name goes. The buttons never go | `Toolbar` |
| Sheets | Close with a swipe in the direction of their side, as well as with Esc and a press outside | `Sheet` |
| Date card | A sheet at the foot of the screen, 85% of its height at most, with room for the home indicator | `DateField`, `DateRangeField`, `DateTimeField` |
| Dialog | As wide as the screen less 16px at each side | `Dialog` |
| Notices | In the middle of the foot below 860px, above the room an app declares for its bottom bar | `Toasts`, `--bottom-bar-room` |
| Steps | A row too narrow for its names keeps the current one and says «Step 2 of 4» | `Steps` |
| Hover | Drawn only where the pointer can hover: a tap leaves no stuck hover | Tailwind's `hover:` |

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

- `<meta name="viewport" content="width=device-width, initial-scale=1">`. Do not switch the user's zoom off.
- The frame is as tall as the screen that is left: `h-dvh`, not `h-screen`, so the browser's own bars do not cover
  the foot.
- Add `viewport-fit=cover` only if the app then keeps its bars clear of the rounded corners and the home indicator
  itself (`env(safe-area-inset-*)`). The frame does not do it; only the date card does.

The frame:

- Let `AppShell` measure itself. Do not switch on `usePhone()` to lay a screen out: a narrow window with a mouse wants
  the same layout. Use `usePhone()` for what belongs to a finger on a small screen: a swipe on a row, capture from the
  plus.
- Leave `desktop` and `useDesktopGuard()` off: they are for a program in a window of its own.
- Leave the `status` and `footer` strips out. With a finger each is 44px tall, and the notices (`Toasts`) say the last
  result better.
- Tell the notices how tall the bottom bar is, or they cover it: set `--bottom-bar-room` on the root
  (`BOTTOM_BAR_ROOM_VAR`).

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

### Recommended: a screen that has to fit

A screen where the user decides about one item at a time (sort, triage) does not scroll: the item, its fields and the
two answers are in sight together, so nothing the decision needs is out of view.

- The frame is as tall as the screen in sight (`h-dvh` or `min-h-dvh`, as in «The page» above), never `100vh`. While
  the browser shows its address bar, `100vh` is taller than the screen, and a page that fits still scrolls.
- Short fields (a day, a duration, a list) sit two to a row; a long one (the title, a note) keeps the whole width.
  It is the one exception to the single column of «Forms».
- Quick picks are one row that scrolls sideways, not rows that wrap: the next chip peeks at the edge, and that is the
  sign there are more.
- The two answers stay above the bar at the foot (`sticky bottom-0`), the solid one last (R3).
- Measure it at 360x640 and at 411x741, with a coarse pointer: the page does not scroll, and both answers are in sight.

## Layouts

Six screens of one small app. The gallery shows them as states of the same app, so a press on a row, the plus and a
tab move between them.

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

A task in steps (`Steps`) is a column on a phone, with Back and Continue at the foot.

## Examples

The frame of a phone app with a few views: tabs at the foot, the solid action last in the bar, the notices above the
bottom bar.

```tsx
import { AppShell, BOTTOM_BAR_ROOM_VAR, Icon, TitleBar, Toasts, Toolbar, ToolbarBrand, ToolbarButton, ToolbarSpacer, ToolbarTab, ToolbarTabs } from '@acaprino/sigrid'

function Tasks() {
  const [view, setView] = useState('today')
  // The notices sit above the bar at the foot: 48px and its line.
  useLayoutEffect(() => {
    const bar = document.querySelector<HTMLElement>('[data-slot="app-shell-bottom"]')
    document.documentElement.style.setProperty(BOTTOM_BAR_ROOM_VAR, `${bar?.offsetHeight ?? 0}px`)
  }, [])
  return (
    <div className="h-dvh">
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
    </div>
  )
}
```

The detail as a page: the same frame with the content swapped, the way back in the bar and the actions at the foot.

```tsx
<AppShell
  contentLabel={task.title}
  titleBar={
    <TitleBar>
      <Toolbar aria-label="Task">
        <ToolbarButton label="Back to Today" icon={<ChevronLeft aria-hidden="true" />} keepWord onClick={close}>
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
- A page that should fit is not `100vh` or `h-screen` tall: it is `dvh`.
- Every screen has one solid action, and it can be reached with the thumb or is last in the bar.
- Every action has a way that needs no hover, no key and no swipe.
- Type in every field: the page does not zoom, and the keyboard is the right one.
- Do something and undo it from the notice.
- Switch motion off, and the scheme to dark.

## Not there yet

What a phone app still writes by itself, or has to know. Each is a decision for the toolkit, not a rule:

- The frame keeps no room for the safe areas. With `viewport-fit=cover` the bottom bar sits under the home indicator
  unless the app pads it.
- `--bottom-bar-room` is the app's to set: the frame does not write the height of its own bottom bar.
- The `status` and `footer` strips take the 44px floor of a control with a finger, though nothing in them is pressed.
- There is no row that swipes and no pull to refresh: an app that wants them writes them.
- `DESIGN.md` still lists the measures at phone widths as unresolved (`x-zsd.unresolved`), and does not name this
  guide: the file is at the size its lint allows. The table above is a first record of the measures.
