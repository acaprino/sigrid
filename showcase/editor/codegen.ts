// The export: an app as source. `appSource` prints the plan of an app (plan.ts) as one React component that uses the
// toolkit as any app does, and `exportFiles` puts beside it what a project needs to run in a browser (Vite, Tailwind,
// the entry file with the look) and the few lines that make it a native app in Tauri. Nothing here is a template with
// holes: the regions are printed from the same elements the run page draws, so the export is what was seen.
// The frame printed by `frameSource` is the one render.tsx draws (`Frame`, `RunApp`): change the two together.
import { DENSITIES } from '../../src/index'
import { byEntry } from './entries'
import { TAURI_PERMISSIONS } from '../../tauri/permissions'
import { isEl, isExpr, isJson, isSlot, isWhen, h, lit, name, not, slug, type Child, type El, type Expr, type Val, type When } from './ir'
import type { AppModel, Vis } from './model'
import { DETAILS_PROPS, JOB_STEP, JOB_TICK_MS, SCREEN_NAME, planOf, screenBody, type Plan } from './plan'

export type ExportFile = { readonly path: string; readonly text: string }

const WIDTH = 110
const pad = (depth: number) => '  '.repeat(depth)
/** Source that is printed as it is, and never run in the editor. */
const raw = (source: string): Expr => ({ $expr: source, run: () => undefined })
const isIdentifier = (word: string) => /^[A-Za-z_$][\w$]*$/.test(word)
const key = (word: string) => (isIdentifier(word) ? word : lit(word))

/* ———— Printing elements as JSX ———— */

/** A plain value as a literal, on one line. */
function literal(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined)
    return entries.length === 0 ? '{}' : `{ ${entries.map(([k, v]) => `${key(k)}: ${literal(v)}`).join(', ')} }`
  }
  return lit(value)
}

/** A plain value as a literal: on one line if it fits, otherwise one item on each line. */
function literalLines(value: unknown, depth: number, room: number): string[] {
  const one = literal(value)
  if (one.length <= room || typeof value !== 'object' || value === null) return [one]
  const items = Array.isArray(value) ? value.map((item) => literal(item)) : Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => `${key(k)}: ${literal(v)}`)
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}']
  return [open, ...items.map((item) => `${pad(depth + 1)}${item},`), `${pad(depth)}${close}`]
}

/** Text between two tags, as JSX reads it: as it is where that is safe, otherwise as a string in braces. */
const jsxText = (value: string) => (/^[^{}<>&\n\r\u2028\u2029]+$/.test(value) && value === value.trim() && !/\s{2,}/.test(value) ? value : `{${lit(value)}}`)

const openTag = (el: El) => (el.tag === 'Fragment' ? '' : el.tag)

