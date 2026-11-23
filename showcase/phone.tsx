// The phone layouts of the showcase: what docs/mobile.md says in words, as one small app («Tasks») in a frame as wide
// as a phone, built only with the toolkit's parts. The six layouts are six states of the same app, so the picker above
// the frame and the app itself (a press on a row, the plus, a tab) move between them: it is one app, not six drawings.
//
// What a phone gets by itself is of two kinds, and only one can be shown in a wide browser window:
// - what follows the width of the frame (`AppShell` measures itself): the sidebar as a drawer, the words of the bar
//   that give way. These are true here at any size of the window;
// - what follows the screen and the pointer (`(pointer: coarse)`, `(width < 860px)`): the 44px sizes, the 16px fields,
//   the hidden key hints, the date card as a sheet. A media query cannot be set on one element, so the frame is drawn
//   with the touch density (`touchDensity`: the same floor theme.css applies with a finger), and the rest shows when
//   the showcase is opened on a phone, or in the browser's device mode.
// The overlays of the frame (the capture sheet, the drawer) mount into a layer of the frame, so they open inside it.
import * as React from 'react'
import { ChevronLeft, ChevronRight, PanelLeft, Plus } from 'lucide-react'
import {
  AppShell,
  Button,
  Count,
  Empty,
  FormField,
  Icon,
  Input,
  ItemList,
  ItemRow,
  NavItem,
  PortalContainerProvider,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Sidebar,
  SidebarGroup,
  Switch,
  TOUCH_TARGET,
  TitleBar,
  Toasts,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarBrand,
  ToolbarButton,
  ToolbarSpacer,
  ToolbarTab,
  ToolbarTabs,
  cn,
  densityOf,
  densityVariables,
  densityWith,
  type Density,
  type DensityDef,
  type DensityId,
  type IconName,
} from '../src/index'
import { Section } from './parts'

/** What each layout recommends, in one sentence: the same words as docs/mobile.md. */
const LAYOUTS = {
  list: { name: 'List', advice: 'The first screen: what there is to do, in one column. The views are tabs at the foot, where the thumb reaches; the one solid action (add) is last in the bar. A press on a row opens it.' },
  detail: { name: 'Detail as a page', advice: 'What a wide window shows in the inspector is a page of its own here. The bar says the way back by its name, and the actions are at the foot, the solid one last.' },
  capture: { name: 'Capture sheet', advice: 'Adding is a sheet from the foot: one field, a few quick choices, one solid button. A swipe down closes it, and the list behind it has not moved.' },
  board: { name: 'Board, one lane', advice: 'One lane at a time, chosen from a segment control that shows how many each one holds. A press on a card opens it as a page.' },
  page: { name: 'Settings page', advice: 'One column. Each choice is a row with its name at the start and its control at the end, and takes effect at once; the rest sits under Advanced (R13).' },
  focus: { name: 'Focus', advice: 'The screen a phone is best at: one thing, how many are left, the way out. No tabs and no menu; the actions are at the foot.' },
} as const
type LayoutId = keyof typeof LAYOUTS

type ViewId = 'today' | 'board' | 'settings'
const VIEWS: readonly { id: ViewId; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'now' },
  { id: 'board', label: 'Board', icon: 'structure' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

type LaneId = 'todo' | 'doing' | 'done'
const LANES: readonly { id: LaneId; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'Doing' },
  { id: 'done', label: 'Done' },
]

