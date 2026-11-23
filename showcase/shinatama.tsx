// Shinatama, a desktop workspace for terminal coding agents, as it would be made with the toolkit: a trial for the Examples
// view, drawn after the real window as it is (Shinatama 2026-11-22, captured on 2026-11-23) and a test of one rule: an app
// has no UI code of its own. Every part that has a component here is that component; every part the toolkit lacks is the
// least markup and is marked `GAP:` (grep for it: the list is the result of the trial). The content is made up. Shinatama
// is a Windows program, so there is one host, a Tauri window on a computer. Its frame is the sheet (`frame="sheet"`), as
// Xiox's: both are Imago's Smooth look.
// - The bar: the brand, the switch of the workspace's layout, the views as tabs right after it, then «New session» (the
//   one solid action, R3), the state of the resources as a dot, and «More».
// - The sidebar: the threads, one group for each project, with its count and its actions; an empty project says so.
// - The content: the Workspace view is one pane with its tabs (the file browser, then the terminals of the agents); the
//   Sessions view tiles the terminals. The inspector: the Sessions panel (running, saved), open on a wide frame.
// - The notice at the foot is what Shinatama's widget does: a terminal asks for the person, and one press opens it.
// Left out on purpose: the ONI look and the glass (Sigrid has neither), the mascot of the widget, the other views.
import * as React from 'react'
import {
  AppShell,
  Button,
  Checkbox,
  Count,
  Empty,
  Icon,
  Inspector,
  ItemList,
  ItemRow,
  Kbd,
  MarkdownBlocks,
  NavItem,
  SearchField,
  Select,
  Sidebar,
  SidebarGroup,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarBrand,
  ToolbarButton,
  ToolbarSpacer,
  ToolbarTab,
  ToolbarTabs,
  Tree,
  cn,
  colorTheme,
  type ToastItem,
  type TreeNode,
} from '../src/index'
import { AppBar, Host, type AppProps } from './hosts'

/** Shinatama's own theme: its rose (hue 355 in Imago; this hex is the nearest one picked by eye, not measured). */
const THEME = colorTheme({ id: 'shinatama', label: 'Shinatama', color: '#b8326a', spot: 'balanced' })

const THREADS = [
  { id: 'shell', name: 'PowerShell', note: '4 sessions · 4 running' },
  { id: 'rounding', name: 'Tax rounding bug', note: '1 session' },
  { id: 'dunning', name: 'Dunning emails', note: '1 session' },
  { id: 'webhook', name: 'Webhook signature check', note: '1 session' },
  { id: 'postgres', name: 'Migrate to Postgres 16', note: '1 session' },
  { id: 'invoice', name: 'Invoice PDF layout', note: '1 session' },
  { id: 'flaky', name: 'Fix flaky checkout test', note: '1 session' },
  { id: 'retries', name: 'Refactor billing retries', note: '1 session' },
] as const