/** One attribute on one line, or null if it needs several. */
function attrInline(id: string, value: Val | When): string | null {
  if (value === undefined) return ''
  if (value === true) return id
  if (typeof value === 'string') return /^[^"\n&\\]*$/.test(value) ? `${id}="${value}"` : `${id}={${lit(value)}}`
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return `${id}={${String(value)}}`
  if (isWhen(value)) {
    const then = isEl(value.then) ? inline(value.then) : null
    return then === null ? null : `${id}={${value.$when.$expr} ? ${then} : undefined}`
  }
  if (isExpr(value)) return value.$expr.includes('\n') ? null : `${id}={${value.$expr}}`
  if (isJson(value)) return `${id}={${literal(value.$json)}}`
  const drawn = inline(value)
  return drawn === null ? null : `${id}={${drawn}}`
}

/** One attribute, on as many lines as it needs, at a depth. */
function attrLines(id: string, value: Val | When, depth: number): string[] {
  const one = attrInline(id, value)
  if (one !== null && depth * 2 + one.length <= WIDTH) return one === '' ? [] : [pad(depth) + one]
  if (isWhen(value) && isEl(value.then)) return [`${pad(depth)}${id}={`, `${pad(depth + 1)}${value.$when.$expr} ? (`, ...elLines(value.then, depth + 2), `${pad(depth + 1)}) : undefined`, `${pad(depth)}}`]
  if (isExpr(value)) {
    const lines = value.$expr.split('\n')
    return lines.map((line, at) => `${pad(depth)}${at === 0 ? `${id}={` : ''}${line}${at === lines.length - 1 ? '}' : ''}`)
  }
  if (isJson(value)) {
    const lines = literalLines(value.$json, depth, 0)
    return lines.map((line, at) => (at === 0 ? `${pad(depth)}${id}={${line}` : line) + (at === lines.length - 1 ? '}' : ''))
  }
  if (isEl(value)) return [`${pad(depth)}${id}={`, ...elLines(value, depth + 1), `${pad(depth)}}`]
  return one ? [pad(depth) + one] : []
}

function childInline(child: Child): string | null {
  if (child === null || child === undefined || child === false || isSlot(child)) return ''
  if (typeof child === 'string') return jsxText(child)
  if (typeof child === 'number') return `{${child}}`
  if (isWhen(child)) {
    const then = isEl(child.then) ? inline(child.then) : null
    return then === null ? null : `{${child.$when.$expr} ? ${then} : null}`
  }
  if (isExpr(child)) return child.$expr.includes('\n') ? null : `{${child.$expr}}`
  return inline(child)
}

/** An element on one line, or null if a part of it needs several. */
function inline(el: El): string | null {
  const attrs: string[] = []
  for (const [id, value] of Object.entries(el.props)) {
    const one = attrInline(id, value)
    if (one === null) return null
    if (one) attrs.push(one)
  }
  const tag = openTag(el)
  const head = [tag, ...attrs].join(' ')
  if (el.children.length === 0) return tag ? `<${head} />` : '<></>'
  const kids: string[] = []
  for (const child of el.children) {
    const one = childInline(child)
    if (one === null) return null
    kids.push(one)
  }
  return `<${head}>${kids.join('')}</${tag}>`
}

function childLines(child: Child, depth: number): string[] {
  const one = childInline(child)
  if (one !== null && depth * 2 + one.length <= WIDTH) return one === '' ? [] : [pad(depth) + one]
  if (isWhen(child) && isEl(child.then)) return [`${pad(depth)}{${child.$when.$expr} ? (`, ...elLines(child.then, depth + 1), `${pad(depth)}) : null}`]
  if (isEl(child)) return elLines(child, depth)
  if (isExpr(child)) return child.$expr.split('\n').map((line, at, all) => `${pad(depth)}${at === 0 ? '{' : ''}${line}${at === all.length - 1 ? '}' : ''}`)
  return one ? [pad(depth) + one] : []
}

/** An element as JSX, at a depth: on one line if it fits, otherwise its attributes and its children on lines of their own. */
export function elLines(el: El, depth: number): string[] {
  const one = inline(el)
  if (one !== null && depth * 2 + one.length <= WIDTH) return [pad(depth) + one]
  const tag = openTag(el)
  const inlineAttrs = Object.entries(el.props).map(([id, value]) => attrInline(id, value))
  const short = inlineAttrs.every((a) => a !== null) ? [tag, ...inlineAttrs.filter(Boolean)].join(' ') : null
  const close = el.children.length === 0 ? ' />' : '>'
  const head = short !== null && depth * 2 + short.length + 3 <= WIDTH ? [`${pad(depth)}<${short}${close}`] : [`${pad(depth)}<${tag}`, ...Object.entries(el.props).flatMap(([id, value]) => attrLines(id, value, depth + 1)), `${pad(depth)}${close.trim()}`]
  if (el.children.length === 0) return head
  return [...head, ...el.children.flatMap((child) => childLines(child, depth + 1)), `${pad(depth)}</${tag}>`]
}

/** Every tag of a tree of elements, in props and children. */
function tagsIn(children: readonly (Child | Val | When)[], into: Set<string>): Set<string> {
  for (const child of children) {
    if (isWhen(child)) tagsIn([child.then], into)
    else if (isEl(child)) {
      into.add(child.tag)
      tagsIn(Object.values(child.props), into)
      tagsIn(child.children, into)
    }
  }
  return into
}

/* ———— The app as one component ———— */

/** An import of many names: on one line if it fits, otherwise filled line after line. */
function importLines(names: readonly string[], from: string): string[] {
  const one = `import { ${names.join(', ')} } from '${from}'`
  if (one.length <= WIDTH) return [one]
  const lines: string[] = []
  let line = ' '
  for (const id of names) {
    if (line.length + id.length + 2 > WIDTH) {
      lines.push(line)
      line = ' '
    }
    line += ` ${id},`
  }
  return ['import {', ...lines, line, `} from '${from}'`]
}

/** A region that is there always, or only where the frame is narrow or wide. Undefined: never. */
function region(vis: Vis, el: El): Val | When {
  if (vis === 'off') return undefined
  if (vis === 'always') return el
  return { $when: vis === 'narrow' ? name('narrow') : not(name('narrow')), then: el }
}

/** The frame of the app, as elements: AppShell with its regions. */
function frameSource(plan: Plan): El {
  const s = plan.settings
  const account = s.account ? h('SidebarRow', { leading: h('Avatar', { name: s.account, size: 'xs', decorative: true }) }, s.account) : undefined
  const props: Record<string, Val | When> = {
    desktop: name('ownWindow'),
    frame: s.frame === 'sheet' ? 'sheet' : undefined,
    contentLabel: SCREEN_NAME,
    titleBar: h(
      'TitleBar',
      {
        size: s.barSize === 'compact' ? 'compact' : undefined,
        dragProps: raw('ownWindow ? DRAG_REGION : undefined'),
        windowControls: raw('ownWindow ? <WindowControls {...windowControls} /> : undefined'),
      },
      h('Toolbar', { 'aria-label': plan.name }, plan.shared.bar),
    ),
    tabs: region(s.tabs, h('Toolbar', { 'aria-label': 'Views' }, plan.shared.tabs)),
    status: plan.screens.some((screen) => screen.status) ? raw('status[screen]') : undefined,
    sidebar: region(s.sidebar, h('Sidebar', { 'aria-label': 'Places', open: name('menu'), onOpenChange: name('setMenu'), search: s.sidebarSearch ? true : undefined, footer: account }, plan.shared.nav)),
    inspector: plan.uses.details ? raw('inspector[screen]') : undefined,
    actions: plan.screens.some((screen) => screen.actions) ? raw('actions[screen]') : undefined,
    footer: region(s.foot, h('Fragment', null, plan.shared.foot)),
    bottomBar: region(s.bottom, h('Toolbar', { 'aria-label': 'Views at the foot' }, plan.shared.bottom)),
  }
  // `h` leaves out what is undefined; a region that depends on the width is kept as it is.
  const el = h('AppShell', null, raw('content[screen]'))
  return { ...el, props: Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as El['props'] }
}

/** A record of the screens that have a region: `{ today: (<div…/>), board: … }`. */
function recordLines(id: string, type: string, entries: readonly (readonly [string, El | string])[]): string[] {
  return [`  const ${id}: ${type} = {`, ...entries.flatMap(([screen, value]) => (typeof value === 'string' ? [`    ${key(screen)}: ${lit(value)},`] : [`    ${key(screen)}: (`, ...elLines(value, 3), '    ),'])), '  }']
}

/** The source of the app: one file, one component, the toolkit's parts and nothing else. */
export function appSource(app: AppModel): string {
  const plan = planOf(app)
  const frame = frameSource(plan)
  const content = plan.screens.map((s) => [s.id, screenBody(s, s.content)] as const)
  const inspectors = plan.screens.flatMap((s) => (s.details ? [[s.id, h('Inspector', { title: s.detailsTitle || 'Details', open: name('details'), onOpenChange: name('setDetails') }, h('Column', DETAILS_PROPS, s.details))] as const] : []))
  const actions = plan.screens.flatMap((s) => (s.actions ? [[s.id, h('Fragment', null, s.actions)] as const] : []))
  // A row that holds one fragment (a Job) is that fragment, not one inside another.
  const statuses = plan.screens.flatMap((s) => (s.status ? [[s.id, s.status.length === 1 && isEl(s.status[0]) && s.status[0].tag === 'Fragment' ? s.status[0] : h('Fragment', null, s.status)] as const] : []))

  const body: string[] = [
    ...recordLines('content', 'Record<Screen, ReactNode>', content),
    ...(inspectors.length ? recordLines('inspector', 'Partial<Record<Screen, ReactNode>>', inspectors) : []),
    ...(actions.length ? recordLines('actions', 'Partial<Record<Screen, ReactNode>>', actions) : []),
    ...(statuses.length ? recordLines('status', 'Partial<Record<Screen, ReactNode>>', statuses) : []),
    '',
    '  return (',
    ...(plan.uses.say
      ? ['    <>', ...elLines(frame, 3), '      <Toasts items={notices} durationMs={5000} onDismiss={(id) => setNotices((list) => list.filter((notice) => notice.id !== id))} />', '    </>']
      : elLines(frame, 2)),
    '  )',
  ]
  const text = body.join('\n')
  const used = (word: string) => new RegExp(`(^|[^\\w$.])${word.replace('$', '\\$')}\\b`).test(text)

  // What the component declares: only what its regions use.
  const head: string[] = [`  const [screen${used('go') ? ', setScreen' : ''}] = useState<Screen>(${lit(plan.start)})`]
  const menu = used('menu') || used('setMenu')
  if (menu) head.push('  const [menu, setMenu] = useState(false)')
  if (plan.uses.details) head.push('  // The details start open only where they are docked beside the content: on a narrow frame they would cover it.', "  const [details, setDetails] = useState(() => window.matchMedia('(min-width: 1000px)').matches)")
  if (plan.uses.say) head.push('  const [notices, setNotices] = useState<ToastItem[]>([])')
  if (plan.uses.job) {
    head.push(
      '  // The job of the app: how far it is, in percent, while it runs; null when it does not.',
      '  const [job, setJob] = useState<number | null>(null)',
      '  const busy = job !== null',
      '  useEffect(() => {',
      '    if (job === null) return',
      `    const timer = setTimeout(() => setJob(job >= 100 ? null : Math.min(100, job + ${JOB_STEP})), ${JOB_TICK_MS})`,
      '    return () => clearTimeout(timer)',
      '  }, [job])',
      ...(plan.uses.runJob ? ['  const runJob = () => setJob(0)'] : []),
    )
  }
  for (const state of plan.states) head.push(`  const [${state.name}, ${state.setter}] = useState${state.type ? `<${state.type}>` : ''}(${lit(state.initial)})`)
  head.push("  // Under this width the frame is laid out as on a phone: the sidebar is a drawer, the tabs are at the foot.", "  const narrow = useMedia('(width < 620px)')", "  // A window of its own on a computer: the app draws the window's bar, and takes the browser's own keys away.", '  const ownWindow = HOST.ownWindow && !narrow', '  useDesktopGuard(ownWindow)', "  // The window's three buttons, wired to the Tauri window; in a browser they do nothing and are not drawn.", '  const windowControls = useWindowControls({ enabled: ownWindow })')
  if (used('go')) head.push('  const go = (next: Screen) => {', '    setScreen(next)', ...(menu ? ['    setMenu(false)'] : []), '  }')
  if (used('toggleDetails')) head.push('  const toggleDetails = () => setDetails((open) => !open)')
  // The notices sit above what the frame keeps at its foot: `AppShell` writes that room itself (`--bottom-bar-room`).
  if (plan.uses.say) head.push('  const say = (text: string) => setNotices((list) => [...list, { id: crypto.randomUUID(), text }])')

  // Imports: the parts the elements name and what the frame uses, in the order of the alphabet.
  const tags = tagsIn([frame, ...content.map(([, el]) => el), ...statuses.map(([, el]) => el), ...inspectors.map(([, el]) => el), ...actions.map(([, el]) => el)], new Set<string>())
  const parts = new Set<string>(['useMedia', 'useDesktopGuard', 'WindowControls'])
  for (const tag of tags) if (tag !== 'Fragment') parts.add(tag)
  if (plan.uses.say) parts.add('Toasts')
  const names = [...parts].sort((a, b) => a.localeCompare(b))
  if (plan.uses.say) names.push('type ToastItem')
  const react = ['useState', ...(plan.uses.job ? ['useEffect'] : [])].sort()

  return [
    // The name is on one line whatever it holds: a line break in it would end the comment and start code.
    `// ${plan.name.replace(/[\r\n\u2028\u2029]+/g, ' ')}: made with the Sigrid app editor. Every part is the toolkit's own; change anything.`,
    `import { ${react.join(', ')}, type ReactNode } from 'react'`,
    ...byEntry(names).flatMap(([entry, own]) => importLines(own, entry)),
    "import { DRAG_REGION, readHost, useWindowControls } from '@acaprino/sigrid/tauri'",
    '',
    `type Screen = ${plan.screens.map((s) => lit(s.id)).join(' | ')}`,
    `const SCREENS: Record<Screen, string> = ${literal(Object.fromEntries(plan.screens.map((s) => [s.id, s.name])))}`,
    '// Where the app runs: a Tauri window of its own on a computer, or a browser (or a phone, where the system draws the window).',
    'const HOST = readHost()',
    '',
    'export function App() {',
    ...head,
    '',
    ...body,
    '}',
    '',
  ].join('\n')
}

/* ———— The project around it ———— */


const CSS = `/* Tailwind, then the toolkit's fonts and theme; the toolkit's sources are read for the classes its parts use. */
@import "tailwindcss";
@import "@acaprino/sigrid/fonts.css";
@import "@acaprino/sigrid/theme.css";
@source "../node_modules/@acaprino/sigrid/src";
@source not "../node_modules/@acaprino/sigrid/src/internal/motion-impl.tsx";

/* Nothing more: the frame (AppShell) is as tall as what is seen, in a browser what its bars and the keyboard leave,
   and on a phone it keeps clear of the clock, the notch and the home indicator by itself (viewport-fit=cover in
   index.html). No height and no padding here, or they would be counted twice. */
html,
body {
  margin: 0;
}
`

function mainSource(app: AppModel): string {
  const look = app.look
  const preset = DENSITIES.find((d) => d.id === look.density.id)
  const density = preset ? lit(preset.id) : literal(look.density)
  const own = look.colors === 'own' ? `duoTheme({ base: ${lit(look.page)}, accent: ${lit(look.accent)} })` : 'null'
  const parts = ['BASE_THEME', 'MotionProvider', 'applyDensity', 'applyFont', 'applyTheme', 'presetTone', ...(look.colors === 'own' ? ['duoTheme'] : [])].sort((a, b) => a.localeCompare(b))
  return `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ${parts.join(', ')} } from '@acaprino/sigrid'
import { App } from './App'
import './app.css'

// The look of the app: its colours, corners, font and density, put on the root before the first paint.
// To follow the system, read the scheme from matchMedia('(prefers-color-scheme: dark)').
const root = document.documentElement
applyTheme(root, { theme: { ...BASE_THEME, shape: ${lit(look.shape)} }, scheme: ${lit(look.scheme)}, own: ${own}, tone: presetTone(${lit(look.tone)}) })
applyDensity(root, ${density})
applyFont(root, ${lit(look.font)})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionProvider animated={${look.animated === true ? 'true' : 'false'}}>
      <App />
    </MotionProvider>
  </StrictMode>,
)
`
}

const html = (title: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${title.replace(/[<>&]/g, '')}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`

const VITE = `import tailwind from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tauri expects a fixed port and reads the page from it while developing.
export default defineConfig({
  plugins: [react(), tailwind()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
})
`

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
`

function readme(app: AppModel, id: string): string {
  return `# ${app.name}

Made with the Sigrid app editor. \`src/App.tsx\` is the whole app: one component built from the parts of
\`@acaprino/sigrid\`. Nothing in it is generated at run time, so change it as any source.

## In a browser

\`\`\`
npm install
npm run dev
\`\`\`

\`npm run build\` checks the types and writes \`dist/\`.

## As a native app, in Tauri

The page is the same. \`@acaprino/sigrid/tauri\` finds out where it runs (\`readHost\`): in a Tauri window on a
computer the app draws the window's bar (its empty parts move the window, its last three buttons minimize, maximize
and close it), opens what it opens under that bar, and takes the browser's own keys away. In a browser none of this
happens, and nothing of Tauri is loaded.

The native side (\`src-tauri/\`: the Rust program, its config, its capabilities) is not the toolkit's. Make it with
the tauri-app-builder plugin of Claude Code (its \`tauri-starter\` skill adapts an existing web project), or with
\`npm run tauri init\` (the web assets are in \`../dist\`, the dev server is at \`http://localhost:5173\`, the dev
command is \`npm run dev\`, the build command is \`npm run build\`). Then:

1. In \`src-tauri/tauri.conf.json\`, give the window no decorations, so the app's own bar is the only one:

   \`\`\`json
   "app": { "windows": [{ "title": ${JSON.stringify(app.name)}, "width": 1100, "height": 760, "minWidth": 360, "minHeight": 600, "decorations": false }] }
   \`\`\`

2. In \`src-tauri/capabilities/default.json\`, grant what the toolkit's window parts call (\`TAURI_PERMISSIONS.basics\`):

   \`\`\`json
   "permissions": ${JSON.stringify(['core:default', ...TAURI_PERMISSIONS.basics])}
   \`\`\`

3. \`npm run tauri dev\`, and \`npm run tauri build\` for the installer.

On a phone (\`npm run tauri android init\`, \`npm run tauri ios init\`) the system draws the window: the app shows no
window buttons, and \`src/app.css\` keeps the room of the clock and of the home indicator free.

## What follows the width

One layout serves a computer and a phone. Under 620px of width the frame is narrow: the sidebar becomes a drawer, and
the regions set to «narrow only» (the tabs at the foot) take the place of the ones set to «wide only». With a finger
every control is at least 44px tall. The toolkit does both; \`${id}\` only says which region is there when.
`
}

/** The files of a project that runs the app: in a browser as it is, in Tauri after the steps of its README. */
export function exportFiles(app: AppModel, toolkit: { version: string }): ExportFile[] {
  const id = slug(app.name, 'app')
  const pkg = {
    name: id,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview', tauri: 'tauri' },
    dependencies: {
      '@acaprino/sigrid': `https://github.com/acaprino/sigrid/releases/download/v${toolkit.version}/acaprino-sigrid-${toolkit.version}.tgz`,
      '@tauri-apps/api': '^2.0.0',
      react: '^19.2.0',
      'react-dom': '^19.2.0',
    },
    devDependencies: { '@tailwindcss/vite': '^4.3.5', '@tauri-apps/cli': '^2.0.0', '@types/react': '^19.1.0', '@types/react-dom': '^19.1.0', '@vitejs/plugin-react': '^6.2.1', tailwindcss: '^4.3.5', typescript: '^5.9.0', vite: '^8.3.6' },
  }
  return [
    { path: 'src/App.tsx', text: appSource(app) },
    { path: 'src/main.tsx', text: mainSource(app) },
    { path: 'src/app.css', text: CSS },
    { path: 'index.html', text: html(app.name) },
    { path: 'package.json', text: `${JSON.stringify(pkg, null, 2)}\n` },
    { path: 'vite.config.ts', text: VITE },
    { path: 'tsconfig.json', text: TSCONFIG },
    { path: 'README.md', text: readme(app, 'src/App.tsx') },
    { path: 'app.json', text: `${JSON.stringify(app, null, 2)}\n` },
  ]
}

/* ———— A zip of the files: stored, not compressed, which every program that opens a zip reads ———— */

const CRC = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of bytes) c = (CRC[(c ^ byte) & 0xff] as number) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zip(files: readonly ExportFile[], folder: string): Uint8Array {
  const encoder = new TextEncoder()
  // The day and the time the files carry, as a zip writes them: now.
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const path = encoder.encode(`${folder}/${file.path}`)
    const data = encoder.encode(file.text)
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    // Bit 11: the names are UTF-8.
    local.setUint16(6, 0x0800, true)
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, path.length, true)
    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(12, time, true)
    entry.setUint16(14, date, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, data.length, true)
    entry.setUint16(28, path.length, true)
    entry.setUint32(42, offset, true)
    chunks.push(new Uint8Array(local.buffer), path, data)
    central.push(new Uint8Array(entry.buffer), path)
    offset += 30 + path.length + data.length
  }
  const size = central.reduce((sum, part) => sum + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, size, true)
  end.setUint32(16, offset, true)
  const all = [...chunks, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0))
  let at = 0
  for (const part of all) {
    out.set(part, at)
    at += part.length
  }
  return out
}
