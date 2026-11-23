// What an agent that builds an app with the toolkit reads, written from the code so it cannot fall behind it:
// - `agents/catalog.json`: every source file of each entry of the package, what its head comment says, the components
//   it exports and, for each, the props the toolkit itself declares, with their comments. The props a component only
//   passes on (those of a `<button>`, of an Ark or Base UI part) are not listed: `passesOn` says there are some.
// - `agents/examples/*.tsx`: whole apps in the frame of the toolkit (`AppShell`), written by the code export of the
//   showcase's app editor from the apps it starts with. The same export is type-checked in test/editor-export.test.ts.
// `node scripts/agents.mjs` writes them; with `--check` it writes nothing and fails if a file is not what it would
// write (test/agents.test.ts runs it so). Run it after a change to a component's props or comments.
import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const check = process.argv.includes('--check')

/** The entries of the package, as an app imports them, and the file each one starts from. */
const ENTRIES = [
  ['@acaprino/sigrid', 'src/index.ts'],
  ['@acaprino/sigrid/table', 'src/table.ts'],
  ['@acaprino/sigrid/virtual', 'src/virtual.ts'],
  ['@acaprino/sigrid/reorder', 'src/reorder.ts'],
  ['@acaprino/sigrid/rich-text', 'src/rich-text.ts'],
]

const config = ts.readConfigFile(`${root}tsconfig.json`, ts.sys.readFile)
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
const program = ts.createProgram(ENTRIES.map(([, file]) => `${root}${file}`), { ...options, noEmit: true })
const checker = program.getTypeChecker()

const own = (file) => file.startsWith(root) && !file.includes('/node_modules/')
const short = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
const say = (parts) => ts.displayPartsToString(parts).replace(/\s+/g, ' ').trim()

/** The comment at the head of a file, as one text: what the file is, in the words of who wrote it. */
function headComment(source) {
  const lines = []
  for (const line of source.text.split('\n')) {
    if (line.startsWith('//')) lines.push(line.replace(/^\/\/ ?/, ''))
    else if (line.trim() === '' && lines.length === 0) continue
    else break
  }
  return lines.join('\n').trim()
}

/** A component is a value with a capital and then a small letter (not a CONSTANT) that can be called with props, or is an object React draws. */
function propsOf(symbol) {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
  if (!declaration || !/^[A-Z][a-z]/.test(symbol.name) || !declaration.getSourceFile().fileName.endsWith('.tsx')) return null
  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration)
  let signature = type.getCallSignatures()[0]
  // `React.memo` and `forwardRef` give an object: its props are those of the type it was made with.
  if (!signature && type.getProperty('$$typeof')) signature = checker.getTypeArguments(type)[0]?.getCallSignatures()[0] ?? null
  if (!signature && !type.getProperty('$$typeof')) return null
  const first = signature?.getParameters()[0]
  const props = first ? checker.getTypeOfSymbolAtLocation(first, declaration) : null
  const all = props ? checker.getPropertiesOfType(checker.getApparentType(props)) : []
  const listed = []
  let passesOn = false
  for (const prop of all) {
    const at = prop.valueDeclaration ?? prop.declarations?.[0]
    if (!at || !own(at.getSourceFile().fileName)) {
      passesOn = true
      continue
    }
    const text = say(prop.getDocumentationComment(checker))
    listed.push({
      name: prop.name,
      type: short(checker.typeToString(checker.getTypeOfSymbolAtLocation(prop, declaration), declaration, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope).replace(/ \| undefined$/, ''), 200),
      ...(prop.flags & ts.SymbolFlags.Optional ? {} : { required: true }),
      ...(text ? { doc: text } : {}),
    })
  }
  return { props: listed, passesOn }
}

