// @vitest-environment node
// The app editor of the showcase (showcase/editor) exports an app as source. That source has to be an app: here it is
// type-checked against the toolkit as it is now, for every app the editor starts from and for one that holds every
// component of its catalogue in every setting that changes what is printed. A prop of a part that is renamed, or a
// part that goes, fails here, before someone exports an app that does not compile.
// The source is made of the toolkit's parts and nothing else (AGENTS.md, «One look for every app»): no class, no
// inline style and no HTML element of its own, in the apps it exports and in the examples written from it for agents
// (`agents/examples`, scripts/agents.mjs), which `sigrid-check` with `own-class` on passes.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { expect, test } from 'vitest'
import { CATALOG, KINDS, type FieldSpec, type Kind, type Region } from '../showcase/editor/catalog'
import { appSource, exportFiles, zip } from '../showcase/editor/codegen'
import { ENTRY_NAMES } from '../showcase/editor/entries'
import { STARTERS, make, readApp, screen, type AppModel, type Node } from '../showcase/editor/model'
import { root } from './helpers'

/** Every component once for each word of each of its choices, with every other field as it starts. */
function variants(kind: Kind): Node[] {
  const out = [make(kind)]
  for (const [field, spec] of Object.entries(CATALOG[kind].fields) as [string, FieldSpec][]) {
    if (spec.kind === 'choice' || spec.kind === 'select') for (const [value] of spec.options) out.push(make(kind, { [field]: value }))
    if (spec.kind === 'toggle') out.push(make(kind, { [field]: true }), make(kind, { [field]: false }))
    if (spec.kind === 'action') for (const action of ['go:other', 'menu', 'details', 'show', 'say', 'job', 'none']) out.push(make(kind, { [field]: action, said: 'Done "now" & <here>' }))
    if (spec.kind === 'icon') out.push(make(kind, { [field]: 'none' }), make(kind, { [field]: 'archive' }))
  }
  return out
}
const into = (region: Region) => KINDS.filter((kind) => (CATALOG[kind].into as readonly Region[]).includes(region)).flatMap(variants)
const show = (nodes: Node[]) => nodes.map((node, at) => ({ ...node, props: { ...node.props, show: (['always', 'narrow', 'wide'] as const)[at % 3] } }))

/** An app that holds every component in every region that takes it. */
function everything(): AppModel {
  const group = (region: Region) => into(region).map((node) => (node.type === 'NavGroup' ? { ...node, props: { ...node.props, label: 'Group', items: into('group') } } : node))
  const content = into('content').map((node) => ('items' in node.props ? { ...node, props: { ...node.props, items: [make('Button'), make('Field')] } } : node))
  return {
    ...STARTERS[0]!.make(),
    name: 'Every "part" & more',
    start: 'all-of-it',
    settings: { frame: 'sheet', top: 'bar', barSize: 'compact', sidebar: 'always', sidebarSearch: true, account: 'Anna Greco', tabs: 'wide', bottom: 'narrow', foot: 'always' },
    shared: { bar: show(group('bar')), tabs: group('tabs'), nav: group('sidebar'), foot: show(group('footer')), bottom: group('bottom') },
    screens: [
      screen('All of it', 'all', { statusOn: true, statusItems: show(into('status')), details: 'on', actionsOn: true, content: show(content), detailsItems: content.slice(0, 12).map((node) => make(node.type as Kind, { ...node.props })), actions: show(into('actions')) }),
      screen('Other', 'archive', { pad: 'none', width: 'full', content: [make('Empty')] }),
    ],
  }
}

/**
 * The same app with the one top row of the sheet frame: every part of the bar but the app and the menu button goes to
 * the tools at the row's end, and the tabs hold every part they take (the document tabs among the views and the
 * buttons), each always, or only where the frame is narrow or wide.
 */
function everythingUnified(): AppModel {
  const app = everything()
  return { ...app, name: 'Every part, one row', settings: { ...app.settings, top: 'unified' }, shared: { ...app.shared, tabs: show(app.shared.tabs) } }
}

