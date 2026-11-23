// The app editor of the showcase (showcase/editor) as data: what an app saved before reads back as, the frame's two
// forms, the regions an app has or has not, the apps and layouts it starts from, and the job a status row runs. The
// export of every starter is type-checked in editor-export.test.ts; here is what the source and the running app say.
import { act, fireEvent, render, screen as view } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appSource } from '../showcase/editor/codegen'
import { STARTERS, make, readApp, screen, type AppModel } from '../showcase/editor/model'
import { planOf } from '../showcase/editor/plan'
import { RunApp } from '../showcase/editor/render'

const starter = (id: string): AppModel => STARTERS.find((s) => s.id === id)!.make()

test('an app saved before the frame had two forms reads back in the line frame, as it was', () => {
  // The shape the editor kept until now: no frame, a status line of text, a region given as a word or not at all.
  const old = readApp({ name: 'Old', settings: { sidebar: 'always' }, shared: {}, screens: [{ name: 'Home', status: 'Saved at 09:42' }] })!
  expect(old.settings.frame).toBe('line')
  expect(old.settings).toMatchObject({ sidebar: 'always', tabs: 'off', bottom: 'off', foot: 'off' })
  // The line of text is a fact in a status row that is on.
  expect(old.screens[0]!.statusOn).toBe(true)
  expect(old.screens[0]!.statusItems.map((node) => [node.type, node.props['text']])).toEqual([['FootText', 'Saved at 09:42']])
  const source = appSource(old)
  expect(source).toContain('Saved at 09:42')
  expect(source).not.toContain('frame=')
  // No line, no row.
  expect(readApp({ name: 'Old', screens: [{ name: 'Home' }] })!.screens[0]!.statusOn).toBe(false)
})

test('the sheet frame is kept, and what is not a frame is the line one', () => {
  const read = (frame: unknown) => readApp({ name: 'x', settings: { frame }, screens: [{ name: 'One' }] })!.settings.frame
  expect(read('sheet')).toBe('sheet')
  expect(read('line')).toBe('line')
  expect(read('glass')).toBe('line')
  expect(read(undefined)).toBe('line')
})

test('every app and layout to start from reads back from its own data as the same app', () => {
  for (const s of STARTERS) {
    const app = s.make()
    expect(appSource(readApp(JSON.parse(JSON.stringify(app)))!), s.id).toBe(appSource(app))
  }
})

test('the export passes the sheet frame to AppShell only when the app has it', () => {
  const workspace = appSource(starter('workspace'))
  expect(workspace).toContain('frame="sheet"')
  // Xiox's layout: the views in the bar, the Commands button, a sidebar, a status row, a panel, the details, the actions, the keys.
  for (const part of ['<ToolbarTabs', 'label="Commands"', 'shortcut="Ctrl K"', '<Sidebar', 'status={status[screen]}', '<Panel', '<Inspector', 'actions={actions[screen]}', '<Kbd>']) expect(workspace).toContain(part)
  for (const id of ['tasks', 'mail', 'blank']) expect(appSource(starter(id)), id).not.toContain('frame=')
  expect(appSource({ ...starter('tasks'), settings: { ...starter('tasks').settings, frame: 'sheet' } })).toContain('frame="sheet"')
})

