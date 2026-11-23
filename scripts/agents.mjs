// What an agent that builds an app with the toolkit reads, written from the code so it cannot fall behind it:
// - `agents/catalog.json`: every source file of each entry of the package, what its head comment says, the components
//   it exports and, for each, the props the toolkit itself declares, with their comments. The props a component only
//   passes on (those of a `<button>`, of an Ark or Base UI part) are not listed: `passesOn` says there are some.
//   The object types a prop is made of (a column of the table, a notice, an option) are listed too, with their fields.
// - `agents/examples/*.tsx`: whole apps in the frame of the toolkit (`AppShell`), written by the code export of the
//   showcase's app editor from the apps it starts with. The same export is type-checked in test/editor-export.test.ts.
// `node scripts/agents.mjs` writes them; with `--check` it leaves `agents/` as it is and fails if a file is not what
// it would write (test/agents.test.ts runs it so). Run it after a change to a component's props or comments.
import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// With `/` on every system: the compiler names files so, and the paths written in the catalogue are the same everywhere.
const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\\/g, '/')
const check = process.argv.includes('--check')

/** The entries of the package, as an app imports them, and the file each one starts from. */
const ENTRIES = [
  ['@acaprino/sigrid', 'src/index.ts'],
  ['@acaprino/sigrid/table', 'src/table.ts'],
  ['@acaprino/sigrid/virtual', 'src/virtual.ts'],
  ['@acaprino/sigrid/reorder', 'src/reorder.ts'],
  ['@acaprino/sigrid/rich-text', 'src/rich-text.ts'],
  ['@acaprino/sigrid/graph', 'src/graph.ts'],
  // Its source is outside `src/`: the toolkit knows no shell (test/no-shell.test.ts).
  ['@acaprino/sigrid/tauri', 'tauri/index.ts'],
]

const config = ts.readConfigFile(`${root}tsconfig.json`, ts.sys.readFile)
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
const program = ts.createProgram(ENTRIES.map(([, file]) => `${root}${file}`), { ...options, noEmit: true })
const checker = program.getTypeChecker()

const own = (file) => file.startsWith(root) && !file.includes('/node_modules/')
const short = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
const say = (parts) => ts.displayPartsToString(parts).replace(/\s+/g, ' ').trim()

/**
 * The comment at the head of a file, as one text: what the file is, in the words of who wrote it. It is the first
 * comment of the file, `//` lines or a block, before the imports or right after them.
 */
function headComment(source) {
  // The positions are the compiler's, in the text as read: line ends are made `\n` only in what is taken from it, so a
  // checkout with CRLF (Windows) writes the same catalogue as one with LF.
  const text = source.text
  const first = source.statements.find((statement) => !ts.isImportDeclaration(statement))
  for (const at of [0, first ? first.getFullStart() : -1]) {
    if (at < 0) continue
    const ranges = ts.getLeadingCommentRanges(text, at) ?? []
    // Lines of `//` that follow one another are one comment; a block is one by itself.
    const lines = []
    for (const range of ranges) {
      const piece = text.slice(range.pos, range.end).replace(/\r\n/g, '\n')
      if (range.kind === ts.SyntaxKind.SingleLineCommentTrivia) lines.push(piece.replace(/^\/\/ ?/, ''))
      else if (lines.length === 0) return piece.replace(/^\/\*+\s?|\s*\*+\/$/g, '').split('\n').map((line) => line.replace(/^\s*\* ?/, '')).join('\n').trim()
      else break
    }
    // A comment right above a declaration is that declaration's, not the file's, unless it is the only one there is.
    if (lines.length > 0) return lines.join('\n').trim()
  }
  return ''
}

const typeText = (type, at) => short(checker.typeToString(type, at, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope).replace(/ \| undefined$/, ''), 200)

/** The fields of an object type that the toolkit declares, with their comments; and whether it has others, from a library or the browser. */
function fieldsOf(type, at) {
  // Each side of a union has its own fields (`AttachmentMarks` takes a summary, or the attachments themselves).
  const sides = type.isUnion() ? type.types : [type]
  const listed = new Map()
  let passesOn = false
  for (const side of sides) {
    for (const prop of checker.getPropertiesOfType(checker.getApparentType(side))) {
      const declared = prop.valueDeclaration ?? prop.declarations?.[0]
      if (!declared || !own(declared.getSourceFile().fileName)) {
        passesOn = true
        continue
      }
      if (listed.has(prop.name)) continue
      const text = say(prop.getDocumentationComment(checker))
      listed.set(prop.name, {
        name: prop.name,
        type: typeText(checker.getTypeOfSymbolAtLocation(prop, at), at),
        // In a union a field is needed only on its own side.
        ...(prop.flags & ts.SymbolFlags.Optional || sides.length > 1 ? {} : { required: true }),
        ...(text ? { doc: text } : {}),
      })
    }
  }
  return { fields: [...listed.values()], passesOn }
}