/** The tags of the JSX elements around each element of one tag in a source: its ancestors, nearest first. */
function around(source: string, tag: string): string[][] {
  const file = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const tagOf = (node: ts.Node) => (ts.isJsxElement(node) ? node.openingElement.tagName.getText(file) : ts.isJsxSelfClosingElement(node) ? node.tagName.getText(file) : null)
  const found: string[][] = []
  const visit = (node: ts.Node) => {
    if (tagOf(node) === tag) {
      const tags: string[] = []
      for (let up = node.parent; up; up = up.parent) {
        const named = tagOf(up)
        if (named) tags.push(named)
      }
      found.push(tags)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

/**
 * Type-checks sources as files of a folder inside the repository, with `@acaprino/sigrid` read from `src`. The paths
 * are written with forward slashes, as TypeScript asks for them on every system (on Windows `join` gives backslashes,
 * and a file kept under one spelling is not found under the other).
 */
function check(files: Record<string, string>): string[] {
  const slashes = (path: string) => path.replace(/\\/g, '/')
  const base = slashes(root)
  const dir = slashes(join(root, '.export-check'))
  const names = Object.keys(files).map((file) => `${dir}/${file}`)
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    noUnusedLocals: true,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    types: [],
    baseUrl: root,
    paths: { '@acaprino/sigrid': ['src/index.ts'], '@acaprino/sigrid/primitives': ['src/primitives.ts'], '@acaprino/sigrid/components': ['src/components.ts'], '@acaprino/sigrid/layout': ['src/layout.ts'], '@acaprino/sigrid/assemblies': ['src/assemblies.ts'], '@acaprino/sigrid/tauri': ['tauri/index.ts'] },
  }
  const host = ts.createCompilerHost(options)
  const read = host.readFile.bind(host)
  const exists = host.fileExists.bind(host)
  const virtual = new Map(Object.entries(files).map(([file, text]) => [`${dir}/${file}`, text]))
  host.readFile = (file) => virtual.get(slashes(file)) ?? read(file)
  host.fileExists = (file) => virtual.has(slashes(file)) || exists(file)
  const folder = host.directoryExists?.bind(host)
  host.directoryExists = (path) => slashes(path).startsWith(dir) || (folder ? folder(path) : true)
  const program = ts.createProgram(names.filter((file) => /\.tsx?$/.test(file)), options, host)
  // The unused names of the toolkit's own files are not this test's business: only the exported sources are read for them.
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => !d.file || slashes(d.file.fileName).startsWith(dir))
    .map((d) => `${d.file ? `${slashes(d.file.fileName).replace(base, '')}:${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1} ` : ''}${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`)
}

/**
 * An app with nothing but a bar and one screen (no details, no sidebar, no actions), whose buttons still ask for
 * each of them, and whose words hold what could end a comment, a string or a tag.
 */
function bare(): AppModel {
  const nasty = 'A "b" \'c\' \\ {d} <e> ${f} */ &amp;\rg\u2028h'
  const actions = ['details', 'show', 'menu', 'say', 'job', 'go:nowhere', 'none']
  return {
    ...STARTERS.find((starter) => starter.id === 'blank')!.make(),
    name: `Line one\nexport const injected = 1 //\u2028export const again = 2 //`,
    settings: { frame: 'line', top: 'bar', barSize: 'default', sidebar: 'off', sidebarSearch: false, account: nasty, tabs: 'off', bottom: 'off', foot: 'off' },
    shared: { bar: actions.map((action) => make('BarButton', { label: nasty, action, said: nasty })), tabs: [], nav: [], foot: [], bottom: [] },
    screens: [screen('One', 'all', { statusOn: true, statusItems: [make('FootText', { text: nasty })], content: [make('Heading', { text: nasty }), make('Text', { text: nasty }), make('Button', { label: nasty, action: 'details' }), make('Segment', { options: [{ label: 'A' }, { label: 'A' }, { label: 'A 2' }] })] })],
  }
}

test('the source of every app the editor starts from, and of every component, type-checks against the toolkit', () => {
  const apps: Record<string, AppModel> = { everything: everything(), 'everything-unified': everythingUnified(), bare: bare(), ...Object.fromEntries(STARTERS.map((starter) => [starter.id, starter.make()])) }
  const files: Record<string, string> = {}
  for (const [id, app] of Object.entries(apps)) {
    const made = exportFiles(app, { version: '0.0.0' })
    for (const file of made) if (/^src\/.*\.tsx?$/.test(file.path)) files[`${id}/${file.path}`] = file.text.replace("import './app.css'\n", '')
  }
  // `EDITOR_EXPORT_OUT=dir npm test` writes the sources, to read them.
  const out = process.env['EDITOR_EXPORT_OUT']
  if (out) for (const [file, text] of Object.entries(files)) {
    mkdirSync(join(out, file, '..'), { recursive: true })
    writeFileSync(join(out, file), text)
  }
  expect(check(files)).toEqual([])
}, 120_000)

test('an app read back from its own data is the same app, and data that is not an app is refused', () => {
  const app = everything()
  expect(appSource(readApp(JSON.parse(JSON.stringify(app)))!)).toBe(appSource(app))
  expect(readApp(null)).toBeNull()
  expect(readApp({ name: 'No screens', screens: [] })).toBeNull()
  // What is of another kind takes its starting value, and a component the catalogue does not know is left out.
  const mended = readApp({ name: 7, screens: [{ name: 'One', content: [{ type: 'Nope', props: {} }, { type: 'Button', props: { label: 3 } }] }] })!
  expect(mended.screens[0]!.content.map((node) => node.type)).toEqual(['Button'])
  expect(appSource(mended)).toContain('<Button')
})

test('a name with a line break stays inside its comment, and what is not a yes is a no', () => {
  const source = appSource(bare())
  // The name is the first line, a comment, and no line of the source starts with what the name tried to add.
  expect(source.split(/\r?\n|\u2028|\u2029/)[0]).toMatch(/^\/\/ Line one export const injected/)
  expect(source).not.toMatch(/^export const (injected|again)/m)
  const hostile = { ...bare(), look: { ...bare().look, animated: 'false}><script/><X animated={true' as unknown as boolean } }
  const main = exportFiles(hostile, { version: '0.0.0' }).find((file) => file.path === 'src/main.tsx')!.text
  expect(main).toContain('<MotionProvider animated={false}>')
  expect(main).not.toContain('<script')
  // The icons are not chosen: Sigrid has one set, so the entry file names no pack.
  expect(main).not.toMatch(/IconPack|pack=/)
})

test('two choices of one name have two values', () => {
  const source = appSource(bare())
  const values = [...source.matchAll(/<ToggleGroupItem value="([^"]+)"/g)].map((m) => m[1])
  expect(values).toHaveLength(3)
  expect(new Set(values).size).toBe(3)
})

test('data of any origin is made into an app that draws: a look, a region and an id are checked', () => {
  const read = readApp({
    name: 'x',
    look: { scheme: 'auto', density: null, tone: 'loud', shape: 7, font: 'comic', icons: 'none', accent: 'red', page: 'javascript:1', animated: 'yes', colors: 'all' },
    screens: [
      {
        name: 'One',
        content: [
          // Parts of a bar: with no toolbar around them the page would not draw.
          { type: 'BarButton', props: {} },
          { type: 'BarSearch', props: {} },
          { type: 'ViewTabs', props: {} },
          // A name every object has is not a component.
          { type: 'constructor', props: {} },
          { type: 'toString', props: {} },
          { type: 'Button', props: { id: 'same' } },
          { type: 'Button', props: { id: 'same' } },
          { type: 'Stack', props: { id: 'same', items: [{ type: 'BarButton', props: {} }, { type: 'Text', props: { id: 'same' } }] } },
        ],
      },
    ],
  })!
  const start = STARTERS[0]!.make().look
  expect(read.look).toEqual({ ...start, scheme: 'light', colors: 'own', tone: start.tone, shape: start.shape, font: start.font, accent: start.accent, page: null, animated: false, accentAuto: start.accentAuto, density: read.look.density })
  expect(read.look.density.id).toBe('normal')
  const content = read.screens[0]!.content
  expect(content.map((node) => node.type)).toEqual(['Button', 'Button', 'Stack'])
  const inside = content[2]!.props['items'] as Node[]
  expect(inside.map((node) => node.type)).toEqual(['Text'])
  const ids = [...content, ...inside].map((node) => node.props['id'])
  expect(new Set(ids).size).toBe(ids.length)
  // What is right is kept as it is; an icon pack kept from before is left out (Sigrid has one set).
  const kept = readApp({ name: 'x', look: { scheme: 'dark', accent: '#4452C4', icons: 'emoji', animated: true }, screens: [{ name: 'One' }] })!
  expect(kept.look).toMatchObject({ scheme: 'dark', accent: '#4452C4', animated: true })
  expect(kept.look).not.toHaveProperty('icons')
})

test('the zip of an export holds every file, stored, with its checksum', () => {
  const files = exportFiles(STARTERS[0]!.make(), { version: '1.2.3' })
  const bytes = zip(files, 'tasks')
  const view = new DataView(bytes.buffer)
  // The end record: the count of the entries, twice.
  expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50)
  expect(view.getUint16(bytes.length - 12, true)).toBe(files.length)
  // The first entry: its name and its text follow the 30 bytes of its header.
  expect(view.getUint32(0, true)).toBe(0x04034b50)
  const name = new TextDecoder().decode(bytes.subarray(30, 30 + view.getUint16(26, true)))
  expect(name).toBe(`tasks/${files[0]!.path}`)
  const text = new TextDecoder().decode(bytes.subarray(30 + name.length, 30 + name.length + view.getUint32(18, true)))
  expect(text).toBe(files[0]!.text)
  expect(files.find((file) => file.path === 'package.json')!.text).toContain('/v1.2.3/acaprino-sigrid-1.2.3.tgz')
})

