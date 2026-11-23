// @vitest-environment node
// The app editor of the showcase (showcase/editor) exports an app as source. That source has to be an app: here it is
// type-checked against the toolkit as it is now, for every app the editor starts from and for one that holds every
// component of its catalogue in every setting that changes what is printed. A prop of a part that is renamed, or a
// part that goes, fails here, before someone exports an app that does not compile.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, test } from 'vitest'
import { CATALOG, KINDS, type FieldSpec, type Kind, type Region } from '../showcase/editor/catalog'
import { appSource, exportFiles, zip } from '../showcase/editor/codegen'
import { STARTERS, make, readApp, screen, type AppModel, type Node } from '../showcase/editor/model'

const root = fileURLToPath(new URL('../', import.meta.url))

/** Every component once for each word of each of its choices, with every other field as it starts. */
function variants(kind: Kind): Node[] {
  const out = [make(kind)]
  for (const [field, spec] of Object.entries(CATALOG[kind].fields) as [string, FieldSpec][]) {
    if (spec.kind === 'choice' || spec.kind === 'select') for (const [value] of spec.options) out.push(make(kind, { [field]: value }))
    if (spec.kind === 'toggle') out.push(make(kind, { [field]: true }), make(kind, { [field]: false }))
    if (spec.kind === 'action') for (const action of ['go:other', 'menu', 'details', 'show', 'say', 'none']) out.push(make(kind, { [field]: action, said: 'Done "now" & <here>' }))
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
    settings: { barSize: 'compact', sidebar: 'always', sidebarSearch: true, account: 'Anna Greco', tabs: 'wide', bottom: 'narrow', foot: 'always' },
    shared: { bar: show(group('bar')), tabs: group('tabs'), nav: group('sidebar'), foot: show(group('footer')), bottom: group('bottom') },
    screens: [
      screen('All of it', 'all', { status: 'Archived «one»', details: 'on', actionsOn: true, content: show(content), detailsItems: content.slice(0, 12).map((node) => make(node.type as Kind, { ...node.props })), actions: show(into('actions')) }),
      screen('Other', 'archive', { pad: 'none', width: 'full', content: [make('Empty')] }),
    ],
  }
}

/** Type-checks sources as files of a folder inside the repository, with `@acaprino/sigrid` read from `src`. */
function check(files: Record<string, string>): string[] {
  const dir = join(root, '.export-check')
  const names = Object.keys(files).map((file) => join(dir, file))
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
    paths: { '@acaprino/sigrid': ['src/index.ts'], '@tauri-apps/api/window': ['.export-check/tauri-window.d.ts'] },
  }
  const host = ts.createCompilerHost(options)
  const read = host.readFile.bind(host)
  const exists = host.fileExists.bind(host)
  const virtual = new Map(Object.entries(files).map(([file, text]) => [join(dir, file), text]))
  host.readFile = (file) => virtual.get(file) ?? read(file)
  host.fileExists = (file) => virtual.has(file) || exists(file)
  const folder = host.directoryExists?.bind(host)
  host.directoryExists = (path) => path.startsWith(dir) || (folder ? folder(path) : true)
  const program = ts.createProgram(names.filter((file) => /\.tsx?$/.test(file)), options, host)
  // The unused names of the toolkit's own files are not this test's business: only the exported sources are read for them.
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => !d.file || d.file.fileName.startsWith(dir))
    .map((d) => `${d.file ? `${d.file.fileName.replace(root, '')}:${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1} ` : ''}${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`)
}

const TAURI = 'export declare function getCurrentWindow(): { minimize(): Promise<void>; toggleMaximize(): Promise<void>; close(): Promise<void> }\n'

test('the source of every app the editor starts from, and of every component, type-checks against the toolkit', () => {
  const apps: Record<string, AppModel> = { everything: everything(), ...Object.fromEntries(STARTERS.map((starter) => [starter.id, starter.make()])) }
  const files: Record<string, string> = { 'tauri-window.d.ts': TAURI }
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
