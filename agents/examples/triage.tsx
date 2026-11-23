// Triage: Sorting what came in, one item at a time, on one screen whose page never scrolls: how many are left in the row under the bar, a two-state switch and the item in a body that gives way, the answers at the foot.
// A whole app in the toolkit's frame, written by the app editor of the showcase (scripts/agents.mjs). It is `src/App.tsx`
// of the project the editor exports; where it runs and its window come from `@acaprino/sigrid/tauri`.
// Triage: made with the Sigrid app editor. Every part is the toolkit's own; change anything.
import { useState, type ReactNode } from 'react'
import {
  AppShell, Button, DateField, FormField, Icon, Input, Page, Progress, Select, Textarea, TitleBar, Toasts,
  ToggleGroup, ToggleGroupItem, Toolbar, ToolbarBrand, ToolbarButton, ToolbarSpacer, ToolbarTab, ToolbarTabs,
  useDesktopGuard, useMedia, WindowControls, type ToastItem,
} from '@acaprino/sigrid'
import { DRAG_REGION, readHost, useWindowControls } from '@acaprino/sigrid/tauri'

type Screen = 'sort' | 'write'
const SCREENS: Record<Screen, string> = { sort: 'Sort', write: 'Write' }
// Where the app runs: a Tauri window of its own on a computer, or a browser (or a phone, where the system draws the window).
const HOST = readHost()

export function App() {
  const [screen, setScreen] = useState<Screen>('sort')
  const [notices, setNotices] = useState<ToastItem[]>([])
  const [choice, setChoice] = useState('new')
  const [choice2, setChoice2] = useState('home')
  const [day, setDay] = useState<string | null>(null)
  // Under this width the frame is laid out as on a phone: the sidebar is a drawer, the tabs are at the foot.
  const narrow = useMedia('(width < 620px)')
  // A window of its own on a computer: the app draws the window's bar, and takes the browser's own keys away.
  const ownWindow = HOST.ownWindow && !narrow
  useDesktopGuard(ownWindow)
  // The window's three buttons, wired to the Tauri window; in a browser they do nothing and are not drawn.
  const windowControls = useWindowControls({ enabled: ownWindow })
  const go = (next: Screen) => {
    setScreen(next)
  }
  const say = (text: string) => setNotices((list) => [...list, { id: crypto.randomUUID(), text }])

  const content: Record<Screen, ReactNode> = {
    sort: (
      <Page fit>
        <ToggleGroup aria-label="Which items" value={choice} onValueChange={setChoice} className="w-fit">
          <ToggleGroupItem value="new">New</ToggleGroupItem>
          <ToggleGroupItem value="waiting">Waiting</ToggleGroupItem>
        </ToggleGroup>
        <Progress aria-label="Sorted" value={25} showValue />
        <section className="flex flex-col gap-3 rounded-lg bg-raised shadow-xs p-4">
          <FormField label="Title">
            <Input placeholder="Call the plumber about the leak" autoComplete="off" />
          </FormField>
          <FormField label="Where it goes">
            <Select
              options={[
                { value: 'home', label: 'Home' },
                { value: 'work', label: 'Work' },
                { value: 'someday', label: 'Someday' },
              ]}
              value={choice2}
              onValueChange={setChoice2}
            />
          </FormField>
          <FormField label="When"><DateField value={day} onChange={setDay} /></FormField>
          <div className="flex flex-wrap items-center gap-2 justify-start">
            <Button variant="outline" size="sm" className="w-fit" onClick={() => say('Set to today')}>
              Today
            </Button>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => say('Set to tomorrow')}>
              Tomorrow
            </Button>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => say('Set to next week')}>
              Next week
            </Button>
          </div>
        </section>
      </Page>
    ),
    write: (
      <div className="flex min-h-full flex-col gap-4 p-4 mx-auto w-full max-w-prose">
        <h2 className="text-xl font-semibold text-ink">Write it all down</h2>
        <FormField label="What is on your mind" help="Each line is an item to sort.">
          <Textarea placeholder="One thing on each line" />
        </FormField>
      </div>
    ),
  }
  const actions: Partial<Record<Screen, ReactNode>> = {
    sort: (
      <>
        <Button variant="outline" className="w-fit" onClick={() => say('Moved to the end')}>Later</Button>
        <Button className="w-fit" onClick={() => say('Sorted')}>Looks good</Button>
      </>
    ),
  }
  const status: Partial<Record<Screen, ReactNode>> = {
    sort: (
      <><span className="tabular-nums">3 of 12 sorted</span></>
    ),
  }

  return (
    <>
      <AppShell
        desktop={ownWindow}
        contentLabel={SCREENS[screen]}
        titleBar={
          <TitleBar
            dragProps={ownWindow ? DRAG_REGION : undefined}
            windowControls={ownWindow ? <WindowControls {...windowControls} /> : undefined}
          >
            <Toolbar aria-label="Triage">
              <ToolbarBrand name="Triage" page={SCREENS[screen]} />
              <ToolbarSpacer />
              <ToolbarButton
                label="Write"
                icon={<Icon name="plus" />}
                variant="outline"
                onClick={() => go('write')}
              >
                Write
              </ToolbarButton>
            </Toolbar>
          </TitleBar>
        }
        tabs={
          !narrow ? (
            <Toolbar aria-label="Views">
              <ToolbarTabs aria-label="Views" value={screen} onValueChange={(next) => go(next as Screen)}>
                <ToolbarTab value="sort">Sort</ToolbarTab>
                <ToolbarTab value="write">Write</ToolbarTab>
              </ToolbarTabs>
            </Toolbar>
          ) : undefined
        }
        status={status[screen]}
        actions={actions[screen]}
        bottomBar={
          narrow ? (
            <Toolbar aria-label="Views at the foot">
              <ToolbarTabs
                aria-label="Views"
                value={screen}
                onValueChange={(next) => go(next as Screen)}
                edge="top"
                layout="stacked"
              >
                <ToolbarTab value="sort" icon={<Icon name="inbox" />}>Sort</ToolbarTab>
                <ToolbarTab value="write" icon={<Icon name="rename" />}>Write</ToolbarTab>
              </ToolbarTabs>
            </Toolbar>
          ) : undefined
        }
      >
        {content[screen]}
      </AppShell>
      <Toasts items={notices} durationMs={5000} onDismiss={(id) => setNotices((list) => list.filter((notice) => notice.id !== id))} />
    </>
  )
}