type Line = { text: string; tone?: 'ok' | 'warn' | 'mute' | 'prompt' }
type Pane = { id: string; label: string; tab: string; memory: string; size: string; place: string; lines: readonly Line[] }
const PANES: readonly Pane[] = [
  {
    id: 'p1', label: 'Pane 1', tab: 'billing-service · Codex', memory: '68 MiB', size: '55×12', place: 'col-start-1',
    lines: [
      { text: '>_ OpenAI Codex (gpt-5.5)', tone: 'mute' },
      { text: 'reviewing src/retry.ts src/charge.ts' },
      { text: '- retry.ts:42   backoff overflows after 31 attempts' },
      { text: '- charge.ts:118 idempotency key reused across customers' },
      { text: '2 findings, 0 blocking', tone: 'ok' },
      { text: '> ', tone: 'prompt' },
    ],
  },
  {
    id: 'p2', label: 'Pane 2', tab: 'billing-service · Pi', memory: '67 MiB', size: '55×12', place: 'col-start-1',
    lines: [
      { text: 'pi  janura-qwen-mini · billing-service', tone: 'mute' },
      { text: 'tester: running the suite on the new policy' },
      { text: '  checkout.spec.ts   ok', tone: 'ok' },
      { text: '  dunning.spec.ts    flaky, retrying', tone: 'warn' },
      { text: '27 passed   0 failed', tone: 'ok' },
      { text: '> ', tone: 'prompt' },
    ],
  },
  {
    id: 'p3', label: 'Pane 3', tab: 'billing-service · opencode', memory: '67 MiB', size: '55×20', place: 'col-start-1',
    lines: [
      { text: 'opencode  janura-qwen · billing-service', tone: 'mute' },
      { text: 'READY  waiting for work from planner', tone: 'ok' },
      { text: 'STEP   editing src/retry.ts (+38 -12)', tone: 'ok' },
      { text: 'STEP   npm test -- retry   14 passed', tone: 'ok' },
      { text: 'STEP   editing src/charge.ts', tone: 'ok' },
      { text: 'DONE   tasks 1-3 are green', tone: 'ok' },
      { text: '> ', tone: 'prompt' },
    ],
  },
  {
    id: 'p4', label: 'Pane 4', tab: 'billing-service · Claude Code', memory: '67 MiB', size: '55×53', place: 'col-start-2 row-span-3 row-start-1',
    lines: [
      { text: '* Claude Code  Fable 5.2 · billing-service', tone: 'mute' },
      { text: '> run docs/plans/billing-retries.md' },
      { text: 'I will hand the tasks to the implementer, and keep the reviewer for the diff:' },
      { text: '  1. exponential backoff in retry.ts' },
      { text: '  2. jitter and a cap of 5 attempts' },
      { text: '  3. idempotency key on the charge' },
      { text: '  4. webhook retries use the same policy' },
      { text: '' },
      { text: '[implementer] npm test -- retry   14 passed', tone: 'ok' },
      { text: '  Task 1  backoff               green', tone: 'ok' },
      { text: '  Task 2  jitter and cap        green', tone: 'ok' },
      { text: '  Task 3  idempotency key       running', tone: 'warn' },
      { text: '[reviewer] 2 findings, 0 blocking.' },
      { text: '> ', tone: 'prompt' },
    ],
  },
]
const TONE: Record<NonNullable<Line['tone']>, string> = { ok: 'text-success', warn: 'text-warning', mute: 'text-ink-mute', prompt: 'text-accent' }
const MODES = [{ value: 'neutral', label: 'Neutral' }, { value: 'plan', label: 'Plan' }]

/** The projects in the sidebar, each a group of its threads; only billing-service has any. */
const PROJECTS = ['billing-service', 'checkout-web', 'ledger-core', 'infra-terraform', 'design-system'] as const

const VIEWS = ['Workspace', 'Settings', 'Sessions', 'Overview', 'Files', 'Leftovers'] as const

/** The file browser of the Workspace pane: a folder tree, `.claude/agents` open. */
const FILES: readonly TreeNode[] = [
  {
    id: '.claude',
    name: '.claude',
    icon: 'folder',
    openIcon: 'folderOpen',
    children: [
      { id: '.claude/agents', name: 'agents', icon: 'folder', openIcon: 'folderOpen', children: [{ id: '.claude/agents/billing-retries.md', name: 'billing-retries.md', icon: 'file', meta: '6 KB' }] },
      { id: '.claude/settings.local.json', name: 'settings.local.json', icon: 'file', meta: '703 B' },
    ],
  },
  { id: '.github', name: '.github', icon: 'folder', openIcon: 'folderOpen', children: [{ id: '.github/workflows', name: 'workflows', icon: 'folder', openIcon: 'folderOpen', children: [{ id: '.github/workflows/ci.yml', name: 'ci.yml', icon: 'file', meta: '1 KB' }] }] },
  { id: 'docs', name: 'docs', icon: 'folder', openIcon: 'folderOpen', children: [{ id: 'docs/billing.md', name: 'billing.md', icon: 'file', meta: '4 KB' }] },
  { id: 'src', name: 'src', icon: 'folder', openIcon: 'folderOpen', children: [{ id: 'src/retry.ts', name: 'retry.ts', icon: 'file', meta: '3 KB' }, { id: 'src/charge.ts', name: 'charge.ts', icon: 'file', meta: '5 KB' }] },
  { id: 'test', name: 'test', icon: 'folder', openIcon: 'folderOpen', children: [{ id: 'test/checkout.spec.ts', name: 'checkout.spec.ts', icon: 'file', meta: '2 KB' }] },
  { id: 'package.json', name: 'package.json', icon: 'file', meta: '2 KB' },
  { id: 'README.md', name: 'README.md', icon: 'file', meta: '9 KB' },
]

const PLAN = `# Billing retries

Retry a failed charge with **exponential backoff**, a jitter and a cap of five attempts.

- Backoff in \`retry.ts\`
- Jitter and the cap
- An idempotency key on the charge
- Webhooks retry with the same policy`

