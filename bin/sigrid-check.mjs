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
// A line that is right as it is says so above it: `// design-check-ignore-next-line color-value: the brand's own red`.
// Exit code: 0 clean, 1 findings, 2 a wrong argument, or a folder or a file that is not there.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const home = fileURLToPath(new URL('../', import.meta.url))
const USE = 'sigrid-check [FOLDER] [--json]\nChecks the sources in FOLDER (default: src, or `root` of ./sigrid-check.config.json) against the rules of @acaprino/sigrid (DESIGN.md).'
const RULES = { 'color-value': 'error', 'color-function': 'error', 'palette-class': 'error', 'dimension-value': 'error', 'font-family': 'error', 'avoid-gradient': 'error', 'avoid-blur': 'error', 'avoid-emoji': 'error', 'exception-reason': 'error', 'avoid-shadow': 'off' }
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
const config = {
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
  ...own,
  root,
  rules: { ...RULES, ...(own.rules ?? {}) },
  ...(typeof own.known === 'string' ? { known: resolve(dirname(ownPath), own.known) } : {}),
}

const made = mkdtempSync(join(tmpdir(), 'sigrid-check-'))
let status = 2
try {
  const file = join(made, 'config.json')
  writeFileSync(file, JSON.stringify(config))
  const run = spawnSync(process.execPath, [`${home}tools/zero-slop-design/zsd.mjs`, 'check-code', `${home}DESIGN.md`, '--config', file, '--strict', ...flags], { stdio: 'inherit' })
  status = run.status ?? 2
} finally {
  rmSync(made, { recursive: true, force: true })
}
process.exit(status)
