// The app editor: a whole app made of the toolkit's parts, by dragging. What is edited is the frame every app of the
// suite has (`AppShell`): its regions are the places components are dropped into, and each region takes only what
// belongs there (docs/patterns.md). An app has screens; the bar, the sidebar, the tabs and the foot are shared by all
// of them, the content, the details and the actions are each screen's own.
// - The canvas is the app at the width of a device (a phone, a tablet, a laptop, or the room there is), in a browser
//   tab or as a native window in Tauri. One layout serves them all: a region can be there always, or only where the
//   frame is narrow or wide, and so can any component.
// - «Run» is the app running by itself (run.html), from the same description the export prints.
// - «Export» is the app as source: one component that uses the toolkit as any app does, in a project that runs in a
//   browser and, after a few steps, as a native app. The data of the app can be copied and read back.
// The dragging, the selection, the outline and the history are Puck's (`@puckeditor/core`, MIT, a development
// dependency, pinned); everything it draws here is the toolkit's. The editor is itself an app in the one frame.
// Development only, like the showcase it lives in. The pieces are in editor/: the catalogue of components
// (catalog.ts), the app as data (model.ts), what it draws (plan.ts, ir.ts), the canvas (puck.tsx), the app running
// (render.tsx), the export (codegen.ts), the look (look.tsx).
import './builder.css'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Puck, createUsePuck, type Data } from '@puckeditor/core'
import { Copy, Download, ExternalLink, FileUp, PanelLeft, PanelRight, Play, Plus, Redo2, Trash2, Undo2 } from 'lucide-react'
import pkg from '../package.json'
import {
  APP_SHELL_STEPS,
  AppShell,
  BASE_THEME,
  Button,
  FormField,
  Icon,
  Input,
  Inspector,
  SearchField,
  Select,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Switch,
  TitleBar,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarBrand,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarSpacer,
  ToolbarTab,
  ToolbarTabs,
  appShellLayout,
  applyTheme,
  cn,
  type IconName,
} from '../src/index'
import { CATALOG, ICON_OPTIONS, isKind } from './editor/catalog'
import { exportFiles, zip } from './editor/codegen'
import { slug } from './editor/ir'
import { LookPanel, type Look } from './editor/look'
import { STARTERS, copyNodes, countNodes, freshScreenName, loadApp, readApp, saveApp, screen as newScreen, type AppModel, type Screen, type Settings, type Vis } from './editor/model'
import { CanvasDocument, EditEnvContext, FIELD_CONTROLS, configOf, fromData, paletteOf, toData, type EditEnv } from './editor/puck'
import type { HostKind } from './editor/render'
import { Address, Clock, HomeIndicator } from './hosts'

/** What the library knows, one piece at a time: a part of the editor is drawn again only when its piece changes. */
const usePuck = createUsePuck()

/* ———— The devices of the canvas ———— */

const DEVICES = {
  phone: { label: 'Phone', width: 390, height: 780 },
  tablet: { label: 'Tablet', width: 768, height: 960 },
  laptop: { label: 'Laptop', width: 1280, height: 760 },
  fill: { label: 'Fill', width: 0, height: 0 },
} as const
type Device = keyof typeof DEVICES

const VIS_WORDS: Record<Vis, string> = { off: 'Not there', always: 'Always', wide: 'Wide only', narrow: 'Narrow only' }
const vis = (...values: Vis[]) => values.map((value) => ({ value, label: VIS_WORDS[value] }))

/* ———— Small parts of the panels ———— */

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line pb-4 last:border-0">
      <h3 className="text-2xs font-semibold tracking-[0.07em] text-ink-mute uppercase">{label}</h3>
      {children}
    </section>
  )
}