const SAVED = [
  { id: 's1', name: 'Claude Code · billing-service', note: 'Yesterday · 42 turns' },
  { id: 's2', name: 'Codex · checkout-web', note: 'Monday · 18 turns' },
  { id: 's3', name: 'OpenCode · ledger-core', note: '19 Nov · 7 turns' },
] as const

/** The tabs of the Workspace pane: the file browser, then the agents' terminals. */
const DOCK = [
  { id: 'files', label: 'Files' },
  { id: 'p3', label: 'OpenCode · billing-service' },
  { id: 'p4', label: 'Claude Code · billing-service' },
] as const

/**
 * The file browser: the tree at the start (Sigrid's `Tree`, with its filter), the file at the end, in four modes.
 * GAP: a code editor beside its preview: the source is plain text here.
 */
function Files() {
  const [mode, setMode] = React.useState('split')
  const [file, setFile] = React.useState<string | null>('.claude/agents/billing-retries.md')
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-h-0 flex-col gap-2 border-e border-line p-2">
        <Select size="sm" aria-label="Project" options={PROJECTS.map((p) => ({ value: p, label: p }))} value="billing-service" onValueChange={() => {}} className="w-48" />
        <Tree
          aria-label="Files of billing-service"
          nodes={FILES}
          search
          searchLabel="Find a file by name"
          selected={file}
          onSelect={setFile}
          defaultExpanded={['.claude', '.claude/agents']}
          className="min-h-0 flex-1"
        />
      </div>
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-line p-2">
          <span className="min-w-0 flex-1 truncate text-xs text-ink-mute">{(file ?? '').split('/').join(' / ')}</span>
          <ToggleGroup aria-label="Show the file as" value={mode} onValueChange={setMode}>
            <ToggleGroupItem value="source">Source</ToggleGroupItem>
            <ToggleGroupItem value="split">Split</ToggleGroupItem>
            <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm">Save</Button>
        </div>
        <div className={cn('grid min-h-0 flex-1', mode === 'split' ? 'grid-cols-2' : 'grid-cols-1')}>
          {mode !== 'preview' ? <pre data-selectable="" className="m-0 min-h-0 overflow-auto border-e border-line p-3 font-mono text-xs leading-snug whitespace-pre-wrap text-ink">{PLAN}</pre> : null}
          {mode !== 'source' ? <div className="min-h-0 overflow-auto p-3 text-sm text-ink"><MarkdownBlocks text={PLAN} /></div> : null}
        </div>
      </div>
    </div>
  )
}

/**
 * One terminal pane, with the strip of its tab and the strip of its state.
 * GAP: a tiling workspace (panes with their tabs, split, maximize, drag, a splitter between them): Sigrid has none.
 */
function TerminalPane({ pane, focused, onFocus }: { pane: Pane; focused: boolean; onFocus: () => void }) {
  const [mode, setMode] = React.useState('neutral')
  return (
    <section aria-label={pane.label} onPointerDown={onFocus} className={cn('flex min-h-0 min-w-0 flex-col bg-paper', pane.place)}>
      <header className={cn('flex min-h-(--control-sm) items-center gap-2 ps-3 pe-1 text-2xs', focused ? 'border-b-2 border-primary font-semibold text-ink' : 'border-b border-line text-ink-mute')}>
        <span>{pane.label}</span>
        <span className="min-w-0 flex-1 truncate">{pane.tab}</span>
        <Button variant="ghost" size="xs" aria-label={`Close the tab of ${pane.label}`}><Icon name="close" /></Button>
        <Button variant="ghost" size="xs" aria-label={`New tab in ${pane.label}`}><Icon name="plus" /></Button>
        <Button variant="ghost" size="xs" aria-label={`Maximize ${pane.label}`}><Icon name="windowMaximize" /></Button>
      </header>
      {/* GAP: the terminal surface (monospace text on a dense ground, with the status colours of an agent's output). */}
      <pre tabIndex={0} data-selectable="" aria-label={`${pane.label} output`} className="m-0 min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-snug text-ink">
        {pane.lines.map((line, i) => (
          <span key={i} className={cn('block min-h-[1lh] whitespace-pre-wrap', line.tone ? TONE[line.tone] : undefined)}>{line.text}</span>
        ))}
      </pre>
      {/* GAP: a status strip for a pane (state, mode, memory, size). */}
      <footer className="flex min-h-(--control-sm) items-center gap-3 overflow-hidden border-t border-line ps-3 pe-2 text-2xs whitespace-nowrap text-ink-mute tabular-nums">
        <span>Shell running</span>
        <Select size="sm" aria-label={`Mode of ${pane.label}`} options={MODES} value={mode} onValueChange={setMode} className="w-28 shrink-0" />
        <span className="ms-auto">{pane.memory}</span>
        <span>{pane.size}</span>
      </footer>
    </section>
  )
}

