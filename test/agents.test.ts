// @vitest-environment node
// What the package gives a coding agent (AGENTS.md, llms.txt, agents/, the `sigrid-check` command, the Claude Code
// plugin): that it is all there and in the package, that the catalogue and the example apps are what the source says
// today, that every path the documents name exists, and that the check finds a mistake in an app and passes a clean one.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, test } from 'vitest'
import * as UI from '../src'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = (path: string) => readFileSync(`${root}${path}`, 'utf8')
const pkg = JSON.parse(read('package.json')) as { files: string[]; bin: Record<string, string>; exports: Record<string, unknown> }
/** The entries an app imports code from: those with types. */
const codeEntries = Object.entries(pkg.exports).filter(([, to]) => typeof to === 'object' && to !== null && 'types' in to).map(([key]) => key)

type Catalog = { entries: { import: string; fromLibraries?: string[]; files: { file: string; about: string; components?: { name: string; doc?: string; props?: { name: string; type: string; doc?: string; required?: boolean }[]; passesOn?: boolean }[]; also?: string[] }[] }[] }
const catalog = JSON.parse(read('agents/catalog.json')) as Catalog
const component = (entry: string, name: string) => catalog.entries.find((e) => e.import === entry)?.files.flatMap((f) => f.components ?? []).find((c) => c.name === name)

describe('the catalogue for agents', () => {
  test('agents/ is what scripts/agents.mjs writes from the source as it is now', () => {
    // A prop added, a comment changed, a starter app of the editor edited: `npm run agents` and commit.
    expect(() => execFileSync(process.execPath, [`${root}scripts/agents.mjs`, '--check'], { stdio: 'pipe' })).not.toThrow()
  }, 60_000)

  test('it has one entry for each entry of the package', () => {
    const entries = codeEntries.map((key) => `@acaprino/sigrid${key.slice(1)}`)
    expect(entries.length).toBeGreaterThan(4)
    expect(catalog.entries.map((e) => e.import).sort()).toEqual(entries.sort())
  })

  test('every name the main entry exports is in it, as a component or beside one', () => {
    const main = catalog.entries.find((e) => e.import === '@acaprino/sigrid')!
    const named = new Set([...main.files.flatMap((f) => [...(f.components ?? []).map((c) => c.name), ...(f.also ?? [])]), ...(main.fromLibraries ?? [])])
    expect(Object.keys(UI).filter((name) => !named.has(name))).toEqual([])
  })

  test('a component has its props with their comments, and says when it passes others on', () => {
    const row = component('@acaprino/sigrid', 'ItemRow')!
    expect(row.props!.find((p) => p.name === 'title')).toEqual({ name: 'title', type: 'React.ReactNode', required: true, doc: 'What the thing is: one line, cut with an ellipsis.' })
    expect(row.passesOn).toBeUndefined()
    // A button takes its own props and those of the element it draws.
    const button = component('@acaprino/sigrid', 'Button')!
    expect(button.props!.map((p) => p.name)).toContain('variant')
    expect(button.passesOn).toBe(true)
    expect(button.props!.map((p) => p.name)).not.toContain('onClick')
    // A name an app imports, not the one in the file.
    expect(component('@acaprino/sigrid', 'DialogRoot')).toBeDefined()
    expect(component('@acaprino/sigrid/table', 'DataTable')!.props!.map((p) => p.name)).toEqual(expect.arrayContaining(['columns', 'rows', 'rowId', 'virtual']))
  })

  test('every file with a component says what it is, and a constant is not taken for a component', () => {
    for (const entry of catalog.entries) for (const file of entry.files) if (file.components) expect(file.about.length > 20 || file.components.some((c) => (c.doc ?? '').length > 20 || (c.props ?? []).some((p) => p.doc)), file.file).toBe(true)
    expect(component('@acaprino/sigrid', 'APP_SHELL_STEPS')).toBeUndefined()
    expect(component('@acaprino/sigrid', 'AppShell')).toBeDefined()
  })
})

