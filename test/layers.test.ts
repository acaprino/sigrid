// @vitest-environment node
// The layers of the source, read from the imports of every file. Below everything, `src/lib` and `src/internal`
// (helpers: classes, focus, motion, overlays, the portal container) import nothing that draws. Then the levels, each
// a folder and an entry of the package, each on the ones before it: the primitives (`src/primitives`), the components
// (`src/components`), the frame of an app (`src/layout`) and the assemblies (`src/assemblies`). A level never imports
// from one after it. And the entries of the levels stay light: what they reach by static imports takes nothing of the
// libraries that have entries of their own (the table, the long list, the order by hand, the rich text, the graph, the
// terminal, the code view) or
// of Motion, which loads only when an app turns animations on.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'
import { root, walk } from './helpers'

const src = join(root, 'src')

const rel = (file: string) => relative(root, file).replaceAll('\\', '/')

type Import = { specifier: string; typeOnly: boolean }

/** The `import … from` and `export … from` of a file (a dynamic `import()` is not among them: it loads later). */
function importsOf(file: string): Import[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, false)
  const found: Import[] = []
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      found.push({ specifier: statement.moduleSpecifier.text, typeOnly: statement.importClause?.isTypeOnly ?? false })
    } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      found.push({ specifier: statement.moduleSpecifier.text, typeOnly: statement.isTypeOnly })
    }
  }
  return found
}

/** The file a relative specifier names, or null for a package. */
function target(from: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null
  const base = resolve(dirname(from), specifier)
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  throw new Error(`${rel(from)}: cannot resolve ${specifier}`)
}

const sources = walk(src).filter((file) => /\.tsx?$/.test(file))
const under = (dir: string) => (file: string) => rel(file).startsWith(`src/${dir}/`)

/** Every import from a file in `from` to a file `to` accepts, as «importer → imported». */
function crossings(from: (file: string) => boolean, to: (file: string) => boolean): string[] {
  return sources.filter(from).flatMap((file) =>
    importsOf(file)
      .map(({ specifier }) => target(file, specifier))
      .filter((imported): imported is string => imported !== null && to(imported))
      .map((imported) => `${rel(file)} → ${rel(imported)}`),
  )
}

/** The levels that draw, in their order: a folder of `src` and an entry of the package each. */
const LEVELS = ['primitives', 'components', 'layout', 'assemblies'] as const

describe('the layers of the source', () => {
  test('the helpers below the levels (src/lib, src/internal) import nothing that draws', () => {
    expect(crossings((f) => under('lib')(f) || under('internal')(f), (f) => LEVELS.some((level) => under(level)(f)))).toEqual([])
  })

  test.each(LEVELS.slice(0, -1).map((level, at) => [level, LEVELS.slice(at + 1)] as const))('%s imports from no level after it', (level, after) => {
    expect(crossings(under(level), (f) => after.some((later) => under(later)(f)))).toEqual([])
  })

  test('every file of a level is in the folder of its level: no file is left where the levels were mixed', () => {
    expect(existsSync(join(src, 'components', 'ui'))).toBe(false)
    for (const level of LEVELS) expect(sources.filter(under(level)).length, level).toBeGreaterThan(5)
  })

  test('an entry exports only from its own level (the ground: from none of them)', () => {
    const wrong: string[] = []
    for (const entry of ['index', ...LEVELS]) {
      const file = join(src, `${entry}.ts`)
      for (const { specifier } of importsOf(file)) {
        const imported = target(file, specifier)
        const level = imported === null ? undefined : LEVELS.find((name) => under(name)(imported))
        // The icons and the Markdown parts are files of the ground that a level's entry hands out.
        if (level !== undefined && level !== entry) wrong.push(`${entry} → ${rel(imported!)}`)
      }
    }
    expect(wrong).toEqual([])
  })

  test('the main entry and the entries of the levels reach none of the heavy libraries by a static import', () => {
    const HEAVY = /^(@tanstack\/|@dnd-kit\/|@tiptap\/|@xyflow\/|@dagrejs\/|@xterm\/|@codemirror\/|@lezer\/|motion($|\/))/
    const seen = new Set<string>()
    const found: string[] = []
    const queue = ['index', ...LEVELS].map((entry) => join(src, `${entry}.ts`))
    while (queue.length) {
      const file = queue.pop()!
      if (seen.has(file)) continue
      seen.add(file)
      for (const { specifier, typeOnly } of importsOf(file)) {
        if (typeOnly) continue
        const imported = target(file, specifier)
        if (imported) queue.push(imported)
        else if (HEAVY.test(specifier)) found.push(`${rel(file)} → ${specifier}`)
      }
    }
    // The walk did go through the toolkit, not just the entries.
    expect(seen.size).toBeGreaterThan(50)
    expect(found).toEqual([])
  })
})