export function Shinatama({ animated, density, look }: Pick<AppProps, 'animated' | 'density' | 'look'>) {
  const [view, setView] = React.useState<string>('Workspace')
  const [thread, setThread] = React.useState('shell')
  const [focus, setFocus] = React.useState('p4')
  const [dock, setDock] = React.useState('files')
  // The Sessions panel: open where it is docked beside the content, as in the app (wide windows).
  const [sessions, setSessions] = React.useState(() => window.matchMedia('(min-width: 1280px)').matches)
  const [filter, setFilter] = React.useState('')
  const [project, setProject] = React.useState('all')
  const [archived, setArchived] = React.useState(false)
  const [notices, setNotices] = React.useState<readonly { id: string; text: string }[]>([{ id: 'n1', text: 'Needs your answer: billing-service · Codex' }])
  const dismiss = React.useCallback((id: string) => setNotices((list) => list.filter((n) => n.id !== id)), [])
  const toasts: ToastItem[] = notices.map((n) => ({ id: n.id, text: n.text, actions: [{ label: 'Terminal', items: [{ id: 'open', label: 'Open session', onClick: () => { setFocus('p1'); setView('Sessions'); dismiss(n.id) } }] }] }))

  const sidebar = (
    <Sidebar
      aria-label="Threads"
      animated={animated}
      header={
        // GAP: a sidebar heading with its count and its actions: the app's own markup.
        <div className="flex items-center gap-1 ps-2">
          <h2 className="text-sm font-semibold text-sidebar-ink">Threads</h2>
          <Count value={1} label="running" />
          <span className="flex-1" />
          <Button variant="ghost" size="xs" aria-label="Add a project folder"><Icon name="newFolder" /></Button>
          <Button variant="ghost" size="xs" aria-label="Close every thread"><Icon name="close" /></Button>
        </div>
      }
      footer={
        <div className="flex items-center gap-2 px-2 py-1 text-sm text-sidebar-ink">
          <Checkbox aria-label="Show archived threads" checked={archived} onCheckedChange={(next) => setArchived(next === true)} animated={animated} />
          <span className="min-w-0 flex-1 truncate">Show archived threads</span>
        </div>
      }
    >
      {/* GAP: a group heading with its count (9) and its actions (new thread, close): SidebarGroup has a label and an icon only. */}
      <SidebarGroup label="billing-service" icon={<Icon name="threads" />} collapsible>
        {THREADS.map((t) => (
          <NavItem
            key={t.id}
            current={thread === t.id}
            onClick={() => setThread(t.id)}
            icon={<Icon name="tasks" />}
            description={t.note}
            actions={
              <>
                <Button variant="ghost" size="xs" aria-label={`New session in «${t.name}»`}><Icon name="plus" /></Button>
                <Button variant="ghost" size="xs" aria-label={`More for «${t.name}»: chat, team`}><Icon name="more" /></Button>
              </>
            }
          >
            {t.name}
          </NavItem>
        ))}
      </SidebarGroup>
      {PROJECTS.slice(1).map((p) => (
        <SidebarGroup key={p} label={p} icon={<Icon name="threads" />}>
          {/* GAP: the empty state of a group, a dashed box that says it has no thread yet. */}
          <li className="mx-1 rounded-md border border-dashed border-line px-2 py-1.5 text-2xs text-sidebar-mute">No threads yet.</li>
        </SidebarGroup>
      ))}
    </Sidebar>
  )

  const bar = (
    <>
      <ToolbarBrand name="Shinatama" />
      <ToolbarButton label="Sessions panel" icon={<Icon name="layout" />} pressed={sessions} onClick={() => setSessions(!sessions)} animated={animated} />
      <ToolbarTabs aria-label="Views" value={view} onValueChange={setView}>
        {VIEWS.map((v) => (
          <ToolbarTab key={v} value={v}>{v}</ToolbarTab>
        ))}
      </ToolbarTabs>
      <ToolbarSpacer />
      <ToolbarButton label="New session" variant="default" icon={<Icon name="plus" />} keepWord animated={animated}>
        New session
      </ToolbarButton>
      {/* The resources as a dot in the status colour, with their state as the name (R2: a colour is never alone). */}
      <ToolbarButton label="Resources: available" icon={<span aria-hidden="true" className="size-2 rounded-full bg-success" />} animated={animated} />
      <ToolbarButton label="More" variant="outline" animated={animated}>More</ToolbarButton>
    </>
  )

  const docked = PANES.find((p) => p.id === dock)
  const content =
    view === 'Workspace' ? (
      // GAP: a dock of tabs that close (a pane holding several documents): the tabs are the toolbar's, the close is the app's.
      <section aria-label="Pane 1" className="flex h-full min-h-0 flex-col">
        <Toolbar aria-label="Tabs of pane 1" className="min-h-(--control-md) flex-none border-b border-line px-1">
          <ToolbarTabs aria-label="Open in pane 1" value={dock} onValueChange={setDock}>
            {DOCK.map((d) => (
              <ToolbarTab key={d.id} value={d.id} icon={<Icon name={d.id === 'files' ? 'folder' : 'threads'} />}>{d.label}</ToolbarTab>
            ))}
          </ToolbarTabs>
          <ToolbarButton label="New tab" icon={<Icon name="plus" />} animated={animated} />
        </Toolbar>
        <div className="min-h-0 flex-1">{docked ? <TerminalPane pane={{ ...docked, place: 'h-full' }} focused onFocus={() => {}} /> : <Files />}</div>
      </section>
    ) : view === 'Sessions' ? (
      <div className="grid h-full grid-cols-2 grid-rows-3 gap-px bg-line">
        {PANES.map((p) => (
          <TerminalPane key={p.id} pane={p} focused={focus === p.id} onFocus={() => setFocus(p.id)} />
        ))}
      </div>
    ) : (
      <Empty className="h-full p-6" title={view} description="The trial stops here: the Workspace and Sessions views are drawn." />
    )

  return (
    <Host device="desktop" host="native" animated={animated} theme={THEME} look={look} density={density} address="shinatama" notices={toasts} onDismiss={dismiss} className="h-190 w-full max-w-300">
      <div className="h-full">
        <AppShell
          // A box of the page's own (the host's window), maybe taller than the window: the frame fills the box.
          className="h-full"
          desktop
          frame="sheet"
          contentLabel={view}
          titleBar={<AppBar device="desktop" host="native" label="Shinatama">{bar}</AppBar>}
          sidebar={sidebar}
          inspector={
            <Inspector title="Sessions" open={sessions} onOpenChange={setSessions} animated={animated}>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <SearchField value={filter} onValueChange={setFilter} aria-label="Filter the sessions" placeholder="Filter" className="min-w-0 flex-1" />
                  <Select size="sm" aria-label="Project" options={[{ value: 'all', label: 'All projects' }, ...PROJECTS.map((p) => ({ value: p, label: p }))]} value={project} onValueChange={setProject} className="w-36 shrink-0" />
                </div>
                <section aria-label="Running" className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-ink">Running</h3>
                  <p className="text-sm text-ink-mute">No session is running.</p>
                </section>
                <section aria-label="Saved" className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="flex-1 text-sm font-semibold text-ink">Saved</h3>
                    <Button variant="ghost" size="xs"><Icon name="refresh" />Reload</Button>
                  </div>
                  <ItemList aria-label="Saved sessions">
                    {SAVED.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase())).map((s) => (
                      <ItemRow key={s.id} title={s.name} description={s.note} leading={<Icon name="history" />} />
                    ))}
                  </ItemList>
                </section>
              </div>
            </Inspector>
          }
          footer={
            <>
              {/* What the app says gives way first, cut with an ellipsis; the keys stay whole. */}
              <span className="flex min-w-0 items-center gap-3 overflow-hidden whitespace-nowrap">
                <span>Local runtime · experimental</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-success" />Resources: available</span>
                <span className="tabular-nums">4 terminals</span>
                <span className="truncate">Workspace 1 pane</span>
              </span>
              <span className="ms-auto inline-flex shrink-0 items-center gap-3 whitespace-nowrap">
                <span className="inline-flex items-center gap-1"><Kbd>Ctrl K</Kbd> commands</span>
                <span className="inline-flex items-center gap-1"><Kbd>Ctrl Shift T</Kbd> new session</span>
              </span>
            </>
          }
        >
          {content}
        </AppShell>
      </div>
    </Host>
  )
}
