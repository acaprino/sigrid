// Ethel, a to-do list, as it would be made with the toolkit's frame: a sketch for the Examples view. The concepts and
// the words are Ethel's own (the Stack where everything is dumped with no decision, Sort that goes through it one item
// at a time, Today with its «Now» strip, areas and their projects, `@labels`), the content is made up, and the frame is
// the toolkit's `AppShell` (the real app has a frame of its own): this is how the same app is laid out with the parts
// documented here, and what its four hosts change.
// - On a computer: the views, the areas and the labels are the sidebar; the task chosen is in the inspector, and what is
//   changed there holds at once; the one solid action is «Complete» on the Now strip (in the Stack, «Add» or «Accept»).
// - On a phone: the views are tabs at the foot with the plus between them, where the thumb is; a task is a page with
//   its actions at the foot; adding is a sheet from the foot that goes to the Stack.
// - The Stack is put in order by hand (`ReorderList`, the toolkit's `./reorder` entry): Sort takes it from the top.
// Keys, where there is a keyboard: B goes to the Stack, / searches, Z undoes the newest thing done.
import * as React from 'react'
import { ChevronLeft, Plus } from 'lucide-react'
import { ReorderList } from '../src/reorder'
import {
  AppShell,
  Avatar,
  Button,
  Checkbox,
  ChipsInput,
  Count,
  DateField,
  Empty,
  FormField,
  Icon,
  Input,
  Inspector,
  Kbd,
  NavItem,
  NavList,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Sidebar,
  SidebarGroup,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarBrand,
  ToolbarButton,
  ToolbarSearch,
  ToolbarSpacer,
  ToolbarTab,
  ToolbarTabs,
  cn,
  colorTheme,
  dayPicks,
  type IconName,
  type ToastItem,
} from '../src/index'
import { AppBar, Dot, Host, MenuButton, isAppKey, type AppProps } from './hosts'

/** Ethel's own theme: its teal, with the spot colour the app starts with. */
const THEME = colorTheme({ id: 'ethel', label: 'Ethel', color: '#00857a', spot: 'balanced' })

