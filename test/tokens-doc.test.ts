// @vitest-environment node
// `docs/tokens.css` is the list of the tokens that DESIGN.md and llms.txt send a reader to: it is written from the
// source (scripts/tokens.mjs), so a token added, removed or changed shows there too, and this test fails until it is
// written again (`node scripts/tokens.mjs`).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { themeTokens } from '../src/theme-engine'
import { BASE_THEME } from '../src/themes'

const root = fileURLToPath(new URL('../', import.meta.url))

test('docs/tokens.css is what scripts/tokens.mjs writes from the source as it is now', () => {
  expect(() => execFileSync(process.execPath, [`${root}scripts/tokens.mjs`, '--check'], { stdio: 'pipe' })).not.toThrow()
}, 60_000)

test('it names every colour the engine writes, with the value of the gray baseline', () => {
  const doc = readFileSync(`${root}docs/tokens.css`, 'utf8')
  for (const [name, value] of Object.entries(themeTokens(BASE_THEME, 'light').colors)) expect(doc, name).toContain(`--color-${name}: ${value};`)
})