/**
 * What an app that writes no interface code of its own does not have: a class (`className=`, `class=`, a `…ClassName`
 * prop, `className:` in an object: the pattern of `sigrid-check`'s `own-class`), an inline style, or an element of HTML
 * (a lowercase tag) where a part of the toolkit belongs.
 */
const OWN_CLASS = /(?<![\w$-])(?:class|className|[a-z]\w*ClassName)\s*(?:=(?!=)|\+=|:(?!:))|\bclassList\.(?:add|toggle|replace)\s*\(|\bsetAttribute\(\s*['"]class['"]/
const STYLE = /(?<![\w$-])style\s*(?:=(?!=)|:(?!:))/
const ELEMENT = /(?<![\w$.])<[a-z][\w-]*[\s/>]/
/** The source without the words in quotes: a notice that says «<here>» is text, not an element. */
const code = (source: string) => source.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''")

test('an exported app is made of the toolkit\'s parts only: no class, no style, no element of its own', () => {
  const apps: Record<string, AppModel> = { everything: everything(), 'everything-unified': everythingUnified(), bare: bare(), ...Object.fromEntries(STARTERS.map((starter) => [starter.id, starter.make()])) }
  for (const [id, app] of Object.entries(apps)) {
    const source = code(appSource(app))
    expect(source, `${id}: a class`).not.toMatch(OWN_CLASS)
    expect(source, `${id}: a style`).not.toMatch(STYLE)
    expect(source, `${id}: an element of its own`).not.toMatch(ELEMENT)
  }
})

test('the examples written for agents carry no class, no style and no element of their own', () => {
  const folder = join(root, 'agents/examples')
  const files = readdirSync(folder).filter((file) => file.endsWith('.tsx'))
  expect(files.length).toBeGreaterThan(0)
  for (const file of files) {
    const source = readFileSync(join(folder, file), 'utf8')
    expect(source, `${file}: a class`).not.toMatch(OWN_CLASS)
    expect(source, `${file}: a style`).not.toMatch(STYLE)
    expect(source, `${file}: an element of its own`).not.toMatch(ELEMENT)
  }
})

test('the table of entries the code export imports from lists every name each entry exports, and no other', () => {
  // Read from the entry files themselves: the parts cannot be loaded here (no DOM), and need not be.
  const exported = (file: string) => {
    const source = ts.createSourceFile(file, readFileSync(join(root, file), 'utf8'), ts.ScriptTarget.Latest, false)
    return source.statements
      .filter((statement): statement is ts.ExportDeclaration => ts.isExportDeclaration(statement) && !statement.isTypeOnly)
      .flatMap((statement) => (statement.exportClause && ts.isNamedExports(statement.exportClause) ? statement.exportClause.elements.filter((element) => !element.isTypeOnly).map((element) => element.name.text) : []))
      .sort()
  }
  const files = { '@acaprino/sigrid': 'src/index.ts', '@acaprino/sigrid/primitives': 'src/primitives.ts', '@acaprino/sigrid/components': 'src/components.ts', '@acaprino/sigrid/layout': 'src/layout.ts', '@acaprino/sigrid/assemblies': 'src/assemblies.ts' }
  expect(Object.keys(ENTRY_NAMES)).toEqual(Object.keys(files))
  for (const [entry, file] of Object.entries(files)) expect([...ENTRY_NAMES[entry]!].sort(), entry).toEqual(exported(file))
})

/* ———— The one top row of the sheet frame (`AppShell top="unified"`) and the document tabs ———— */

test('readApp defaults missing settings.top to "bar" for backward compatibility', () => {
  const legacy = structuredClone(STARTERS[0]!.make()) as unknown as { settings: Record<string, unknown> }
  delete legacy.settings['top']
  expect(readApp(legacy)!.settings.top).toBe('bar')
  // What is not a top row is the bar too; the one row is kept.
  expect(readApp({ ...legacy, settings: { ...legacy.settings, top: 'tall' } })!.settings.top).toBe('bar')
  expect(readApp({ ...legacy, settings: { ...legacy.settings, top: 'unified' } })!.settings.top).toBe('unified')
})

test('the check of what is around the document tabs sees a toolbar around them', () => {
  // Not vacuous: written inside a toolbar, the tabs have it among their ancestors; beside one, they do not.
  expect(around('<Toolbar aria-label="Views"><Cluster><DocumentTabs value={null} onValueChange={f} /></Cluster></Toolbar>', 'DocumentTabs')).toEqual([['Cluster', 'Toolbar']])
  expect(around('<AppShell topActions={<Toolbar aria-label="x" />} tabs={<DocumentTabs value={null} onValueChange={f} />} />', 'DocumentTabs')).toEqual([['AppShell']])
})

test('notes and unified-sheet starters export interactive zero-CSS JSX passing sigrid-check own-class', () => {
  for (const id of ['notes', 'unified-sheet']) {
    const starter = STARTERS.find((s) => s.id === id)!
    expect(starter, id).toBeDefined()
    const source = appSource(starter.make())
    expect(source, id).toContain('top="unified"')
    expect(source, id).toContain('DocumentTabs')
    expect(source, id).toContain('DocumentTab')
    // The tabs are the app's own state: a new one is added and chosen, a closed one goes.
    expect(source, id).toMatch(/const \[docs, setDocs\] = useState<\{ id: string; title: string \}\[\]>\(/)
    expect(source, id).toContain('onAdd={addDoc}')
    expect(source, id).toContain('onClose={() => closeDoc(doc.id)}')
    // Ark UI's tabs are a tablist of their own: never inside a toolbar's roving keys (Review Focus 3).
    const docTabs = around(source, 'DocumentTabs')
    expect(docTabs.length, id).toBeGreaterThan(0)
    for (const tags of docTabs) expect(tags, id).not.toContain('Toolbar')
    // sigrid-check's own-class, as the test of every exported app reads it.
    expect(code(source), `${id}: a class`).not.toMatch(OWN_CLASS)
    expect(code(source), `${id}: a style`).not.toMatch(STYLE)
    expect(code(source), `${id}: an element of its own`).not.toMatch(ELEMENT)
  }
})

test('switching Workspace starter to top="unified" routes bar actions to topActions and preserves ViewTabs in Toolbar', () => {
  const ws = STARTERS.find((s) => s.id === 'workspace')!.make()
  ws.settings.top = 'unified'
  const source = appSource(ws)
  expect(source).toContain('top="unified"')
  expect(source).toContain('topActions=')
  expect(source).toContain('sidebarHead=')
  // One bar: the row. The app is its head over the sidebar, once; the menu button is the row's own button for the drawer.
  expect(source).not.toContain('titleBar=')
  expect(source).not.toContain('<TitleBar')
  expect(source.match(/<ToolbarBrand/g)).toHaveLength(1)
  expect(source).toContain('sidebarHead={<ToolbarBrand name="Workspace" />}')
  expect(source).not.toContain('<DrawerButton')
  expect(source).toContain('onSidebarOpen={() => setMenu(true)}')
  expect(source).toContain('sidebarCollapsed={collapsed}')
  expect(source).toContain('onSidebarCollapsedChange={setCollapsed}')
  // The window's drag and buttons go to the row, as they went to the bar.
  expect(source).toContain('dragProps={ownWindow ? DRAG_REGION : undefined}')
  expect(source).toContain('windowControls={ownWindow ? <WindowControls {...windowControls} /> : undefined}')
  // The views and «Commands» are the tools at the row's end, in a toolbar.
  expect(source).toContain('label="Commands"')
  const views = around(source, 'ToolbarTabs')
  expect(views.length).toBeGreaterThan(0)
  for (const tags of views) expect(tags[0]).toBe('Toolbar')
  expect(source).toMatch(/topActions=\{[\s\S]*<Toolbar aria-label="Workspace">[\s\S]*<ToolbarTabs[\s\S]*label="Commands"/)
})

test('the one top row is the sheet frame\'s: in the line frame the app keeps its bar', () => {
  // A saved app with the one row whose frame went back to line: a frameless window keeps its buttons and its drag.
  const notes = STARTERS.find((s) => s.id === 'notes')!.make()
  const line = appSource({ ...notes, settings: { ...notes.settings, frame: 'line' } })
  for (const word of ['top', 'topActions', 'sidebarHead', 'sidebarCollapsed', 'onSidebarOpen']) expect(line, word).not.toMatch(new RegExp(`\\b${word}=`))
  expect(line).toContain('titleBar={')
  expect(line).toMatch(/<TitleBar[\s\S]*dragProps=\{ownWindow \? DRAG_REGION : undefined\}[\s\S]*<ToolbarBrand/)
  // The document tabs stay the app's, under the bar, and still outside any toolbar.
  for (const tags of around(line, 'DocumentTabs')) expect(tags).not.toContain('Toolbar')
  // In the bar's form a tabs region with views keeps its toolbar, as before.
  expect(appSource(STARTERS.find((s) => s.id === 'tabs')!.make())).toMatch(/tabs=\{[\s\S]*<Toolbar aria-label="Views">[\s\S]*<ToolbarTabs/)
})

test('the one top row needs a sidebar: without one the app keeps its bar and its name in it', () => {
  // The row's head (the app) stands over the sidebar: with no sidebar there is no head, so the row would lose the name.
  for (const id of ['blank', 'tabs', 'tabs-details', 'list-details']) {
    const app = STARTERS.find((s) => s.id === id)!.make()
    expect(app.settings.sidebar, id).toBe('off')
    const source = appSource({ ...app, settings: { ...app.settings, frame: 'sheet', top: 'unified' } })
    expect(source, id).toContain('frame="sheet"')
    for (const word of ['top', 'topActions', 'sidebarHead', 'sidebarCollapsed', 'onSidebarOpen']) expect(source, `${id}: ${word}`).not.toMatch(new RegExp(`\\b${word}=`))
    // Exactly as with the bar: the app's name in the title bar.
    expect(source, id).toBe(appSource({ ...app, settings: { ...app.settings, frame: 'sheet', top: 'bar' } }))
    const brands = around(source, 'ToolbarBrand')
    expect(brands.length, id).toBe(1)
    expect(brands[0], id).toEqual(['Toolbar', 'TitleBar', 'AppShell'])
  }
  // A sheet app with the row whose sidebar is turned off: the same, its document tabs still outside any toolbar.
  const notes = STARTERS.find((s) => s.id === 'notes')!.make()
  const off = appSource({ ...notes, settings: { ...notes.settings, sidebar: 'off' } })
  expect(off).not.toMatch(/\btop=/)
  expect(off).toMatch(/titleBar=\{[\s\S]*<TitleBar[\s\S]*<ToolbarBrand name="Notes"/)
  for (const tags of around(off, 'DocumentTabs')) expect(tags).not.toContain('Toolbar')
})

test('a region that holds document tabs among other parts puts the tabs beside the toolbar, never in it', () => {
  const source = appSource(everythingUnified())
  const docTabs = around(source, 'DocumentTabs')
  expect(docTabs.length).toBeGreaterThan(1)
  for (const tags of docTabs) expect(tags).not.toContain('Toolbar')
  // The other parts of the region are still in a toolbar of views.
  for (const tags of around(source, 'ToolbarSearch')) expect(tags).toContain('Toolbar')
  // The one row is as tall as the window's bar: the bar's size, compact in this app, is not printed (Review Focus 3).
  expect(appSource(everything())).toMatch(/<TitleBar\s+size="compact"/)
  expect(source).not.toContain('<TitleBar')
  expect(source).not.toContain('size="compact"')
  // A tabs region kept while the app has none declares nothing for its document tabs.
  const off = everythingUnified()
  const hidden = appSource({ ...off, settings: { ...off.settings, tabs: 'off' } })
  expect(hidden).not.toMatch(/\bdocs\b|activeDoc|addDoc|closeDoc|DocumentTab/)
})