describe('the documents for agents', () => {
  test('they come with the package, with the rules, the guides and the tool of the check', () => {
    for (const path of ['AGENTS.md', 'llms.txt', 'DESIGN.md', 'agents', 'docs', 'bin', 'src', 'tools/zero-slop-design']) {
      expect(pkg.files, path).toContain(path)
      expect(existsSync(`${root}${path}`), path).toBe(true)
    }
    expect(pkg.bin).toEqual({ 'sigrid-check': './bin/sigrid-check.mjs' })
  })

  test('every path AGENTS.md, llms.txt and the skill name is in the package', () => {
    const paths = new Set<string>()
    for (const doc of ['AGENTS.md', 'llms.txt', 'plugins/sigrid/skills/sigrid/SKILL.md']) {
      for (const m of read(doc).matchAll(/[`(]((?:agents|docs|src|bin|tools)\/[\w./*-]*|[A-Z_]+\.md|llms\.txt)[`)]/g)) paths.add(m[1]!)
    }
    expect(paths.size).toBeGreaterThan(8)
    for (const path of paths) {
      // The instructions of the project that uses the toolkit: not a file of the package.
      if (path.includes('*') || path === 'CLAUDE.md') continue
      expect(existsSync(`${root}${path}`), path).toBe(true)
      expect(pkg.files.some((kept) => path === kept || path.startsWith(`${kept}/`)), `${path} is not in the package`).toBe(true)
    }
  })

  test('the entries AGENTS.md names are entries of the package, and the tokens it names are tokens', () => {
    const text = read('AGENTS.md')
    for (const entry of ['table', 'virtual', 'reorder', 'rich-text']) {
      expect(text).toContain(`\`/${entry}\``)
      expect(pkg.exports).toHaveProperty(`./${entry}`)
    }
    const theme = read('src/styles/theme.css')
    for (const token of ['--color-paper', '--color-raised', '--color-ink', '--color-ink-soft', '--color-ink-mute', '--color-line', '--color-selected', '--color-primary', '--shadow-float', '--control-md', '--row-height', '--pad-md']) expect(theme, token).toContain(token)
  })

  test('the plugin of Claude Code: a marketplace with one plugin, which has one skill', () => {
    const market = JSON.parse(read('.claude-plugin/marketplace.json')) as { name: string; owner: { name: string }; plugins: { name: string; source: string; description: string }[] }
    expect(market.name).toMatch(/^[a-z0-9][a-z0-9._-]*$/)
    expect(market.owner.name).toBeTruthy()
    expect(market.plugins).toHaveLength(1)
    const plugin = market.plugins[0]!
    // A path in the same repository starts with `./`.
    expect(plugin.source.startsWith('./')).toBe(true)
    const manifest = JSON.parse(read(`${plugin.source.slice(2)}/.claude-plugin/plugin.json`)) as { name: string; description: string; version: string }
    expect(manifest.name).toBe(plugin.name)
    expect(manifest.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    const skill = read(`${plugin.source.slice(2)}/skills/sigrid/SKILL.md`)
    const front = /^---\n([\s\S]*?)\n---\n/.exec(skill)
    expect(front).not.toBeNull()
    expect(front![1]).toMatch(/^name: sigrid$/m)
    const description = /^description: (.+)$/m.exec(front![1]!)?.[1] ?? ''
    expect(description.length).toBeGreaterThan(80)
    // What a listing of skills shows of a description.
    expect(description.length).toBeLessThan(1536)
    expect(skill.split('\n').length).toBeLessThan(500)
  })
})

describe('sigrid-check', () => {
  const app = mkdtempSync(join(tmpdir(), 'sigrid-check-test-'))
  afterAll(() => rmSync(app, { recursive: true, force: true }))
  const check = (...args: string[]) => spawnSync(process.execPath, [`${root}bin/sigrid-check.mjs`, ...args], { cwd: app, encoding: 'utf8' })
  // Written in pieces: Tailwind reads this file too, and must not find a palette class to compile here.
  const palette = ['bg', 'red', '500'].join('-')
  const hex = `#${'ff0000'}`

  test('a clean app passes, a colour written by hand and a palette class fail with the place of each', () => {
    mkdirSync(join(app, 'src'))
    writeFileSync(join(app, 'src', 'Good.tsx'), 'export const Good = () => <p className="rounded-md bg-paper p-4 text-sm text-ink">Fine</p>\n')
    const clean = check()
    expect(clean.stdout + clean.stderr).toMatch(/1 files, 0 errors/)
    expect(clean.status).toBe(0)

    writeFileSync(join(app, 'src', 'Bad.tsx'), `export const Bad = () => <p className="${palette}" style={{ color: '${hex}' }}>No</p>\n`)
    const bad = check()
    expect(bad.status).toBe(1)
    const said = bad.stdout + bad.stderr
    expect(said).toMatch(/Bad\.tsx:1:\d+ error color-value/)
    expect(said).toMatch(/Bad\.tsx:1:\d+ error palette-class/)
    expect(said).not.toMatch(/Good\.tsx/)
  })

  test('another folder can be named, and one that is not there is said so', () => {
    mkdirSync(join(app, 'ui'))
    writeFileSync(join(app, 'ui', 'A.tsx'), 'export const A = () => <p className="text-ink">A</p>\n')
    expect(check('ui').status).toBe(0)
    const none = check('nowhere')
    expect(none.status).toBe(2)
    expect(none.stderr).toMatch(/no folder/)
  })

  test("an app's own sigrid-check.config.json is used when no folder is named", () => {
    writeFileSync(join(app, 'sigrid-check.config.json'), JSON.stringify({ root: 'src', ignore: ['Bad.tsx'], extensions: ['.tsx'], rules: { 'color-value': 'error', 'palette-class': 'error' } }))
    expect(check().status).toBe(0)
  })
})
