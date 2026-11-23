// @vitest-environment node
// The layers of the source, read from the imports of every file. Below the primitives, `src/lib` and `src/internal`
// (helpers: classes, focus, motion, overlays, the portal container) import no component. The primitives,
// `src/components/ui`, import only those helpers and one another. The composites, `src/components/*.tsx`, may import
// all of them. And the main entry stays light: what `src/index.ts` reaches by static imports takes nothing of the
// libraries that have entries of their own (the table, the long list, the order by hand, the rich text, the graph) or
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

describe('the layers of the source', () => {
  test('the helpers below the primitives (src/lib, src/internal) import no component', () => {
    expect(crossings((f) => under('lib')(f) || under('internal')(f), under('components'))).toEqual([])
  })

  test('a primitive (src/components/ui) imports no composite (src/components/*.tsx)', () => {
    const composite = (file: string) => /^src\/components\/[^/]+\.tsx?$/.test(rel(file))
    expect(crossings(under('components/ui'), composite)).toEqual([])
  })

  test('the main entry reaches none of the heavy libraries by a static import', () => {
    const HEAVY = /^(@tanstack\/|@dnd-kit\/|@tiptap\/|@xyflow\/|@dagrejs\/|motion($|\/))/
    const seen = new Set<string>()
    const found: string[] = []
    const queue = [join(src, 'index.ts')]
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
    // The walk did go through the toolkit, not just the entry.
    expect(seen.size).toBeGreaterThan(50)
    expect(found).toEqual([])
  })
})