/** A choice of a few words: its name above, the words in a row. */
function Choice<Value extends string>({ label, value, options, onChange }: { label: string; value: Value; options: readonly (readonly [Value, string])[]; onChange: (value: Value) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <ToggleGroup aria-label={label} value={value} onValueChange={onChange} className="w-full">
        {options.map(([id, word]) => (
          <ToggleGroupItem key={id} value={id} className="min-w-0 flex-1 px-2">
            {word}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

const OnOff = ({ label, about, checked, onChange }: { label: string; about?: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="flex items-center justify-between gap-4 text-sm text-ink">
    <span className="flex min-w-0 flex-col">
      {label}
      {about ? <span className="text-xs text-ink-mute">{about}</span> : null}
    </span>
    <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
  </label>
)

function download(name: string, data: string | Uint8Array, type: string) {
  const url = URL.createObjectURL(new Blob([typeof data === 'string' ? data : new Uint8Array(data)], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ———— The panels of the inspector ———— */

/** The fields of the component chosen on the canvas (the library's, drawn with the toolkit's controls). */
function PartPanel() {
  const selectedItem = usePuck((puck) => puck.selectedItem)
  const def = selectedItem && isKind(selectedItem.type) ? CATALOG[selectedItem.type] : null
  return (
    <div data-panel="part" className="flex flex-col gap-3">
      {def ? (
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span aria-hidden="true" className="inline-flex text-ink-mute [&_svg]:size-4">
              <Icon name={def.icon} />
            </span>
            {def.label}
          </h3>
          <p className="text-xs text-ink-mute">{def.about}</p>
        </div>
      ) : (
        <p className="text-sm text-ink-mute">Press a component on the canvas to set it here. Drag one from the list at the start into a region of the frame to add it.</p>
      )}
      <div className={def ? 'editor-fields' : 'hidden'}>
        <Puck.Fields wrapFields={false} />
      </div>
    </div>
  )
}

function ScreenPanel({ app, screen, onScreen, onDuplicate, onDelete, onStart }: { app: AppModel; screen: Screen; onScreen: (change: Partial<Screen>) => void; onDuplicate: () => void; onDelete: () => void; onStart: () => void }) {
  return (
    <div data-panel="screen" className="flex flex-col gap-4">
      <Group label="This screen">
        <FormField label="Name">
          <Input value={screen.name} onChange={(event) => onScreen({ name: event.target.value })} autoComplete="off" />
        </FormField>
        <FormField label="Icon" help="In the tabs at the foot, where the screens are tabs.">
          <Select options={ICON_OPTIONS.filter(([id]) => id !== 'none').map(([value, label]) => ({ value, label }))} value={screen.icon} onValueChange={(icon) => onScreen({ icon: icon as IconName })} />
        </FormField>
        <OnOff label="The app starts here" checked={app.start === screen.id} onChange={(on) => on && onStart()} />
      </Group>
      <Group label="Content">
        <Choice label="As wide as" value={screen.width} options={[['full', 'Its place'], ['page', 'A page'], ['prose', 'A text']]} onChange={(width) => onScreen({ width })} />
        <Choice label="Room around it" value={screen.pad} options={[['none', 'None'], ['sm', '8'], ['md', '16'], ['lg', '24']]} onChange={(pad) => onScreen({ pad })} />
      </Group>
      <Group label="Regions of this screen">
        <OnOff label="Details" about="The inspector: what is selected, beside the content." checked={screen.details === 'on'} onChange={(on) => onScreen({ details: on ? 'on' : 'off' })} />
        {screen.details === 'on' ? (
          <FormField label="Heading of the details">
            <Input value={screen.detailsTitle} onChange={(event) => onScreen({ detailsTitle: event.target.value })} autoComplete="off" />
          </FormField>
        ) : null}
        <OnOff label="Actions" about="A bar under the content, the main action last." checked={screen.actionsOn} onChange={(actionsOn) => onScreen({ actionsOn })} />
        <FormField label="Status line" help="Under the bar: the last result, one line. Empty: no line.">
          <Input value={screen.status} onChange={(event) => onScreen({ status: event.target.value })} autoComplete="off" />
        </FormField>
      </Group>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onDuplicate}>
          <Copy aria-hidden="true" />
          Duplicate
        </Button>
        <Button variant="ghost" size="sm" disabled={app.screens.length < 2} onClick={onDelete}>
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </div>
    </div>
  )
}

function AppPanel({ app, onApp, onSettings, onReplace, onSay }: { app: AppModel; onApp: (change: Partial<AppModel>) => void; onSettings: (change: Partial<Settings>) => void; onReplace: (next: AppModel) => void; onSay: (text: string) => void }) {
  const [starter, setStarter] = React.useState(STARTERS[0]!.id)
  const file = React.useRef<HTMLInputElement>(null)
  const s = app.settings
  return (
    <div data-panel="app" className="flex flex-col gap-4">
      <Group label="The app">
        <FormField label="Name" help="In the bar, and the name of the exported project.">
          <Input value={app.name} onChange={(event) => onApp({ name: event.target.value })} autoComplete="off" />
        </FormField>
        <Choice label="The bar at the head" value={s.barSize} options={[['default', 'Regular'], ['compact', 'Compact']]} onChange={(barSize) => onSettings({ barSize })} />
      </Group>
      <Group label="Regions every screen shares">
        <FormField label="Sidebar" help="Always: a rail on a tablet, a drawer on a phone (give the bar a menu button). Wide only: on a phone it is gone, and the tabs at the foot take its place.">
          <Select options={vis('off', 'always', 'wide')} value={s.sidebar} onValueChange={(sidebar) => onSettings({ sidebar: sidebar as Vis })} />
        </FormField>
        {s.sidebar !== 'off' ? (
          <>
            <OnOff label="A search box in the sidebar" checked={s.sidebarSearch} onChange={(sidebarSearch) => onSettings({ sidebarSearch })} />
            <FormField label="Account at its foot" help="A name, with its avatar. Empty: nothing there.">
              <Input value={s.account} onChange={(event) => onSettings({ account: event.target.value })} autoComplete="off" />
            </FormField>
          </>
        ) : null}
        <FormField label="Tabs under the bar">
          <Select options={vis('off', 'always', 'wide', 'narrow')} value={s.tabs} onValueChange={(tabs) => onSettings({ tabs: tabs as Vis })} />
        </FormField>
        <FormField label="Bar at the foot" help="Where the thumb reaches: the views of a phone, up to five.">
          <Select options={vis('off', 'always', 'narrow', 'wide')} value={s.bottom} onValueChange={(bottom) => onSettings({ bottom: bottom as Vis })} />
        </FormField>
        <FormField label="Strip at the foot" help="The state of the service, counts, keys. With a finger it is as tall as a control: leave it to wide frames.">
          <Select options={vis('off', 'always', 'wide')} value={s.foot} onValueChange={(foot) => onSettings({ foot: foot as Vis })} />
        </FormField>
      </Group>
      <Group label="Start again from">
        <Select aria-label="An app to start from" options={STARTERS.map((option) => ({ value: option.id, label: option.name }))} value={starter} onValueChange={setStarter} />
        <p className="text-xs text-ink-mute">{STARTERS.find((option) => option.id === starter)?.about}</p>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => onReplace(STARTERS.find((option) => option.id === starter)!.make())}>
          Replace this app
        </Button>
      </Group>
      <Group label="The app as data">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => download(`${slug(app.name, 'app')}.json`, `${JSON.stringify(app, null, 2)}\n`, 'application/json')}>
            <Download aria-hidden="true" />
            Save as a file
          </Button>
          <Button variant="outline" size="sm" onClick={() => file.current?.click()}>
            <FileUp aria-hidden="true" />
            Open a file
          </Button>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          aria-label="An app saved as a file"
          className="sr-only"
          onChange={async (event) => {
            const chosen = event.target.files?.[0]
            event.target.value = ''
            if (!chosen) return
            try {
              const read = readApp(JSON.parse(await chosen.text()))
              if (read) onReplace(read)
              else onSay('That file does not hold an app.')
            } catch {
              onSay('That file could not be read.')
            }
          }}
        />
      </Group>
    </div>
  )
}

/* ———— The export ———— */

function ExportSheet({ app, open, onOpenChange }: { app: AppModel; open: boolean; onOpenChange: (open: boolean) => void }) {
  const files = React.useMemo(() => (open ? exportFiles(app, { version: pkg.version }) : []), [app, open])
  const [path, setPath] = React.useState('src/App.tsx')
  const [copied, setCopied] = React.useState(false)
  const file = files.find((f) => f.path === path) ?? files[0]
  const id = slug(app.name, 'app')
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-4xl" data-export="">
        <SheetHeader>
          <SheetTitle>Export «{app.name}»</SheetTitle>
          <SheetDescription>A project that runs in a browser as it is, and as a native app in Tauri after the steps of its README. The app is one component made of the toolkit's parts.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 gap-4 px-4 pb-4">
          <ul role="list" aria-label="Files" className="flex w-48 shrink-0 flex-col gap-0.5 overflow-y-auto">
            {files.map((f) => (
              <li key={f.path}>
                <button
                  type="button"
                  aria-current={f.path === file?.path ? 'true' : undefined}
                  onClick={() => {
                    setPath(f.path)
                    setCopied(false)
                  }}
                  className="flex min-h-(--control-sm) w-full items-center rounded-md px-2 text-start font-mono text-xs text-ink-soft outline-hidden hover:bg-ink/6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-[current=true]:bg-selected aria-[current=true]:text-selected-ink"
                >
                  {f.path}
                </button>
              </li>
            ))}
          </ul>
          <pre data-export-source="" data-selectable="" tabIndex={0} className="min-w-0 flex-1 overflow-auto rounded-md bg-paper-2 p-3 font-mono text-xs text-ink outline-hidden focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid">
            <code>{file?.text}</code>
          </pre>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3">
          <span role="status" className="me-auto text-xs text-ink-mute">
            {copied ? `${file?.path} is on the clipboard.` : `${files.length} files`}
          </span>
          <Button
            variant="outline"
            onClick={async () => {
              if (!file) return
              try {
                await navigator.clipboard.writeText(file.text)
                setCopied(true)
              } catch {
                setCopied(false)
              }
            }}
          >
            <Copy aria-hidden="true" />
            Copy this file
          </Button>
          <Button onClick={() => download(`${id}.zip`, zip(files, id), 'application/zip')}>
            <Download aria-hidden="true" />
            Download the project
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ———— The editor ———— */

/** Undo and redo of what was done on the canvas: the library's own history. */
function History() {
  const history = usePuck((puck) => puck.history)
  return (
    <>
      <ToolbarButton label="Undo" shortcut="Ctrl Z" icon={<Undo2 aria-hidden="true" />} disabled={!history.hasPast} onClick={() => history.back()} />
      <ToolbarButton label="Redo" shortcut="Ctrl Y" icon={<Redo2 aria-hidden="true" />} disabled={!history.hasFuture} onClick={() => history.forward()} />
    </>
  )
}

/** The list of components shows only what holds the word being looked for: the library keeps the list, and is told. */
function PaletteFilter({ find }: { find: string }) {
  const dispatch = usePuck((puck) => puck.dispatch)
  React.useEffect(() => {
    dispatch({ type: 'setUi', ui: { componentList: { ...paletteOf(find), other: { visible: false } } }, recordHistory: false })
  }, [dispatch, find])
  return null
}

/** Tells the editor which component is chosen on the canvas, so its panel comes forward. */
function Chosen({ onChosen }: { onChosen: (id: string | null) => void }) {
  const selectedItem = usePuck((puck) => puck.selectedItem)
  const id = selectedItem ? String(selectedItem.props.id) : null
  React.useEffect(() => onChosen(id), [id, onChosen])
  return null
}

const params = new URLSearchParams(location.search)
const startDevice = (Object.keys(DEVICES) as Device[]).find((device) => device === params.get('device')) ?? 'fill'

function Editor() {
  const [app, setApp] = React.useState<AppModel>(() => loadApp() ?? STARTERS[0]!.make())
  const [screenId, setScreenId] = React.useState(app.start)
  // The canvas is made again for another screen and for another app: its history starts over.
  const [epoch, setEpoch] = React.useState(0)
  const [device, setDevice] = React.useState<Device>(startDevice)
  const [host, setHost] = React.useState<HostKind>(params.get('host') === 'native' ? 'native' : 'web')
  const [mode, setMode] = React.useState<'edit' | 'run'>(params.get('mode') === 'run' ? 'run' : 'edit')
  const [panel, setPanel] = React.useState<'part' | 'screen' | 'app' | 'look'>('part')
  const [side, setSide] = React.useState<'add' | 'outline'>('add')
  const [sideOpen, setSideOpen] = React.useState(true)
  const [panelOpen, setPanelOpen] = React.useState(true)
  const [menu, setMenu] = React.useState(false)
  const [details, setDetails] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [said, setSaid] = React.useState('')
  const [find, setFind] = React.useState('')
  const [room, setRoom] = React.useState({ width: 1000, height: 640 })
  // The library draws the editor's own parts again as it starts, so the canvas is followed as an element, not held as a ref.
  const [canvas, setCanvas] = React.useState<HTMLDivElement | null>(null)

  const screen = app.screens.find((s) => s.id === screenId) ?? app.screens[0]!
  const latest = React.useRef({ app, screen, mode })
  latest.current = { app, screen, mode }

  React.useEffect(() => saveApp(app), [app])
  // The editor itself is drawn in the toolkit's gray baseline, in the scheme of the app: the colours are the app's.
  React.useLayoutEffect(() => applyTheme(document.documentElement, { theme: BASE_THEME, scheme: app.look.scheme }), [app.look.scheme])
  React.useLayoutEffect(() => {
    if (!canvas) return
    const read = () => setRoom({ width: canvas.clientWidth, height: canvas.clientHeight })
    read()
    const observer = new ResizeObserver(read)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [canvas])
  // The app running in the frame says where the user went: the canvas shows the same screen when editing again.
  React.useEffect(() => {
    const told = (event: MessageEvent) => {
      const data = event.data as { type?: string; id?: string } | null
      if (event.origin === location.origin && data?.type === 'sigrid-run-screen' && typeof data.id === 'string' && latest.current.app.screens.some((s) => s.id === data.id)) {
        // Only the screen is noted: the canvas is made again when editing starts again, not while the app runs in the frame.
        setScreenId(data.id)
      }
    }
    window.addEventListener('message', told)
    return () => window.removeEventListener('message', told)
  }, [])

  const size = DEVICES[device]
  const strips = (host === 'web' ? (device === 'phone' ? 44 : 36) : device === 'phone' ? 56 : 0)
  const frameWidth = device === 'fill' ? Math.max(320, room.width - 32) : size.width
  // The frame and the strips of its host fit the room there is; a phone and a tablet keep their own height, and the canvas scrolls.
  const frameHeight = device === 'fill' || device === 'laptop' ? Math.max(480, Math.min(room.height - 32, device === 'laptop' ? 760 : 4000) - strips) : size.height
  const layout = appShellLayout(frameWidth)
  const narrow = frameWidth < APP_SHELL_STEPS.rail
  const drawer = layout.sidebar === 'drawer' && app.settings.sidebar === 'always'
  const panelOver = layout.inspector === 'drawer' && screen.details === 'on'

  const toggleRun = () => {
    // Back to editing: the canvas is made again on the screen the app was left on.
    if (mode === 'run') setEpoch((n) => n + 1)
    setMode(mode === 'run' ? 'edit' : 'run')
  }
  const goScreen = (id: string) => {
    if (id === screenId) return
    setScreenId(id)
    setEpoch((n) => n + 1)
  }
  const replace = (next: AppModel) => {
    setApp(next)
    setScreenId(next.start)
    setEpoch((n) => n + 1)
    setSaid(`«${next.name}» is on the canvas.`)
  }
  const onScreen = (change: Partial<Screen>) => setApp((now) => ({ ...now, screens: now.screens.map((s) => (s.id === screen.id ? { ...s, ...change } : s)) }))
  const addScreen = () => {
    const made = newScreen(freshScreenName(app), 'all')
    setApp((now) => ({ ...now, screens: [...now.screens, made] }))
    setScreenId(made.id)
    setEpoch((n) => n + 1)
    setPanel('screen')
  }
  const duplicateScreen = () => {
    const name = freshScreenName(app, `${screen.name} copy`)
    const made: Screen = { ...screen, id: slug(name, 'screen'), name, content: copyNodes(screen.content), detailsItems: copyNodes(screen.detailsItems), actions: copyNodes(screen.actions) }
    setApp((now) => ({ ...now, screens: [...now.screens, made] }))
    setScreenId(made.id)
    setEpoch((n) => n + 1)
  }
  const deleteScreen = () => {
    if (app.screens.length < 2) return
    const left = app.screens.filter((s) => s.id !== screen.id)
    setApp((now) => ({ ...now, screens: left, start: now.start === screen.id ? left[0]!.id : now.start }))
    setScreenId(left[0]!.id)
    setEpoch((n) => n + 1)
    setSaid(`«${screen.name}» is gone.`)
  }

  const screensKey = app.screens.map((s) => `${s.id}:${s.name}`).join('|')
  const config = React.useMemo(() => configOf(app.screens), [screensKey])
  const data = React.useMemo(() => toData(latest.current.app, latest.current.screen), [epoch])
  const onChange = React.useCallback((next: Data) => setApp((now) => fromData(now, latest.current.screen.id, next)), [])
  const onChosen = React.useCallback((id: string | null) => {
    if (id) {
      setPanel('part')
      setPanelOpen(true)
    }
  }, [])
  const env: EditEnv = { app, screen, host, width: frameWidth, touch: device === 'phone', menu: drawer && menu, details: panelOver && details }

  // The address of the app running: made when running starts, so going from screen to screen does not load it again.
  const runAddress = React.useMemo(() => `run.html?host=${host}&touch=${device === 'phone' ? 1 : 0}&screen=${encodeURIComponent(screenId)}`, [mode, host, device])
  const total = countNodes(app)

  return (
    <EditEnvContext.Provider value={env}>
      <Puck key={epoch} config={config} data={data} onChange={onChange} iframe={{ enabled: true }} overrides={{ iframe: CanvasDocument, fieldTypes: FIELD_CONTROLS, drawerItem: PaletteItem }}>
        <Chosen onChosen={onChosen} />
        <PaletteFilter find={find} />
        <div className="h-dvh overflow-hidden bg-paper text-ink">
          <AppShell
            contentLabel="Canvas"
            // The two panels of the editor stay beside the canvas at any width: it is the canvas that scrolls.
            steps={{ sidebar: 0, rail: 0, inspector: 0 }}
            titleBar={
              <TitleBar>
                <Toolbar aria-label="App editor">
                  <ToolbarButton label={sideOpen ? 'Hide the components' : 'Show the components'} icon={<PanelLeft aria-hidden="true" />} pressed={sideOpen} onClick={() => setSideOpen(!sideOpen)} />
                  <ToolbarBrand name="Sigrid" page={['App editor', app.name]} />
                  <ToolbarSpacer />
                  <ToggleGroup aria-label="Device" value={device} onValueChange={setDevice}>
                    {(Object.keys(DEVICES) as Device[]).map((id) => (
                      <ToggleGroupItem key={id} value={id}>
                        {DEVICES[id].label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <ToggleGroup aria-label="Host" value={host} onValueChange={setHost}>
                    <ToggleGroupItem value="web">Web</ToggleGroupItem>
                    <ToggleGroupItem value="native">Native</ToggleGroupItem>
                  </ToggleGroup>
                  <ToolbarSeparator />
                  {mode === 'edit' ? <History /> : null}
                  <ToolbarButton label={mode === 'run' ? 'Back to editing' : 'Run the app'} icon={<Play aria-hidden="true" />} pressed={mode === 'run'} onClick={toggleRun}>
                    Run
                  </ToolbarButton>
                  <ToolbarButton label="Open the app in a tab of its own" icon={<ExternalLink aria-hidden="true" />} onClick={() => window.open(`run.html?host=${host}&screen=${encodeURIComponent(screenId)}`, '_blank', 'noopener')} />
                  <ToolbarButton label={panelOpen ? 'Hide the settings' : 'Show the settings'} icon={<PanelRight aria-hidden="true" />} pressed={panelOpen} onClick={() => setPanelOpen(!panelOpen)} />
                  <ToolbarButton label="Export the app as source" variant="default" icon={<Download aria-hidden="true" />} onClick={() => setExporting(true)}>
                    Export
                  </ToolbarButton>
                </Toolbar>
              </TitleBar>
            }
            tabs={
              <Toolbar aria-label="Screens">
                <ToolbarTabs aria-label="Screens of the app" value={screen.id} onValueChange={goScreen}>
                  {app.screens.map((s) => (
                    <ToolbarTab key={s.id} value={s.id} icon={<Icon name={s.icon} />}>
                      {s.name || 'Screen'}
                    </ToolbarTab>
                  ))}
                </ToolbarTabs>
                <ToolbarButton label="Add a screen" icon={<Plus aria-hidden="true" />} onClick={addScreen} />
                <ToolbarSpacer />
                {mode === 'edit' && drawer ? (
                  <ToolbarButton label="Show the drawer on the canvas" pressed={menu} onClick={() => setMenu(!menu)}>
                    Drawer
                  </ToolbarButton>
                ) : null}
                {mode === 'edit' && panelOver ? (
                  <ToolbarButton label="Show the details on the canvas" pressed={details} onClick={() => setDetails(!details)}>
                    Details
                  </ToolbarButton>
                ) : null}
              </Toolbar>
            }
            sidebar={
              sideOpen ? (
                <aside aria-label="Components and outline" data-editor-side="" className="flex w-60 shrink-0 flex-col border-e border-line bg-sidebar-paper">
                  <div className="shrink-0 p-2">
                    <ToggleGroup aria-label="What the panel shows" value={side} onValueChange={setSide} className="w-full">
                      <ToggleGroupItem value="add" className="flex-1">
                        Components
                      </ToggleGroupItem>
                      <ToggleGroupItem value="outline" className="flex-1">
                        Outline
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  {/* Both stay mounted: the list of components is what a drag starts from, whatever is in sight. */}
                  <div className={cn('editor-palette min-h-0 flex-1 overflow-y-auto px-2 pb-4', side !== 'add' && 'hidden')}>
                    <SearchField aria-label="Find a component" placeholder="Find a component" value={find} onValueChange={setFind} />
                    <p className="px-2 pt-2 pb-1 text-xs text-sidebar-mute">Drag a component into a region of the frame. A region takes only what belongs there.</p>
                    <Puck.Components />
                  </div>
                  <div className={cn('editor-outline min-h-0 flex-1 overflow-y-auto px-2 pb-4', side !== 'outline' && 'hidden')}>
                    <Puck.Outline />
                  </div>
                </aside>
              ) : undefined
            }
            inspector={
              <Inspector title="Settings" open={panelOpen} onOpenChange={setPanelOpen}>
                <div className="flex flex-col gap-4">
                  <ToggleGroup aria-label="What to set" value={panel} onValueChange={setPanel} className="w-full">
                    <ToggleGroupItem value="part" className="min-w-0 flex-1 px-1">
                      Part
                    </ToggleGroupItem>
                    <ToggleGroupItem value="screen" className="min-w-0 flex-1 px-1">
                      Screen
                    </ToggleGroupItem>
                    <ToggleGroupItem value="app" className="min-w-0 flex-1 px-1">
                      App
                    </ToggleGroupItem>
                    <ToggleGroupItem value="look" className="min-w-0 flex-1 px-1">
                      Look
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <div className={panel === 'part' ? undefined : 'hidden'}>
                    <PartPanel />
                  </div>
                  {panel === 'screen' ? <ScreenPanel app={app} screen={screen} onScreen={onScreen} onDuplicate={duplicateScreen} onDelete={deleteScreen} onStart={() => setApp((now) => ({ ...now, start: screen.id }))} /> : null}
                  {panel === 'app' ? <AppPanel app={app} onApp={(change) => setApp((now) => ({ ...now, ...change }))} onSettings={(change) => setApp((now) => ({ ...now, settings: { ...now.settings, ...change } }))} onReplace={replace} onSay={setSaid} /> : null}
                  {panel === 'look' ? <LookPanel look={app.look} onLook={(change: Partial<Look>) => setApp((now) => ({ ...now, look: { ...now.look, ...change } }))} /> : null}
                </div>
              </Inspector>
            }
            footer={
              <>
                <span className="tabular-nums">
                  Frame {frameWidth}px: {narrow ? 'narrow' : 'wide'}
                </span>
                <span>
                  sidebar {app.settings.sidebar === 'off' || (app.settings.sidebar === 'wide' && narrow) ? 'not there' : layout.sidebar === 'full' ? 'whole' : `a ${layout.sidebar}`}
                </span>
                {screen.details === 'on' ? <span>details {layout.inspector === 'docked' ? 'docked' : 'a panel'}</span> : null}
                <span className="tabular-nums">
                  {app.screens.length} {app.screens.length === 1 ? 'screen' : 'screens'}, {total} {total === 1 ? 'component' : 'components'}
                </span>
                <span role="status" className="ms-auto">
                  {said || 'Kept in this browser as you go.'}
                </span>
              </>
            }
          >
            <div ref={setCanvas} data-editor-canvas="" className="flex h-full min-h-0 items-start justify-center overflow-auto bg-paper-2 p-4">
              <div data-canvas-device={device} data-canvas-host={host} data-canvas-mode={mode} style={{ width: frameWidth, height: frameHeight + strips }} className="flex shrink-0 flex-col overflow-hidden rounded-lg bg-paper shadow-lg">
                {host === 'web' ? <Address address={`${slug(app.name, 'app')}.example/${screen.id}`} device={device === 'phone' ? 'phone' : 'desktop'} /> : device === 'phone' ? <Clock /> : null}
                <div className="min-h-0 flex-1">{mode === 'edit' ? <Puck.Preview /> : <iframe title={`${app.name}, running`} src={runAddress} data-run-frame="" className="size-full border-0" />}</div>
                {host === 'native' && device === 'phone' ? <HomeIndicator /> : null}
              </div>
            </div>
          </AppShell>
        </div>
        <ExportSheet app={app} open={exporting} onOpenChange={setExporting} />
      </Puck>
    </EditEnvContext.Provider>
  )
}

/** A component in the list at the start: its icon and its name; the sentence about it is its hint. */
function PaletteItem({ name }: { children: React.ReactNode; name: string }) {
  const def = isKind(name) ? CATALOG[name] : null
  return (
    <div data-palette-item={name} title={def?.about} className="flex min-h-(--control-sm) cursor-grab items-center gap-2 rounded-md px-2 text-sm text-sidebar-ink hover:bg-sidebar-selected/70">
      <span aria-hidden="true" className="inline-flex shrink-0 text-sidebar-mute [&_svg]:size-4">
        {def ? <Icon name={def.icon} /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{def?.label ?? name}</span>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Editor />)
