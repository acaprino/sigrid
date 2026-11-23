// @vitest-environment node
// `sigrid-check`'s own rule, `own-class`: off by default; turned on by an app that writes no interface code of its own,
// it reports every class written by hand and every stylesheet of the app, with its place, and passes over a line
// excepted with its reason. The rules of zero-slop-design keep working beside it (test/agents.test.ts).
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, expect, test } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))
let app = ''
beforeEach(() => {
  app = mkdtempSync(join(tmpdir(), 'sigrid-own-class-'))
  mkdirSync(join(app, 'src'))
})
afterEach(() => rmSync(app, { recursive: true, force: true }))
const check = (...args: string[]) => spawnSync(process.execPath, [`${root}bin/sigrid-check.mjs`, ...args], { cwd: app, encoding: 'utf8' })
const write = (file: string, text: string) => writeFileSync(join(app, file), text)
const on = (severity = 'error') => write('sigrid-check.config.json', JSON.stringify({ rules: { 'own-class': severity } }))

// An app laid out with the toolkit's parts, and one that writes a class, an HTML class and a stylesheet.
const clean = "import { Column, Text } from '@acaprino/sigrid'\nexport const A = () => <Column gap=\"sm\"><Text variant=\"muted\">Fine</Text></Column>\n"
const classed = 'export const B = () => <div className="flex gap-2">B</div>\n'

test('off by default: an app with classes and a stylesheet passes, as it did', () => {
  write('src/B.tsx', classed)
  write('src/b.css', '.b { gap: var(--spacing); }\n')
  const run = check()
  expect(run.stdout).not.toMatch(/own-class/)
  expect(run.status).toBe(0)
})

test('turned on, a class written by hand and a stylesheet of the app are findings with their place; the parts are not', () => {
  on()
  write('src/A.tsx', clean)
  write('src/B.tsx', classed)
  write('src/page.ts', "export const page = (el: HTMLElement) => { el.classList.add('open'); return '<p class=\"x\">p</p>' }\n")
  write('src/b.css', '.b { gap: var(--spacing); }\n')
  const run = check()
  expect(run.status).toBe(1)
  expect(run.stdout).toMatch(/B\.tsx:1:\d+ error own-class "className="/)
  expect(run.stdout).toMatch(/page\.ts:1:\d+ error own-class "classList\.add\("/)
  expect(run.stdout).toMatch(/page\.ts:1:\d+ error own-class "class="/)
  expect(run.stdout).toMatch(/b\.css:1:1 error own-class/)
  expect(run.stdout).not.toMatch(/A\.tsx/)
  expect(run.stdout).toMatch(/4 errors/)
})

test('with a reason a line is excepted, above it or on it; without one it is not', () => {
  on()
  write('src/B.tsx', `// design-check-ignore-next-line own-class: the canvas of a third-party chart asks for its class\n${classed}`)
  write('src/C.tsx', 'export const C = () => <div className="x">C</div> // design-check-ignore own-class: a third-party widget\n')
  expect(check().status).toBe(0)
  write('src/B.tsx', `// design-check-ignore-next-line own-class\n${classed}`)
  const run = check()
  expect(run.status).toBe(1)
  // Both: the exception without its reason, and the class it did not except.
  expect(run.stdout).toMatch(/exception-reason/)
  expect(run.stdout).toMatch(/B\.tsx:2:\d+ error own-class/)
})

test('a class given by a prop, an object or setAttribute is found; a comparison, a data attribute and the words of an exception are not', () => {
  on()
  write(
    'src/D.tsx',
    [
      'export const D = () => <Empty title="t" titleClassName="x" />',
      "export const props = { className: 'x' }",
      "export const set = (el: Element) => el.setAttribute('class', 'x')",
      "export const same = (el: Element) => el.className === 'x'",
      'export const E = () => <div data-class="x">E</div>',
      '// design-check-ignore-next-line own-class: the widget sets className= on its own root',
      'export const F = () => <Widget className="w" />',
      '',
    ].join('\n'),
  )
  const run = check()
  expect(run.stdout).toMatch(/D\.tsx:1:\d+ error own-class "titleClassName="/)
  expect(run.stdout).toMatch(/D\.tsx:2:\d+ error own-class "className:"/)
  expect(run.stdout).toMatch(/D\.tsx:3:\d+ error own-class/)
  expect(run.stdout).not.toMatch(/D\.tsx:[4-7]:/)
  expect(run.stdout).toMatch(/3 errors/)
})

test('every stylesheet is found, a .scss too; one that says why it stays is passed over', () => {
  on()
  write('src/a.scss', '.a { gap: var(--spacing); }\n')
  write('src/entry.css', '/* design-check-ignore own-class: the entry of the fonts, kept by the host */\n@import "x.css";\n')
  const run = check()
  expect(run.stdout).toMatch(/a\.scss:1:1 error own-class/)
  expect(run.stdout).not.toMatch(/entry\.css/)
})

test('as a warning it still fails the run, and the JSON report counts it', () => {
  on('warning')
  write('src/B.tsx', classed)
  const run = check('--json')
  expect(run.status).toBe(1)
  const report = JSON.parse(run.stdout) as { warnings: number; findings: { rule: string; severity: string; file: string }[]; coverage: { checked: string[] } }
  expect(report.warnings).toBe(1)
  expect(report.findings).toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'own-class', severity: 'warning', file: 'B.tsx' })]))
  expect(report.coverage.checked.some((line) => line.includes('own-class'))).toBe(true)
})

test('a severity it does not know is refused before anything is checked', () => {
  on('loud')
  const run = check()
  expect(run.status).toBe(2)
  expect(run.stderr).toMatch(/own-class/)
})
