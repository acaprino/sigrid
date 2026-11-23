#!/usr/bin/env node
// `sigrid-check`: checks the sources of an app against the rules of the design system (DESIGN.md, which comes with
// the package). It finds values written by hand where a token belongs: a colour as hex, `rgb()` or `oklch()`, a
// Tailwind palette class (`bg-red-500`), a size in square brackets off the scale (`p-[7px]`), a gradient, a
// `backdrop-blur`, an emoji, and in CSS a font family that is not the system's.
// It does NOT find: a named class off the toolkit's scale (`rounded-2xl`, `text-3xl`, `font-bold`), a number or a
// colour name in an inline style, an animation that loops, a border and a shadow on one element, and nothing of the
// layout, the contrast as drawn or the states. Those are read in the code and looked at in a browser.
//   sigrid-check              checks ./src
//   sigrid-check app/ui       checks that folder
//   sigrid-check --json       the findings as JSON, for a tool
// An app keeps its own choices in `sigrid-check.config.json` at the folder the command runs in, in the form of the
// toolkit's `design-check.config.json`: `root` (the folder checked, when none is named), `ignore`, `extensions`,
// `known`, and `rules`, which are laid over the toolkit's own, so a file that names no rule changes none.
// One rule is the app's to turn on: `own-class` ("rules": { "own-class": "error" }), for an app that writes no interface
// code of its own and lays out with the toolkit's layout parts. It finds a class written by hand (`className=`, `class=`,
// a `…ClassName` prop, `classList.add(`, `setAttribute('class'`) and a stylesheet of the app's own. It is off by
// default: the owner's decision of 2026-11-23, until the toolkit has every part such an app needs.
// A line that is right as it is says so above it: `// design-check-ignore-next-line color-value: the brand's own red`.
// Exit code: 0 clean, 1 findings, 2 a wrong argument, or a folder or a file that is not there.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const home = fileURLToPath(new URL('../', import.meta.url))
const USE = 'sigrid-check [FOLDER] [--json]\nChecks the sources in FOLDER (default: src, or `root` of ./sigrid-check.config.json) against the rules of @acaprino/sigrid (DESIGN.md).'
const RULES = { 'color-value': 'error', 'color-function': 'error', 'palette-class': 'error', 'dimension-value': 'error', 'font-family': 'error', 'avoid-gradient': 'error', 'avoid-blur': 'error', 'avoid-emoji': 'error', 'exception-reason': 'error', 'avoid-shadow': 'off' }
const OWN_CLASS = 'own-class'
const stop = (message) => {
  console.error(`sigrid-check: ${message}`)
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(USE)
  process.exit(0)
}
const flags = args.filter((arg) => arg.startsWith('-'))
const folders = args.filter((arg) => !arg.startsWith('-'))
const unknown = flags.filter((flag) => flag !== '--json')
if (unknown.length > 0) stop(`unknown option ${unknown.join(' ')}\n${USE}`)
if (folders.length > 1) stop(`one folder at a time, not ${folders.length}: run it once for each`)

// The app's own choices, if it has any, with the toolkit's rules under them and the folder named over its `root`.
const ownPath = resolve('sigrid-check.config.json')
let own = {}
if (existsSync(ownPath)) {
  try {
    own = JSON.parse(readFileSync(ownPath, 'utf8'))
  } catch (error) {
    stop(`${ownPath} is not JSON: ${error.message}`)
  }
}
const root = resolve(folders[0] ?? (typeof own.root === 'string' ? resolve(dirname(ownPath), own.root) : 'src'))
if (!existsSync(root)) stop(`no folder ${root}`)
// `own-class` is this command's own rule: zero-slop-design does not know it, so it is taken out of what it is given.
const { [OWN_CLASS]: ownClass = 'off', ...ownRules } = own.rules ?? {}
if (!['off', 'warning', 'error'].includes(ownClass)) stop(`the rule ${OWN_CLASS} is "off", "warning" or "error", not ${JSON.stringify(ownClass)}`)
const config = {
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
  ...own,
  root,
  rules: { ...RULES, ...ownRules },
  ...(typeof own.known === 'string' ? { known: resolve(dirname(ownPath), own.known) } : {}),
}

const made = mkdtempSync(join(tmpdir(), 'sigrid-check-'))
let run
try {
  const file = join(made, 'config.json')
  writeFileSync(file, JSON.stringify(config))
  // The report lists every finding, the known ones too: room for a large one (the default is 1 MiB).
  run = spawnSync(process.execPath, [`${home}tools/zero-slop-design/zsd.mjs`, 'check-code', `${home}DESIGN.md`, '--config', file, '--strict', '--json'], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 })
} finally {
  rmSync(made, { recursive: true, force: true })
}
if (run.error) stop(`zero-slop-design did not run: ${run.error.message}`)
if (run.stderr) process.stderr.write(run.stderr)
let report = null
try {
  report = JSON.parse(run.stdout)
} catch {
  report = null
}
if (!report || !Array.isArray(report.findings)) {
  // Not a report (a file it could not read, a design it could not parse): what it said is the answer.
  process.stdout.write(run.stdout ?? '')
  process.exit(run.status || 2)
}