type Task = { id: string; title: string; list: string; due: string; note: string; lane: Exclude<LaneId, 'done'> }
const TASKS: readonly Task[] = [
  { id: 'tax', title: 'Pay the waste tax', list: 'Home', due: 'Today', note: 'The second instalment. The payment slip came by mail on 3 November.', lane: 'doing' },
  { id: 'plumber', title: 'Call the plumber', list: 'Home', due: 'Today', note: 'A leak under the sink. Before noon, when the shop answers.', lane: 'doing' },
  { id: 'quote', title: 'Draft of the quote', list: 'Clients', due: 'Today', note: 'The kitchen, second version: the quartz top and the built-in hood.', lane: 'todo' },
  { id: 'card', title: 'Renew the identity card', list: 'Home', due: '28 Nov', note: 'Two photos and the old card. The office is open in the morning.', lane: 'todo' },
  { id: 'train', title: 'Book the train to Rome', list: 'Clients', due: '5 Dec', note: 'Leave after 8:00 and be back the same evening.', lane: 'todo' },
]

const WHENS = ['Today', 'Tomorrow', 'No date'] as const
type When = (typeof WHENS)[number]

/**
 * What a finger gets from a density: every control and every row at least the touch target. theme.css does this by
 * itself with a coarse pointer; here it is written on the frame, so a wide window with a mouse draws the same sizes.
 */
export function touchDensity(density: Density): DensityDef {
  const d = densityOf(density)
  const up = (px: number) => Math.max(TOUCH_TARGET, px)
  return densityWith(d, { id: `${d.id}-touch`, control: { md: up(d.control.md), sm: up(d.control.sm), xs: up(d.control.xs) }, row: { height: up(d.row.height) } })
}

/** When a task is due: today is one of the accent's places (R2). */
const Due = ({ due }: { due: string }) => <span className={due === 'Today' ? 'font-medium text-accent' : undefined}>{due}</span>

