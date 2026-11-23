// Shinatama, a desktop workspace for terminal coding agents, as it would be made with the toolkit: a trial for the Examples
// view, drawn after the real window (docs/assets/screenshots/shinatama-overview.png in the Shinatama repository) and a test
// of one rule: an app has no UI code of its own. Every part that has a component here is that component; every part the
// toolkit lacks is the least markup and is marked `GAP:` (grep for it: the list is the result of the trial). The content is
// made up. Shinatama is a Windows program, so there is one host, a Tauri window on a computer.
// - The bar: the brand, the Projects panel as a switch, «New session» the one solid action (R3), the views as tabs.
// - The sidebar: the threads. The content: four terminal panes, tiled. The inspector: the Projects panel, which the app shows open on a wide screen and the trial opens with the button (the panes need the room).
// - The notice at the foot is what Shinatama's widget does: a terminal asks for the person, and one press opens it.
// Left out on purpose: the ONI look and the glass (Sigrid has neither), the mascot of the widget, the other three views.
import * as React from 'react'
import {
  AppShell,
  Button,
  Checkbox,
  Empty,
  Icon,
  Inspector,
  ItemList,
  Kbd,
  NavItem,
  Select,
  Sidebar,
  SidebarGroup,
  ToolbarBrand,
  ToolbarButton,
  ToolbarSpacer,
  ToolbarTab,
  ToolbarTabs,
  cn,
  colorTheme,
  type ToastItem,
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

const PROJECTS = [
  { name: 'checkout-web', path: 'C:\\work\\acme\\checkout-web', git: 'fix/flaky-cart-test · 3 changed', thread: 'No thread yet', pinned: true, resume: false },
  { name: 'ledger-core', path: 'C:\\work\\acme\\ledger-core', git: 'develop · 12 changed', thread: 'No thread yet', pinned: true, resume: false },
  { name: 'billing-service', path: 'C:\\work\\acme\\billing-service', git: 'feature/retry-backoff · 7 changed', thread: 'Last: PowerShell', pinned: true, resume: true },
  { name: 'infra-terraform', path: 'C:\\work\\acme\\infra-terraform', git: 'main · 2 changed', thread: 'No thread yet', pinned: false, resume: false },
] as const

const VIEWS = ['Sessions', 'Overview', 'Files', 'Leftovers'] as const

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
  const [view, setView] = React.useState<string>('Sessions')
  const [thread, setThread] = React.useState('shell')
  const [focus, setFocus] = React.useState('p4')
  const [projects, setProjects] = React.useState(false)
  const [archived, setArchived] = React.useState(false)
  const [notices, setNotices] = React.useState<readonly { id: string; text: string }[]>([{ id: 'n1', text: 'Needs your answer: billing-service · Codex' }])
  const dismiss = React.useCallback((id: string) => setNotices((list) => list.filter((n) => n.id !== id)), [])
  const toasts: ToastItem[] = notices.map((n) => ({ id: n.id, text: n.text, actions: [{ label: 'Terminal', items: [{ id: 'open', label: 'Open session', onClick: () => { setFocus('p1'); setView('Sessions'); dismiss(n.id) } }] }] }))

  const sidebar = (
    <Sidebar
      aria-label="Threads"
      animated={animated}
      header={<h2 className="px-2 py-1 text-xs font-semibold text-sidebar-ink">Threads</h2>}
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
    </Sidebar>
  )

  const bar = (
    <>
      <ToolbarBrand name="Shinatama" />
      <ToolbarButton label="Projects" icon={<Icon name="structure" />} pressed={projects} onClick={() => setProjects(!projects)} keepWord animated={animated}>
        Projects
      </ToolbarButton>
      <ToolbarButton label="New session" variant="default" icon={<Icon name="plus" />} keepWord shortcut="Ctrl Shift T" animated={animated}>
        New session
      </ToolbarButton>
      <ToolbarSpacer />
      <ToolbarTabs aria-label="Views" value={view} onValueChange={setView}>
        {VIEWS.map((v) => (
          <ToolbarTab key={v} value={v}>{v}</ToolbarTab>
        ))}
      </ToolbarTabs>
      <ToolbarButton label="More" icon={<Icon name="more" />} animated={animated} />
    </>
  )

  const content =
    view === 'Sessions' ? (
      <div className="grid h-full grid-cols-2 grid-rows-3 gap-px bg-line">
        {PANES.map((p) => (
          <TerminalPane key={p.id} pane={p} focused={focus === p.id} onFocus={() => setFocus(p.id)} />
        ))}
      </div>
    ) : (
      <Empty className="h-full p-6" title={view} description="The trial stops here: the Sessions view is drawn." />
    )

  return (
    <Host device="desktop" host="native" animated={animated} theme={THEME} look={look} density={density} address="shinatama" notices={toasts} onDismiss={dismiss} className="h-190 w-full max-w-300">
      <div className="h-full">
        <AppShell
          desktop
          contentLabel={view}
          titleBar={<AppBar device="desktop" host="native" label="Shinatama">{bar}</AppBar>}
          sidebar={sidebar}
          inspector={
            <Inspector title="Projects" open={projects} onOpenChange={setProjects} animated={animated}>
              <p className="mb-3 text-xs text-ink-mute">8 projects. Pinned first.</p>
              <ItemList aria-label="Projects" className="gap-3">
                {PROJECTS.map((p) => (
                  // GAP: a card with its own actions (Resume last, New session, New in worktree): an ItemRow is a button, so nothing in it is a control.
                  <li key={p.name} className="flex flex-col gap-1 border-b border-line pb-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      {p.pinned ? <Icon name="pin" /> : null}
                      {p.pinned ? <span className="sr-only">Pinned</span> : null}
                      {p.name}
                    </span>
                    <span className="truncate text-2xs text-ink-mute">{p.path}</span>
                    <span className="text-2xs text-ink-soft">{p.git}</span>
                    <span className="text-2xs text-ink-mute">{p.thread}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <Button variant="ghost" size="xs" disabled={!p.resume}>Resume last</Button>
                      <Button variant="outline" size="xs">New session</Button>
                      <Button variant="outline" size="xs">New in worktree</Button>
                    </span>
                  </li>
                ))}
              </ItemList>
            </Inspector>
          }
          footer={
            <>
              <span>Local runtime · experimental</span>
              <span>Resources: available</span>
              <span className="tabular-nums">4 terminals</span>
              <span className="ms-auto inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Kbd>Ctrl Shift T</Kbd> new session</span>
                <span className="inline-flex items-center gap-1"><Kbd>Ctrl Shift ←/→</Kbd> focus pane</span>
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