/** The day the sketch is set on. */
const TODAY = '2026-11-23'
const day = (iso: string) => new Date(`${iso}T12:00:00`)
const plus = (iso: string, days: number) => {
  const d = day(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
const TOMORROW = plus(TODAY, 1)
const SHORT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const LONG = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
/** A due day in words: today and tomorrow by name, the others by their date. */
const when = (iso: string) => (iso === TODAY ? 'Today' : iso === TOMORROW ? 'Tomorrow' : SHORT.format(day(iso)))

const AREAS = [
  { id: 'home', name: 'Home', color: '#297abc', projects: [{ id: 'kitchen', name: 'Kitchen renovation' }, { id: 'electricity', name: 'Electricity contract' }] },
  { id: 'work', name: 'Work', color: '#2f9e6e', projects: [{ id: 'report', name: 'Quarterly report' }, { id: 'clients', name: 'Clients' }] },
] as const
const PROJECTS: readonly { id: string; name: string; area: string; color: string }[] = AREAS.flatMap((area) => area.projects.map((p) => ({ ...p, area: area.name, color: area.color })))
const LABELS: Readonly<Record<string, string>> = { '@home': '#297abc', '@marco': '#e8772e', '@office': '#7b68ee', '@gifts': '#e5659a' }

type Task = { id: string; title: string; project: string | null; date: string | null; labels: string[]; priority: 'P1' | 'P2' | 'P3' | 'None'; duration?: string; subtasks: { title: string; done: boolean }[]; notes: string }
const TASKS: readonly Task[] = [
  { id: 'terms', title: 'Read the terms of the new contract', project: 'electricity', date: TODAY, labels: ['@home'], priority: 'P1', duration: '1h 30m', subtasks: [{ title: 'Print the contract', done: true }, { title: 'Mark the doubtful clauses', done: false }, { title: 'Call customer service', done: false }], notes: 'The offer ends on Friday. Compare the price per kWh with the old contract.' },
  { id: 'quote', title: 'Ask the carpenter for a quote', project: 'kitchen', date: TODAY, labels: [], priority: 'None', subtasks: [], notes: 'Wall units and the worktop. Send the measures taken on Tuesday.' },
  { id: 'pass', title: 'Renew the transit pass', project: null, date: plus(TODAY, -3), labels: [], priority: 'P2', subtasks: [], notes: 'It can be done from the app, with the card at hand.' },
  { id: 'draft', title: 'Send the draft to the team', project: 'report', date: TOMORROW, labels: ['@marco', '@office'], priority: 'None', subtasks: [], notes: 'The third quarter, with the two charts still to check.' },
  { id: 'dentist', title: 'Call the dentist to reschedule the appointment', project: null, date: TOMORROW, labels: [], priority: 'None', subtasks: [], notes: '' },
  { id: 'bulb', title: 'Change the bathroom light bulb', project: null, date: plus(TODAY, 5), labels: ['@home'], priority: 'P3', subtasks: [], notes: 'E14, warm light.' },
]
const STACK: readonly string[] = ['Write to Marco about dinner', 'Empty the cellar', 'Quote for the boiler', 'Book the car service', 'Buy the gift for Giulia', 'Look for a flight to Lisbon in March']
/** Where Sort would put an item of the Stack: what the app's assistant suggests, here by its position. */
const SUGGESTED: readonly (string | null)[] = [null, 'kitchen', 'electricity', null, null, null]

const VIEWS: readonly { id: string; label: string; icon: IconName }[] = [
  { id: 'stack', label: 'Stack', icon: 'inbox' },
  { id: 'today', label: 'Today', icon: 'now' },
  { id: 'upcoming', label: 'Upcoming', icon: 'date' },
  { id: 'stickies', label: 'Stickies', icon: 'pin' },
  { id: 'pomodoro', label: 'Pomodoro', icon: 'clock' },
]
const SORT_DAYS = [
  { id: 'today', label: 'Today', date: TODAY },
  { id: 'tomorrow', label: 'Tomorrow', date: TOMORROW },
  { id: 'week', label: 'In a week', date: plus(TODAY, 7) },
] as const
type SortDay = (typeof SORT_DAYS)[number]['id']

type Notice = { id: string; text: string; undo?: () => void }

/** A task in a list: the round box that completes it, then its name and, under it, what there is to know in small gray text. */
function TaskRow({ task, current, phone, onOpen, onComplete, animated }: { task: Task; current: boolean; phone: boolean; onOpen: () => void; onComplete: () => void; animated: boolean }) {
  const project = PROJECTS.find((p) => p.id === task.project)
  const done = task.subtasks.filter((s) => s.done).length
  return (
    <li
      data-slot="task-row"
      className={cn(
        'relative flex min-h-(--row-height) items-center gap-3 rounded-md ps-3 pe-2 text-sm text-ink-soft hover:bg-selected/60',
        current && "bg-selected text-selected-ink before:absolute before:top-1/2 before:left-0 before:h-4 before:w-0.75 before:-translate-y-1/2 before:rounded-full before:bg-primary before:content-['']",
      )}
    >
      <Checkbox aria-label={`Complete «${task.title}»`} checked={false} onCheckedChange={onComplete} animated={animated} />
      <button type="button" aria-current={current ? 'true' : undefined} onClick={onOpen} className="flex min-w-0 flex-1 cursor-default flex-col rounded-md py-1.5 text-start outline-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid">
        <span className={cn(phone ? 'line-clamp-2' : 'truncate', current ? 'font-semibold' : 'text-ink')}>{task.title}</span>
        <span className={cn('flex min-w-0 flex-wrap items-center gap-x-2 text-xs', current ? 'opacity-80' : 'text-ink-mute')}>
          {task.labels.map((label) => (
            <span key={label} className="inline-flex items-center gap-1">
              <Dot color={LABELS[label] ?? '#6b7a8f'} />
              {label}
            </span>
          ))}
          {project ? <span className="truncate">{project.name}</span> : null}
          {/* Only «today» is in the accent (R2). A day gone by is said in the same gray: red is kept for danger. */}
          {task.date ? <span className={task.date === TODAY && !current ? 'font-semibold text-accent' : undefined}>{when(task.date)}</span> : null}
          {task.subtasks.length > 0 ? <span className="tabular-nums">{done}/{task.subtasks.length}</span> : null}
          {task.duration ? <span>{task.duration}</span> : null}
          {task.priority !== 'None' ? <span className="font-medium">{task.priority}</span> : null}
        </span>
      </button>
    </li>
  )
}

export function Ethel({ device, host, animated, density, look }: AppProps) {
  const phone = device === 'phone'
  const [view, setView] = React.useState('today')
  const [tasks, setTasks] = React.useState<readonly Task[]>(TASKS)
  const [done, setDone] = React.useState<readonly string[]>([])
  const [stack, setStack] = React.useState<readonly string[]>(STACK)
  const [chosen, setChosen] = React.useState<string | null>(phone ? null : 'terms')
  const [now, setNow] = React.useState(0)
  const [mode, setMode] = React.useState<'dump' | 'sort'>('dump')
  const [sortDay, setSortDay] = React.useState<SortDay>('today')
  const [dump, setDump] = React.useState('')
  const [quick, setQuick] = React.useState('')
  const [adding, setAdding] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const [text, setText] = React.useState('')
  const [searching, setSearching] = React.useState(false)
  const [notices, setNotices] = React.useState<readonly Notice[]>([])
  const count = React.useRef(0)
  const quickField = React.useRef<HTMLInputElement>(null)
  const id = React.useId()

  const open = tasks.filter((task) => !done.includes(task.id))
  const dueNow = open.filter((task) => task.date !== null && task.date <= TODAY)
  const later = open.filter((task) => task.date !== null && task.date > TODAY)
  const project = PROJECTS.find((p) => `project:${p.id}` === view)
  const label = view.startsWith('label:') ? view.slice(6) : null
  const title = project?.name ?? label ?? (view === 'projects' ? 'Projects' : (VIEWS.find((v) => v.id === view)?.label ?? view))
  const inView = (view === 'today' ? dueNow : view === 'upcoming' ? later : project ? open.filter((t) => t.project === project.id) : label ? open.filter((t) => t.labels.includes(label)) : []).filter((task) => task.title.toLowerCase().includes(text.trim().toLowerCase()))
  const task = open.find((t) => t.id === chosen) ?? null
  const current = dueNow[now % Math.max(dueNow.length, 1)] ?? null
  const late = dueNow.filter((t) => t.date !== null && t.date < TODAY).length

  const dismiss = React.useCallback((notice: string) => setNotices((list) => list.filter((n) => n.id !== notice)), [])
  const say = (said: string, undo?: () => void) => setNotices((list) => [...list, { id: `n${(count.current += 1)}`, text: said, ...(undo ? { undo } : {}) }])
  const edit = (target: string, change: Partial<Task>) => setTasks((list) => list.map((t) => (t.id === target ? { ...t, ...change } : t)))
  const go = (next: string) => {
    setView(next)
    setMenu(false)
    if (phone) setChosen(null)
  }
  /** Done at once, with the way back in the notice (R12): nothing asks first. */
  const complete = (target: Task) => {
    setDone((list) => [...list, target.id])
    if (chosen === target.id) setChosen(null)
    say(`Completed «${target.title}»`, () => setDone((list) => list.filter((d) => d !== target.id)))
  }
  const postpone = (target: Task) => {
    const before = target.date
    edit(target.id, { date: TOMORROW })
    if (phone) setChosen(null)
    say('Postponed to tomorrow', () => edit(target.id, { date: before }))
  }
  const addTask = (name: string, date: string | null, to: string | null) => {
    const made = `new${(count.current += 1)}`
    setTasks((list) => [{ id: made, title: name, project: to, date, labels: [], priority: 'None', subtasks: [], notes: '' }, ...list])
    return made
  }
  const addQuick = () => {
    const name = quick.trim()
    if (!name) return
    addTask(name, view === 'upcoming' ? TOMORROW : view === 'today' ? TODAY : null, project?.id ?? null)
    setQuick('')
  }
  const addDump = () => {
    const lines = dump.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return
    setStack((list) => [...lines, ...list])
    setDump('')
    setAdding(false)
    say(lines.length === 1 ? 'Added to the Stack' : `Added ${lines.length} to the Stack`, () => setStack((list) => list.filter((item) => !lines.includes(item))))
  }
  /** Sort: the first item of the Stack becomes a task, in the place suggested and on the day chosen. */
  const accept = () => {
    const item = stack[0]
    if (item === undefined) return
    const date = SORT_DAYS.find((d) => d.id === sortDay)?.date ?? TODAY
    const made = addTask(item, date, SUGGESTED[STACK.indexOf(item)] ?? null)
    setStack((list) => list.slice(1))
    say(`Sorted into ${when(date)}`, () => {
      setTasks((list) => list.filter((t) => t.id !== made))
      setStack((list) => [item, ...list])
    })
  }
  const skip = () => setStack((list) => (list.length > 1 && list[0] !== undefined ? [...list.slice(1), list[0]] : list))
  const undo = () => {
    const last = [...notices].reverse().find((n) => n.undo)
    if (!last) return
    last.undo?.()
    dismiss(last.id)
  }
  const keys = (event: React.KeyboardEvent) => {
    if (!isAppKey(event)) return
    const key = event.key.toLowerCase()
    if (key === 'z') undo()
    else if (key === 'b') go('stack')
    else if (key === '/') setSearching(true)
    else return
    event.preventDefault()
  }

  const toasts: ToastItem[] = notices.map((n) => ({ id: n.id, text: n.text, ...(n.undo ? { undo: { ...(phone ? {} : { hint: 'Z' }), onClick: () => { n.undo?.(); dismiss(n.id) } } } : {}) }))

  /* ———— The regions ———— */

  const nav = (target: string, icon: React.ReactNode, name: string, amount?: number) => (
    <NavItem key={target} current={view === target} onClick={() => go(target)} icon={icon} end={amount === undefined ? undefined : <Count value={amount} label="tasks" reserve />}>
      {name}
    </NavItem>
  )
  const places = (
    <>
      {AREAS.map((area) => (
        <SidebarGroup key={area.id} label={area.name} icon={<Icon name="structure" />} collapsible>
          {area.projects.map((p) => nav(`project:${p.id}`, <Dot color={area.color} />, p.name, open.filter((t) => t.project === p.id).length))}
        </SidebarGroup>
      ))}
      <SidebarGroup label="Labels" icon={<Icon name="labels" />} collapsible>
        {['@home', '@marco', '@office'].map((name) => nav(`label:${name}`, <Dot color={LABELS[name] ?? '#6b7a8f'} />, name, open.filter((t) => t.labels.includes(name)).length))}
      </SidebarGroup>
    </>
  )
  const sidebar = phone ? undefined : (
    <Sidebar
      aria-label="Views and projects"
      open={menu}
      onOpenChange={setMenu}
      animated={animated}
      footer={
        <div className="flex items-center gap-2 px-2 py-1 text-sm text-sidebar-ink">
          <Avatar name="Giulia Conti" size="xs" decorative />
          <span className="min-w-0 flex-1 truncate">Giulia</span>
        </div>
      }
    >
      <SidebarGroup>
        {VIEWS.map((v) => nav(v.id, <Icon name={v.icon} />, v.label, v.id === 'stack' ? stack.length : v.id === 'today' ? dueNow.length : v.id === 'upcoming' ? later.length : undefined))}
      </SidebarGroup>
      {places}
    </Sidebar>
  )

  const bar = phone && task ? (
    <>
      <ToolbarButton label={`Back to ${title}`} icon={<ChevronLeft aria-hidden="true" />} keepWord onClick={() => setChosen(null)} animated={animated}>
        {title}
      </ToolbarButton>
      <ToolbarSpacer />
    </>
  ) : (
    <>
      {phone ? null : <MenuButton onOpen={() => setMenu(true)} animated={animated} />}
      <ToolbarBrand name="Ethel" page={title} />
      <ToolbarSpacer />
      <ToolbarSearch label="Search the tasks" shortcut="/" value={text} onValueChange={setText} open={searching} onOpenChange={setSearching} animated={animated} />
      {phone ? null : (
        <ToolbarButton label="New task" variant="outline" icon={<Plus aria-hidden="true" />} onClick={() => (view === 'stack' || view === 'stickies' || view === 'pomodoro' ? go('today') : quickField.current?.focus())} animated={animated}>
          New task
        </ToolbarButton>
      )}
    </>
  )

  const list = (
    <ul role="list" aria-label={title} className="flex flex-col gap-0.5">
      {inView.map((t) => (
        <TaskRow key={t.id} task={t} current={!phone && chosen === t.id} phone={phone} onOpen={() => setChosen(t.id)} onComplete={() => complete(t)} animated={animated} />
      ))}
    </ul>
  )
  const nowStrip = current ? (
    <section aria-label="Now" data-slot="now-strip" className="flex flex-col gap-3 rounded-lg bg-raised p-4 shadow-xs">
      <h2 className="flex items-center gap-2 text-2xs font-medium text-ink-mute">
        <span aria-hidden="true" className="inline-flex [&_svg]:size-3.5">
          <Icon name="now" />
        </span>
        Now
      </h2>
      <p className="text-base font-semibold text-ink">{current.title}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => complete(current)} animated={animated}>
          Complete
        </Button>
        <Button variant="outline" onClick={() => say('Pomodoro started: 25 minutes')}>
          Focus
        </Button>
        <Button variant="ghost" onClick={() => setNow(now + 1)}>
          Next
        </Button>
        <Button variant="ghost" onClick={() => postpone(current)}>
          Postpone
        </Button>
      </div>
    </section>
  ) : null
  const tasksView = (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <p className="text-xs text-ink-mute tabular-nums">
        {view === 'today' ? `${LONG.format(day(TODAY))} · ${dueNow.length} tasks${late > 0 ? ` · ${late} late` : ''}` : `${inView.length} tasks`}
      </p>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          addQuick()
        }}
      >
        <Input ref={quickField} aria-label="Add a task" value={quick} onChange={(event) => setQuick(event.target.value)} placeholder="Add a task: tomorrow at 15 · p1 · #project · @home" enterKeyHint="done" autoComplete="off" />
        {quick.trim() ? (
          <Button type="submit" variant="outline">
            Add
          </Button>
        ) : null}
      </form>
      {view === 'today' ? nowStrip : null}
      {inView.length > 0 ? list : <Empty className="py-10" title={text ? 'Nothing has that name' : 'Nothing here'} description={text ? 'Try fewer letters.' : view === 'today' ? 'Today is clear. The Stack keeps what is still to decide.' : 'Add a task in the field above.'} />}
    </div>
  )

  const first = stack[0]
  const suggested = first === undefined ? undefined : PROJECTS.find((p) => p.id === SUGGESTED[STACK.indexOf(first)])
  const capture = (
    <>
      <Textarea aria-label="Dump everything here" value={dump} onChange={(event) => setDump(event.target.value)} placeholder="Dump everything here, one item per line" className="min-h-24" />
      <p className="text-xs text-ink-mute">No decisions now: where and when comes later, in Sort.</p>
    </>
  )
  const stackView = (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <ToggleGroup aria-label="Stack" value={mode} onValueChange={setMode} animated={animated} className={phone ? 'w-full' : 'self-start'}>
        <ToggleGroupItem value="dump" className={phone ? 'flex-1' : undefined}>
          Dump
        </ToggleGroupItem>
        <ToggleGroupItem value="sort" className={phone ? 'flex-1' : undefined}>
          Sort
          <span className="text-2xs font-normal text-ink-mute tabular-nums">{stack.length}</span>
        </ToggleGroupItem>
      </ToggleGroup>
      {mode === 'dump' ? (
        <>
          {capture}
          <div className="flex gap-2">
            <Button disabled={dump.trim() === ''} onClick={addDump}>
              Add
            </Button>
            <Button variant="ghost" onClick={() => say('Dictation needs the microphone: not in this sketch')}>
              <Icon name="mic" />
              Dictate
            </Button>
          </div>
          <h2 className="pt-2 text-2xs font-medium text-ink-mute">In the stack</h2>
          {/* Sort takes the Stack from the top, so its order is the user's to set: by the handles, or Space and the arrows. */}
          <ReorderList aria-label="In the stack" items={stack} itemId={(item) => item} itemName={(item) => item} onReorder={(next) => setStack(next)} animated={animated}>
            {(item) => <span className="min-w-0 flex-1 py-1.5">{item}</span>}
          </ReorderList>
        </>
      ) : first === undefined ? (
        <Empty className="py-10" title="The stack is empty" description="Everything has a place and a day." />
      ) : (
        <section aria-label="Sort" data-slot="sort-card" className="flex flex-col gap-4 rounded-lg bg-raised p-4 shadow-xs">
          <p className="text-2xs font-medium text-ink-mute tabular-nums">1 of {stack.length}</p>
          <p className="text-lg font-semibold text-ink">{first}</p>
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            Goes to
            {suggested ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                <Dot color={suggested.color} />
                {suggested.area} › {suggested.name}
              </span>
            ) : (
              <span className="font-medium text-ink">No project</span>
            )}
          </p>
          <ToggleGroup aria-label="When" value={sortDay} onValueChange={setSortDay} animated={animated} className={phone ? 'w-full' : 'self-start'}>
            {SORT_DAYS.map((d) => (
              <ToggleGroupItem key={d.id} value={d.id} className={phone ? 'flex-1 px-2' : undefined}>
                {d.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={skip}>
              Skip
            </Button>
            <Button onClick={accept} animated={animated}>
              Accept
            </Button>
          </div>
        </section>
      )}
    </div>
  )

  /** The task chosen: in the inspector on a computer, a page on a phone. What is changed holds at once: no Save. */
  const editor = task ? (
    <div className="flex flex-col gap-4">
      <FormField label="Title">
        <Input value={task.title} onChange={(event) => edit(task.id, { title: event.target.value })} autoComplete="off" />
      </FormField>
      <FormField label="Notes">
        <Textarea value={task.notes} onChange={(event) => edit(task.id, { notes: event.target.value })} placeholder="What there is to know" />
      </FormField>
      <FormField label="Due date" help="The day only. For a time, set a reminder.">
        <DateField value={task.date} onChange={(date) => edit(task.id, { date })} picks={dayPicks()} animated={animated} />
      </FormField>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Priority</span>
        <ToggleGroup aria-label="Priority" value={task.priority} onValueChange={(priority) => edit(task.id, { priority })} animated={animated} className={phone ? 'w-full' : 'self-start'}>
          {(['P1', 'P2', 'P3', 'None'] as const).map((p) => (
            <ToggleGroupItem key={p} value={p} className={phone ? 'flex-1 px-2' : undefined}>
              {p}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <FormField label="Labels" id={`${id}-labels`}>
        <ChipsInput id={`${id}-labels`} value={task.labels} onChange={(labels) => edit(task.id, { labels })} suggestions={Object.keys(LABELS)} placeholder="Type, then Enter or comma" />
      </FormField>
      {task.subtasks.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Subtasks</span>
          {task.subtasks.map((sub, i) => (
            <label key={sub.title} className="flex min-h-(--control-xs) items-center gap-2 text-sm text-ink">
              <Checkbox checked={sub.done} onCheckedChange={(checked) => edit(task.id, { subtasks: task.subtasks.map((s, at) => (at === i ? { ...s, done: checked === true } : s)) })} animated={animated} />
              <span className={sub.done ? 'text-ink-mute' : undefined}>{sub.title}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  ) : null
  const remove = (target: Task) => {
    setTasks((list) => list.filter((t) => t.id !== target.id))
    setChosen(null)
    say(`Deleted «${target.title}»`, () => setTasks((list) => [target, ...list]))
  }

  const projectsView = (
    <div className="flex flex-col gap-4 p-4">
      {AREAS.map((area) => (
        <section key={area.id} aria-label={area.name} className="flex flex-col gap-1 rounded-lg bg-paper-2 p-2">
          <h2 className="px-2 pt-1 text-2xs font-medium text-ink-mute">{area.name}</h2>
          <NavList aria-label={`Projects of ${area.name}`}>{area.projects.map((p) => nav(`project:${p.id}`, <Dot color={area.color} />, p.name, open.filter((t) => t.project === p.id).length))}</NavList>
        </section>
      ))}
    </div>
  )

  const content =
    phone && task ? (
      <div className="p-4">{editor}</div>
    ) : view === 'stack' ? (
      stackView
    ) : view === 'projects' ? (
      projectsView
    ) : view === 'stickies' || view === 'pomodoro' ? (
      <Empty className="h-full p-6" title={title} description="The sketch stops here: the Stack, Today, Upcoming and the projects are the views drawn." />
    ) : (
      tasksView
    )

  const tab = (target: string, icon: IconName, name: string) => (
    <ToolbarTab key={target} value={target} icon={<Icon name={icon} />}>
      {name}
    </ToolbarTab>
  )
  /** On a phone the views are at the foot, with the plus between them: adding is what the thumb does most. */
  const bottomBar = phone ? (
    <Toolbar aria-label="Views of Ethel">
      <ToolbarTabs aria-label="Views" value={view} onValueChange={go} edge="top" layout="stacked">
        {tab('stack', 'inbox', 'Stack')}
        {tab('today', 'now', 'Today')}
      </ToolbarTabs>
      <ToolbarButton label="Add to the Stack" variant="outline" icon={<Plus aria-hidden="true" />} onClick={() => setAdding(true)} animated={animated} className="mx-1 self-center" />
      <ToolbarTabs aria-label="More views" value={view.startsWith('project:') ? 'projects' : view} onValueChange={go} edge="top" layout="stacked">
        {tab('upcoming', 'date', 'Upcoming')}
        {tab('projects', 'structure', 'Projects')}
      </ToolbarTabs>
    </Toolbar>
  ) : undefined

  // Inside the bar, as every overlay of the frame: in a window of its own it then opens under the title bar.
  const sheet = (
    <Sheet open={adding} onOpenChange={setAdding}>
      <SheetContent side="bottom" animated={animated}>
        <SheetHeader>
          <SheetTitle>Add</SheetTitle>
          <SheetDescription>Goes to the Stack.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4">{capture}</div>
        <SheetFooter>
          <Button disabled={dump.trim() === ''} onClick={addDump}>
            Add
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )

  return (
    <Host device={device} host={host} animated={animated} theme={THEME} look={look} density={density} address={`ethel.app/${view.replace(':', '/')}`} notices={toasts} onDismiss={dismiss}>
      <div className="h-full" onKeyDown={keys}>
        <AppShell
          desktop={!phone && host === 'native'}
          contentLabel={task && phone ? task.title : title}
          titleBar={
            <AppBar device={device} host={host} label="Ethel" overlays={sheet}>
              {bar}
            </AppBar>
          }
          sidebar={sidebar}
          inspector={
            phone ? undefined : (
              <Inspector
                title="Task"
                open={task !== null}
                onOpenChange={(next) => (next ? undefined : setChosen(null))}
                animated={animated}
                footer={
                  task ? (
                    <Button variant="ghost" size="sm" onClick={() => remove(task)}>
                      Delete
                    </Button>
                  ) : undefined
                }
              >
                {editor}
              </Inspector>
            )
          }
          actions={
            phone && task ? (
              <>
                <Button variant="ghost" onClick={() => remove(task)}>
                  Delete
                </Button>
                <Button variant="outline" onClick={() => postpone(task)}>
                  Postpone
                </Button>
                <Button onClick={() => complete(task)}>Complete</Button>
              </>
            ) : undefined
          }
          footer={
            phone ? undefined : (
              <>
                <span>{host === 'native' ? 'Saved on this computer' : 'Saved'}</span>
                <span className="tabular-nums">{stack.length} in the stack</span>
                <span className="ms-auto inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Kbd>B</Kbd> stack
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Kbd>/</Kbd> search
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Kbd>Z</Kbd> undo
                  </span>
                </span>
              </>
            )
          }
          bottomBar={bottomBar}
        >
          {content}
        </AppShell>
      </div>
    </Host>
  )
}