test('the layouts have no sidebar, and a region the app does not have is not in its source', () => {
  const layouts = STARTERS.filter((s) => s.kind === 'layout')
  expect(layouts.map((s) => s.id)).toEqual(['tabs', 'tabs-details', 'list-details', 'blank'])
  for (const s of layouts) {
    const app = s.make()
    expect(app.settings.sidebar, s.id).toBe('off')
    expect(appSource(app), s.id).not.toContain('<Sidebar')
  }
  expect(appSource(starter('tabs'))).toContain('tabs={')
  expect(appSource(starter('tabs-details'))).toContain('<Inspector')
  expect(appSource(starter('list-details'))).toMatch(/<Inspector[\s\S]*actions=\{actions\[screen\]\}/)
  // A region taken away keeps what it held, for when it comes back, but the app declares nothing for it.
  const kept = { ...starter('blank'), shared: { ...starter('blank').shared, tabs: [make('BarSearch'), make('BarButton', { action: 'say', said: 'Hi' })] } }
  expect(appSource(kept)).not.toMatch(/search|say\(|Toasts/)
  expect(appSource({ ...kept, settings: { ...kept.settings, tabs: 'always' } })).toMatch(/setSearch[\s\S]*Toasts/)
})

test('a button runs the job only where a status row holds one', () => {
  const asks = (app: AppModel) => ({ ...app, screens: app.screens.map((s, at) => (at === 0 ? { ...s, actionsOn: true, actions: [make('Button', { label: 'Go', action: 'job' })] } : s)) })
  // No job: the button does nothing, and there is no timer.
  const none = planOf(asks(starter('blank')))
  expect(none.uses).toMatchObject({ job: false, runJob: false })
  expect(appSource(asks(starter('blank')))).not.toMatch(/runJob|useEffect/)
  // A job in a status row that is off is not there either.
  const off = asks({ ...starter('blank'), screens: [screen('Home', 'all', { statusOn: false, statusItems: [make('Job')] })] })
  expect(planOf(off).uses.job).toBe(false)
  const on = asks({ ...starter('blank'), screens: [screen('Home', 'all', { statusOn: true, statusItems: [make('Job')] })] })
  expect(planOf(on).uses).toMatchObject({ job: true, runJob: true })
  expect(appSource(on)).toMatch(/const runJob = \(\) => setJob\(0\)[\s\S]*disabled=\{busy\} onClick=\{\(\) => runJob\(\)\}/)
})

test('the controls every screen shares stay, and the main action is last (R14)', () => {
  for (const s of STARTERS) {
    for (const sc of s.make().screens.filter((one) => one.actionsOn)) {
      const solid = sc.actions.filter((node) => node.type === 'Button' && node.props['variant'] === 'default')
      expect(solid.length, `${s.id}/${sc.id}`).toBeLessThanOrEqual(1)
      if (solid.length) expect(sc.actions[sc.actions.length - 1], `${s.id}/${sc.id}`).toBe(solid[0])
    }
  }
  // A button of the bar that shows the details is on every screen: where a screen has none, it is disabled.
  const app = { ...starter('list-details'), screens: [...starter('list-details').screens, screen('About', 'info')] }
  app.shared = { ...app.shared, bar: [...app.shared.bar, make('BarButton', { label: 'Details', icon: 'info', action: 'details' })] }
  expect(appSource(app)).toMatch(/<ToolbarButton[^>]*label="Details"[\s\S]*?disabled=\{!inspector\[screen\]\}/)
  // Where every screen has details there is nothing to disable.
  expect(appSource({ ...app, screens: app.screens.slice(0, 1) })).not.toContain('!inspector[screen]')
})

/* ———— The job, running ———— */

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('in the running app «Analyze» runs the job: the status row is its progress, then its result', () => {
  vi.useFakeTimers()
  render(<RunApp app={starter('workspace')} host="web" />)
  const status = () => document.querySelector('[data-slot="app-shell-status"]')!
  expect(status().textContent).toContain('Analysis done · 18.3 GB to clean')
  const analyze = view.getByRole('button', { name: 'Analyze' }) as HTMLButtonElement
  fireEvent.click(analyze)
  expect(analyze.disabled).toBe(true)
  // A few steps in: the state, the job, the bar and how far, and the item it is on.
  for (let n = 0; n < 8; n++) act(() => vi.advanceTimersByTime(200))
  expect(status().textContent).toContain('Analyzing')
  expect(view.getByRole('progressbar', { name: 'Analyzing…' }).getAttribute('aria-valuenow')).toBe('40')
  expect(status().textContent).toContain('40%')
  expect(status().textContent).toContain('Browser')
  // To the end, and one more tick: the row says the result again, and the button can be pressed.
  for (let n = 0; n < 14; n++) act(() => vi.advanceTimersByTime(200))
  expect(view.queryByRole('progressbar')).toBeNull()
  expect(status().textContent).toContain('Analysis done · 18.3 GB to clean')
  expect(analyze.disabled).toBe(false)
})