function catalog() {
  const entries = []
  for (const [name, file] of ENTRIES) {
    const source = program.getSourceFile(`${root}${file}`)
    const files = new Map()
    const libraries = []
    for (const exported of checker.getExportsOfModule(checker.getSymbolAtLocation(source))) {
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
      const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
      if (!declaration) continue
      const from = declaration.getSourceFile()
      // A part of a library the toolkit hands on as it is (the headless `Field`, `Collapsible`): named, not described.
      if (!own(from.fileName)) {
        libraries.push(exported.name)
        continue
      }
      const path = from.fileName.slice(root.length)
      if (!files.has(path)) files.set(path, { file: path, about: headComment(from), components: [], also: [] })
      const found = symbol.flags & ts.SymbolFlags.Value ? propsOf(symbol) : null
      // The name an app imports, which is not always the one in the file (`Dialog as DialogRoot`).
      const doc = say(symbol.getDocumentationComment(checker))
      if (found) files.get(path).components.push({ name: exported.name, ...(doc ? { doc } : {}), ...(found.props.length > 0 ? { props: found.props } : {}), ...(found.passesOn ? { passesOn: true } : {}) })
      else files.get(path).also.push(exported.name)
    }
    const list = [...files.values()].sort((a, b) => a.file.localeCompare(b.file, 'en'))
    for (const item of list) {
      item.components.sort((a, b) => a.name.localeCompare(b.name, 'en'))
      item.also.sort((a, b) => a.localeCompare(b, 'en'))
      if (item.also.length === 0) delete item.also
      if (item.components.length === 0) delete item.components
    }
    entries.push({ import: name, files: list, ...(libraries.length > 0 ? { fromLibraries: libraries.sort((a, b) => a.localeCompare(b, 'en')) } : {}) })
  }
  return {
    about: 'The components of @acaprino/sigrid, written from its source by scripts/agents.mjs. `about` is the comment at the head of a file, `doc` the comment on a component. `props` are the props the toolkit declares; `passesOn` says the component also takes the props of the element or the part it draws. `also` are the other names the file exports: helpers, constants, types. `fromLibraries` are parts of Ark UI or Base UI the entry hands on unchanged.',
    rules: 'DESIGN.md',
    entries,
  }
}

/** The apps the editor starts with, as the source its export writes. */
async function examples() {
  const out = `${root}node_modules/.cache/sigrid-agents/`
  mkdirSync(out, { recursive: true })
  await build({
    entryPoints: { editor: `${root}scripts/agents-editor.ts` },
    outdir: out,
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    jsx: 'automatic',
    outExtension: { '.js': '.mjs' },
    logLevel: 'silent',
  })
  const { apps } = await import(`${pathToFileURL(`${out}editor.mjs`).href}?${Date.now()}`)
  return apps.map((app) => ({
    path: `agents/examples/${app.id}.tsx`,
    text: `// ${app.name}: ${app.about}\n// A whole app in the toolkit's frame, written by the app editor of the showcase (scripts/agents.mjs). It is \`src/App.tsx\`\n// of the project the editor exports: \`./host\` is that project's file for the window of a native build.\n${app.source}`,
  }))
}

const files = [{ path: 'agents/catalog.json', text: `${JSON.stringify(catalog(), null, 1)}\n` }, ...(await examples())]
const stale = files.filter((file) => !existsSync(`${root}${file.path}`) || readFileSync(`${root}${file.path}`, 'utf8') !== file.text)
const kept = new Set(files.map((file) => file.path))
const gone = existsSync(`${root}agents/examples`) ? readdirSync(`${root}agents/examples`).map((name) => `agents/examples/${name}`).filter((path) => !kept.has(path)) : []

if (check) {
  if (stale.length + gone.length > 0) {
    console.error(`Not what scripts/agents.mjs would write: ${[...stale.map((file) => file.path), ...gone].join(', ')}. Run \`npm run agents\`.`)
    process.exit(1)
  }
} else {
  mkdirSync(`${root}agents/examples`, { recursive: true })
  for (const file of stale) writeFileSync(`${root}${file.path}`, file.text)
  for (const path of gone) rmSync(`${root}${path}`)
  console.log(`agents: ${files.length} files, ${stale.length} written, ${gone.length} removed`)
}