/**
 * A component is a value with a capital and then a small letter (not a CONSTANT) that can be called with props, or
 * an object React draws (`memo`, `forwardRef`). A context is neither: it is listed among the other names.
 */
function propsOf(symbol) {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
  if (!declaration || !/^[A-Z][a-z]/.test(symbol.name)) return null
  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration)
  const exotic = type.getProperty('$$typeof') !== undefined
  if (exotic && type.getProperty('Provider') && type.getProperty('Consumer')) return null
  let signature = type.getCallSignatures()[0]
  // `React.memo` and `forwardRef` give an object: its props are those of the type it was made with.
  if (!signature && exotic) signature = checker.getTypeArguments(type)[0]?.getCallSignatures()[0]
  if (!signature && !exotic) return null
  // What a component gives back is something React draws: a function that gives a string or a number is a helper.
  if (signature && !exotic && !/Element|ReactNode|ReactPortal|\bnull\b/.test(checker.typeToString(signature.getReturnType()))) return null
  const first = signature?.getParameters()[0]
  if (!first) return { props: [], passesOn: false }
  const found = fieldsOf(checker.getTypeOfSymbolAtLocation(first, declaration), declaration)
  return { props: found.fields, passesOn: found.passesOn }
}

/** An object type an app writes values of (a column, a notice, an option): its fields. Not a union of words, not a function. */
function typeOf(symbol) {
  const declaration = symbol.declarations?.[0]
  if (!declaration || !(ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration))) return null
  const type = checker.getDeclaredTypeOfSymbol(symbol)
  if (type.getCallSignatures().length > 0) return null
  const sides = type.isUnion() ? type.types : [type]
  if (!sides.some((side) => side.flags & ts.TypeFlags.Object)) return null
  const { fields } = fieldsOf(type, declaration)
  const parameters = (declaration.typeParameters ?? []).map((parameter) => parameter.getText())
  return fields.length > 0 ? { fields, ...(parameters.length > 0 ? { parameters } : {}) } : null
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
      if (!files.has(path)) files.set(path, { file: path, about: headComment(from), components: [], types: [], also: [] })
      const found = symbol.flags & ts.SymbolFlags.Value ? propsOf(symbol) : null
      const shape = found ? null : typeOf(symbol)
      const doc = say(symbol.getDocumentationComment(checker))
      // The name an app imports, which is not always the one in the file (`Dialog as DialogRoot`).
      if (found) files.get(path).components.push({ name: exported.name, ...(doc ? { doc } : {}), ...(found.props.length > 0 ? { props: found.props } : {}), ...(found.passesOn ? { passesOn: true } : {}) })
      // The props of a component have a type of their own (`ButtonProps`): they are already under the component.
      else if (shape && !/Props$/.test(exported.name)) files.get(path).types.push({ name: exported.name, ...(shape.parameters ? { parameters: shape.parameters } : {}), ...(doc ? { doc } : {}), fields: shape.fields })
      else files.get(path).also.push(exported.name)
    }
    const list = [...files.values()].sort((a, b) => a.file.localeCompare(b.file, 'en'))
    for (const item of list) {
      item.components.sort((a, b) => a.name.localeCompare(b.name, 'en'))
      item.types.sort((a, b) => a.name.localeCompare(b.name, 'en'))
      item.also.sort((a, b) => a.localeCompare(b, 'en'))
      if (item.types.length === 0) delete item.types
      if (item.also.length === 0) delete item.also
      if (item.components.length === 0) delete item.components
    }
    entries.push({ import: name, files: list, ...(libraries.length > 0 ? { fromLibraries: libraries.sort((a, b) => a.localeCompare(b, 'en')) } : {}) })
  }
  return {
    about: 'The components of @acaprino/sigrid, written from its source by scripts/agents.mjs. `about` is the comment at the head of a file, `doc` the comment on a component. `props` are the props the toolkit declares; `passesOn` says the component also takes the props of the element or the part it draws. `types` are the object types those props are made of (a column, a notice, an option), with their fields. `also` are the other names the file exports: helpers, constants, types. `fromLibraries` are parts of Ark UI or Base UI the entry hands on unchanged.',
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
    text: `// ${app.name}: ${app.about}\n// A whole app in the toolkit's frame, written by the app editor of the showcase (scripts/agents.mjs). It is \`src/App.tsx\`\n// of the project the editor exports; where it runs and its window come from \`@acaprino/sigrid/tauri\`.\n${app.source}`,
  }))
}

const files = [{ path: 'agents/catalog.json', text: `${JSON.stringify(catalog(), null, 1)}\n` }, ...(await examples())]
const stale = files.filter((file) => !existsSync(`${root}${file.path}`) || readFileSync(`${root}${file.path}`, 'utf8').replace(/\r\n/g, '\n') !== file.text)
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