if (ownClass !== 'off') {
  const found = ownClassFindings(root, config, ownClass)
  report.findings.push(...found)
  report.errors += found.filter((f) => f.severity === 'error').length
  report.warnings += found.filter((f) => f.severity === 'warning').length
  report.coverage.checked.push(`classes and stylesheets of the app's own (${OWN_CLASS})`)
}

if (flags.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
else {
  // The form of zero-slop-design's own report, so a finding reads the same whichever rule found it.
  for (const f of report.findings) if (!f.known) process.stdout.write(`${f.file}:${f.line}:${f.column} ${f.severity} ${f.rule} ${JSON.stringify(f.text)}: ${f.message}\n`)
  process.stdout.write(`check-code: ${report.files} files, ${report.errors} errors, ${report.warnings} warnings, ${report.known} known\n`)
  for (const item of report.fixedKnown) process.stdout.write(`note: known defect no longer found: ${item.key}\n`)
  process.stdout.write(`Not checked: ${report.coverage.notChecked.join('; ')}\n`)
}
// Not `process.exit`: a long report written to a pipe is let out whole before the command ends.
process.exitCode = report.errors > 0 || report.warnings > 0 ? 1 : 0

/**
 * The classes and stylesheets an app wrote: a class given to an element or a component (`className=`, `class=`,
 * `titleClassName=`, `className:` in an object, `classList.add|toggle|replace(`, `setAttribute('class'`) in its sources,
 * and every stylesheet (`.css`, `.scss`, `.sass`, `.less`). The folders left out and the `ignore` globs are
 * zero-slop-design's (a copy of its walk: keep them in step when the tool is copied again). A line excepted with
 * `design-check-ignore(-next-line) own-class: <reason>` is passed over, and a stylesheet that holds that comment is too
 * (an exception with no reason is reported by zero-slop-design as `exception-reason`). The `known` list does not hold
 * this rule's findings.
 */
function ownClassFindings(folder, settings, severity) {
  const skip = new Set(['node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.turbo', '.vercel', 'dist', 'build', 'out', 'coverage', 'vendor', ...(settings.ignoreDirectories ?? [])])
  const ignored = (settings.ignore ?? []).map((glob) => new RegExp(`^${glob.split('**').map((part) => part.split('*').map((piece) => piece.replace(/[.+^${}()|[\]\\?]/g, '\\$&')).join('[^/]*')).join('.*')}$`))
  const STYLESHEET = new Set(['.css', '.scss', '.sass', '.less'])
  const extensions = new Set([...settings.extensions, ...STYLESHEET])
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      const rel = relative(folder, path).split(sep).join('/')
      if (ignored.some((pattern) => pattern.test(rel))) continue
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) walk(path)
      } else if (entry.isFile() && extensions.has(extname(entry.name)) && statSync(path).size <= 1024 * 1024) files.push(rel)
    }
  }
  walk(folder)
  // A class given by an attribute, a prop (`titleClassName`), an object key or a default (not `===`, not `data-class`),
  // by the class list, or by `setAttribute`.
  const CLASS = /(?<![\w$-])(?:class|className|[a-z]\w*ClassName)\s*(?:=(?!=)|\+=|:(?!:))|\bclassList\.(?:add|toggle|replace)\s*\(|\bsetAttribute\(\s*['"]class['"]/g
  const EXCEPTION = new RegExp(`design-check-ignore(-next-line)?\\s+${OWN_CLASS}\\s*:\\s*\\S`)
  const message = (what) => `${what}: an app that turned ${OWN_CLASS} on lays out with the toolkit's layout parts and writes no class or stylesheet of its own.`
  const out = []
  for (const file of files.sort()) {
    const text = readFileSync(join(folder, file), 'utf8')
    if (STYLESHEET.has(extname(file))) {
      if (!EXCEPTION.test(text)) out.push({ rule: OWN_CLASS, file, line: 1, column: 1, text: file, severity, message: message('A stylesheet of the app') })
      continue
    }
    const lines = text.split(/\r?\n/)
    lines.forEach((line, index) => {
      const above = index > 0 ? lines[index - 1].match(EXCEPTION) : null
      const here = line.match(EXCEPTION)
      if ((above && above[1]) || (here && !here[1])) return
      // The words of an exception (its reason may name a class) are not code.
      const code = line.replace(/design-check-ignore.*$/, '')
      for (const m of code.matchAll(CLASS)) out.push({ rule: OWN_CLASS, file, line: index + 1, column: m.index + 1, text: m[0].trim(), severity, message: message('A class written by the app') })
    })
  }
  return out
}
