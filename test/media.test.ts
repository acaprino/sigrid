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