export function PhoneLayouts({ animated, density }: { animated: boolean; density: DensityId }) {
  const [width, setWidth] = React.useState('390')
  const [nav, setNav] = React.useState<'tabs' | 'drawer'>('tabs')
  const [view, setView] = React.useState<ViewId>('today')
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [focus, setFocus] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const [lane, setLane] = React.useState<LaneId>('todo')
  const [tasks, setTasks] = React.useState<readonly Task[]>(TASKS)
  const [done, setDone] = React.useState<readonly string[]>([])
  const [notices, setNotices] = React.useState<readonly { id: string; text: string; task: string }[]>([])
  const [draft, setDraft] = React.useState('')
  const [when, setWhen] = React.useState<When>('Today')
  const [reminders, setReminders] = React.useState(true)
  const [scheme, setScheme] = React.useState<'light' | 'dark'>('light')
  const count = React.useRef(0)
  const frame = React.useRef<HTMLDivElement>(null)
  const [layer, setLayer] = React.useState<HTMLDivElement | null>(null)
  const [foot, setFoot] = React.useState(0)

  const open = tasks.filter((task) => !done.includes(task.id))
  const finished = tasks.filter((task) => done.includes(task.id))
  const opened = open.find((task) => task.id === openId) ?? null
  const inFocus = open[0] ?? null
  const viewLabel = VIEWS.find((v) => v.id === view)?.label ?? view
  const layout: LayoutId = focus ? 'focus' : adding ? 'capture' : opened ? 'detail' : view === 'board' ? 'board' : view === 'settings' ? 'page' : 'list'

  /** The picker above the frame: each layout is a state of the app. */
  const show = (id: LayoutId) => {
    setFocus(id === 'focus')
    setAdding(id === 'capture')
    setOpenId(id === 'detail' ? (open[0]?.id ?? null) : null)
    setView(id === 'board' ? 'board' : id === 'page' ? 'settings' : 'today')
    setMenu(false)
  }
  const go = (next: string) => {
    const target = VIEWS.find((v) => v.id === next)
    if (!target) return
    setView(target.id)
    setOpenId(null)
    setMenu(false)
  }
  const dismiss = React.useCallback((id: string) => setNotices((now) => now.filter((notice) => notice.id !== id)), [])
  /** Done at once, with the way back in the notice: nothing asks «are you sure?» (R12). */
  const complete = (task: Task) => {
    setDone((now) => [...now, task.id])
    setOpenId(null)
    const id = `done-${(count.current += 1)}`
    setNotices((now) => [...now, { id, text: `Completed «${task.title}»`, task: task.id }])
  }
  const later = () => setTasks((now) => (now.length > 1 && now[0] ? [...now.slice(1), now[0]] : now))
  const add = () => {
    const title = draft.trim()
    if (!title) return
    const id = `new-${(count.current += 1)}`
    setTasks((now) => [{ id, title, list: 'Home', due: when === 'No date' ? '' : when, note: 'Added from the phone.', lane: 'todo' }, ...now])
    setDraft('')
    setAdding(false)
  }

  // The notices sit above the bar at the foot, as `--bottom-bar-room` does for an app: here the room is the frame's own.
  React.useLayoutEffect(() => {
    const bar = frame.current?.querySelector<HTMLElement>('[data-slot="app-shell-bottom"]')
    setFoot(bar ? bar.offsetHeight : 0)
  }, [nav, focus, density])

  const views = (
    <ToolbarTabs aria-label="Views" value={view} onValueChange={go} edge="top" layout="stacked">
      {VIEWS.map((v) => (
        <ToolbarTab key={v.id} value={v.id} icon={<Icon name={v.icon} />}>
          {v.label}
        </ToolbarTab>
      ))}
    </ToolbarTabs>
  )

  const bar = focus ? (
    <>
      <ToolbarButton label="Leave the focus" icon={<ChevronLeft aria-hidden="true" />} keepWord onClick={() => setFocus(false)} animated={animated}>
        Leave the focus
      </ToolbarButton>
      <ToolbarSpacer />
      {inFocus ? <span className="pe-2 text-2xs text-ink-mute tabular-nums">1 of {open.length}</span> : null}
    </>
  ) : opened ? (
    <>
      {/* The way back keeps its word: on a phone no hint says what an arrow alone would do. */}
      <ToolbarButton label={`Back to ${viewLabel}`} icon={<ChevronLeft aria-hidden="true" />} keepWord onClick={() => setOpenId(null)} animated={animated}>
        {viewLabel}
      </ToolbarButton>
      <ToolbarSpacer />
    </>
  ) : (
    <>
      {nav === 'drawer' ? <ToolbarButton label="Open the menu" icon={<PanelLeft aria-hidden="true" />} onClick={() => setMenu(true)} animated={animated} /> : null}
      <ToolbarBrand name="Tasks" page={viewLabel} />
      <ToolbarSpacer />
      {view === 'settings' ? null : (
        <ToolbarButton label="New task" variant="default" icon={<Plus aria-hidden="true" />} onClick={() => setAdding(true)} animated={animated}>
          New task
        </ToolbarButton>
      )}
    </>
  )

  const today = open.length === 0 ? (
    <Empty className="h-full p-6" title="Nothing left for today" description="Add a task with the plus in the bar." />
  ) : (
    <ItemList aria-label="Tasks" className="p-2">
      {open.map((task) => (
        <ItemRow key={task.id} title={task.title} description={task.list} meta={task.due ? <Due due={task.due} /> : undefined} onClick={() => setOpenId(task.id)} />
      ))}
    </ItemList>
  )

  const inLane = lane === 'done' ? finished : open.filter((task) => task.lane === lane)
  const board = (
    <div className="flex flex-col gap-3 p-4">
      <ToggleGroup aria-label="Lane" value={lane} onValueChange={setLane} animated={animated} className="w-full">
        {LANES.map((l) => (
          <ToggleGroupItem key={l.id} value={l.id} className="flex-1 px-2">
            {l.label}
            <span className="text-2xs font-normal text-ink-mute tabular-nums">{l.id === 'done' ? finished.length : open.filter((task) => task.lane === l.id).length}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex min-h-24 flex-col gap-2 rounded-lg bg-paper-2 p-2">
        {inLane.length === 0 ? <p className="p-2 text-sm text-ink-mute">Nothing here.</p> : null}
        {inLane.map((task) => (
          <button key={task.id} type="button" disabled={lane === 'done'} onClick={() => setOpenId(task.id)} className="flex min-h-11 flex-col gap-1 rounded-md bg-raised p-3 text-start text-sm text-ink shadow-xs outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:text-ink-mute">
            {task.title}
            {task.due ? (
              <span className="text-2xs text-ink-mute">
                <Due due={task.due} />
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )

  const SETTING = 'flex min-h-12 items-center justify-between gap-4 py-2'
  const settings = (
    <div className="flex flex-col gap-1 p-4">
      <p className="text-sm text-ink-mute">How the app looks and what it reminds you of.</p>
      <div className="mt-3 flex flex-col divide-y divide-line border-y border-line text-sm text-ink">
        <div className={SETTING}>
          <span>Scheme</span>
          <ToggleGroup aria-label="Scheme" value={scheme} onValueChange={setScheme} animated={animated}>
            <ToggleGroupItem value="light">Light</ToggleGroupItem>
            <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className={SETTING}>
          <span>Reminders</span>
          <Switch aria-label="Reminders" checked={reminders} onCheckedChange={setReminders} animated={animated} />
        </div>
        <div className={cn(SETTING, 'text-ink-mute')}>
          <span>Advanced</span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </div>
      </div>
    </div>
  )

  const detail = opened ? (
    <article className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold text-ink">{opened.title}</h1>
      <p className="text-sm text-ink-mute">
        {opened.list}
        {opened.due ? (
          <>
            , due <Due due={opened.due} />
          </>
        ) : null}
      </p>
      <p className="text-sm text-ink-soft">{opened.note}</p>
      <Switch checked={reminders} onCheckedChange={setReminders} animated={animated}>
        Remind me at 9:00
      </Switch>
    </article>
  ) : null

  const focused = inFocus ? (
    <div className="flex h-full flex-col justify-center gap-2 p-6">
      <h1 className="text-xl font-semibold text-ink">{inFocus.title}</h1>
      <p className="text-sm text-ink-mute">{inFocus.note}</p>
    </div>
  ) : (
    <Empty className="h-full p-6" title="All done" description="Nothing is left in this list." action={<Button variant="outline" onClick={() => setFocus(false)}>Leave the focus</Button>} />
  )

  const actions = focus ? (
    inFocus ? (
      <>
        <Button variant="ghost" onClick={later}>
          Skip
        </Button>
        <Button variant="outline" onClick={later}>
          Later
        </Button>
        <Button onClick={() => complete(inFocus)}>Done</Button>
      </>
    ) : undefined
  ) : opened ? (
    <>
      <Button variant="outline" onClick={() => setFocus(true)}>
        Focus
      </Button>
      <Button onClick={() => complete(opened)}>Done</Button>
    </>
  ) : undefined

  const touch = touchDensity(density)
  return (
    <Section
      id="practices-phone"
      icon="column"
      title="Phone layouts"
      note="One small app in a frame as wide as a phone, made only of the toolkit's parts: recommendations, not rules (docs/mobile.md). The frame is drawn with the sizes a finger gets (every control and row at least 44px). What follows the screen and the pointer themselves (16px fields, hidden key hints, the date card as a sheet) shows when this page is opened on a phone, or in the browser's device mode."
    >
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup aria-label="Phone layout" value={layout} onValueChange={show} animated={animated} className="max-w-full flex-wrap">
          {(Object.keys(LAYOUTS) as LayoutId[]).map((id) => (
            <ToggleGroupItem key={id} value={id}>
              {LAYOUTS[id].name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup aria-label="Where the views are" value={nav} onValueChange={setNav} animated={animated}>
          <ToggleGroupItem value="tabs">Tabs at the foot</ToggleGroupItem>
          <ToggleGroupItem value="drawer">Drawer</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup aria-label="Width of the phone" value={width} onValueChange={setWidth} animated={animated}>
          <ToggleGroupItem value="320">320</ToggleGroupItem>
          <ToggleGroupItem value="390">390</ToggleGroupItem>
          <ToggleGroupItem value="430">430</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <p data-sample="phone-advice" className="max-w-3xl text-sm text-ink-soft">
        <span className="font-semibold text-ink">{LAYOUTS[layout].name}.</span> {LAYOUTS[layout].advice}
      </p>
      <div className="max-w-full overflow-x-auto p-1 pb-6">
        <div ref={frame} data-sample="phone" data-layout={layout} data-density={touch.id} style={{ width: `${width}px`, ...densityVariables(touch) }} className="relative h-180 max-w-full overflow-hidden rounded-lg shadow-lg">
          <PortalContainerProvider container={layer}>
            <AppShell
              contentLabel={focus ? 'The task in focus' : opened ? opened.title : viewLabel}
              titleBar={
                <TitleBar>
                  <Toolbar aria-label="Tasks">{bar}</Toolbar>
                </TitleBar>
              }
              sidebar={
                nav === 'drawer' && !focus ? (
                  <Sidebar aria-label="Views" open={menu} onOpenChange={setMenu} animated={animated}>
                    <SidebarGroup>
                      {VIEWS.map((v) => (
                        <NavItem key={v.id} current={view === v.id} onClick={() => go(v.id)} icon={<Icon name={v.icon} />} end={v.id === 'today' ? <Count value={open.length} label="tasks" reserve /> : undefined}>
                          {v.label}
                        </NavItem>
                      ))}
                    </SidebarGroup>
                  </Sidebar>
                ) : undefined
              }
              actions={actions}
              bottomBar={nav === 'tabs' && !focus ? <Toolbar aria-label="Views of the tasks">{views}</Toolbar> : undefined}
            >
              {focus ? focused : (detail ?? (view === 'board' ? board : view === 'settings' ? settings : today))}
            </AppShell>
            <Sheet open={adding} onOpenChange={setAdding}>
              <SheetContent side="bottom" animated={animated}>
                <SheetHeader>
                  <SheetTitle>New task</SheetTitle>
                  <SheetDescription>It goes to the top of Today.</SheetDescription>
                </SheetHeader>
                <form
                  className="flex flex-col gap-4 px-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    add()
                  }}
                >
                  <FormField label="What is there to do?">
                    <Input value={draft} onChange={(event) => setDraft(event.target.value)} enterKeyHint="done" autoComplete="off" />
                  </FormField>
                  <ToggleGroup aria-label="When" value={when} onValueChange={setWhen} animated={animated} className="w-full">
                    {WHENS.map((w) => (
                      <ToggleGroupItem key={w} value={w} className="flex-1 px-2">
                        {w}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </form>
                <SheetFooter>
                  <Button disabled={draft.trim() === ''} onClick={add}>
                    Add
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </PortalContainerProvider>
          {/* Where the overlays of the frame open: a layer of its own, which also holds what is `fixed` inside it. */}
          <div ref={setLayer} data-sample="phone-overlays" className="pointer-events-none absolute inset-0 z-40 transform-gpu *:pointer-events-auto" />
          {/* The notices: in the middle, above the bar at the foot, as on a real phone. The column is made as wide as the frame allows. */}
          <div style={{ bottom: `${foot}px` }} className="pointer-events-none absolute inset-x-3 z-50 [&_[data-toasts]]:w-full">
            <Toasts items={notices.map((notice) => ({ id: notice.id, text: notice.text, undo: { onClick: () => { setDone((now) => now.filter((id) => id !== notice.task)); dismiss(notice.id) } } }))} inline max={2} durationMs={6000} onDismiss={dismiss} animated={animated} />
          </div>
        </div>
      </div>
    </Section>
  )
}
