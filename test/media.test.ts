// @vitest-environment node
// The breakpoint of `useMedia`'s narrow query is the theme's `md`: both live in the toolkit.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))
const readFile = (file: string) => readFileSync(`${root}${file}`, 'utf8')

test('the narrow query is the md breakpoint of the theme', () => {
  const theme = readFile('src/styles/theme.css')
  const md = /--breakpoint-md:\s*(\d+)px/.exec(theme)![1]
  expect(readFile('src/internal/media.ts')).toContain(`'(width < ${md}px)'`)
})

test('the heights of theme.css: what is seen (100dvh until measured), the foot\'s room at its maximum, a page that fits', () => {
  const css = readFile('src/styles/theme.css').replace(/\r\n/g, '\n')
  expect(css).toMatch(/--app-height: 100dvh;/)
  expect(css).toMatch(/--safe-area-max-inset-bottom: env\(safe-area-max-inset-bottom, env\(safe-area-inset-bottom, 0px\)\);/)
  expect(css).toMatch(/--fit-height: calc\(var\(--app-height\) - var\(--bottom-bar-room, 0px\)\);/)
  // A page that fits (`Page fit`) stops the document's bounce and pull to refresh while it is shown.
  expect(css).toMatch(/html:has\(\[data-slot="page"\]\[data-fit\]\) \{\n\s*overscroll-behavior-y: none;/)
  // Nothing of the toolkit is sized with `100vh`: with the address bar showing it is taller than the screen.
  expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/100vh/)
})

test('the short query and the `short:` variant of the theme are one height', () => {
  const variant = /@custom-variant short \(@media \(height < (\d+)px\)\);/.exec(readFile('src/styles/theme.css'))![1]
  expect(readFile('src/internal/media.ts')).toContain(`export const SHORT = '(height < ${variant}px)'`)
})
