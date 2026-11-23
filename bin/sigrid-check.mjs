#!/usr/bin/env node
// `sigrid-check`: checks the sources of an app against the rules of the design system (DESIGN.md, which comes with
// the package). It finds what can be read in the code: a colour written by hand in place of a token, a Tailwind
// palette class, a size off the scale, a font not of the system, a gradient, a blur, an emoji. It does not look at
// the layout, the contrast as drawn or the states: those are checked in a browser.
//   npx sigrid-check            checks ./src
//   npx sigrid-check app/ui     checks that folder
//   npx sigrid-check --json     the findings as JSON, for a tool
// An app with choices of its own (files to leave out, a rule turned off) keeps them in `sigrid-check.config.json` at
// its root, in the form of the toolkit's own `design-check.config.json`; `root` there is the folder checked.
// Exit code: 0 clean, 1 findings, 2 a folder or a file that is not there.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const home = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log('sigrid-check [FOLDER] [--json]\nChecks the sources in FOLDER (default: src) against the rules of @acaprino/sigrid (DESIGN.md).')
  process.exit(0)
}
const json = args.includes('--json')
const folder = args.find((arg) => !arg.startsWith('-'))
const own = resolve('sigrid-check.config.json')
const RULES = { 'color-value': 'error', 'color-function': 'error', 'palette-class': 'error', 'dimension-value': 'error', 'font-family': 'error', 'avoid-gradient': 'error', 'avoid-blur': 'error', 'avoid-emoji': 'error', 'exception-reason': 'error', 'avoid-shadow': 'off' }

let config = own
let made = null
if (folder !== undefined || !existsSync(own)) {
  const root = resolve(folder ?? 'src')
  if (!existsSync(root)) {
    console.error(`sigrid-check: no folder ${root}`)
    process.exit(2)
  }
  made = mkdtempSync(join(tmpdir(), 'sigrid-check-'))
  config = join(made, 'config.json')
  writeFileSync(config, JSON.stringify({ root, extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'], rules: RULES }))
}
const run = spawnSync(process.execPath, [`${home}tools/zero-slop-design/zsd.mjs`, 'check-code', `${home}DESIGN.md`, '--config', config, '--strict', ...(json ? ['--json'] : [])], { stdio: 'inherit' })
if (made) rmSync(made, { recursive: true, force: true })
process.exit(run.status ?? 2)
