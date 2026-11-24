// @vitest-environment node
// Sides are logical in the toolkit's classes: `ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `border-s`,
// so a screen in a language written from the right mirrors by itself. A physical side is written only where the side
// is the meaning: the two sides a card of a `SwipeDeck` is thrown to, the corner of the screen the notices sit in, and
// a thing centred with `left-1/2` and a translate (which a logical side would not centre).
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { expect, test } from 'vitest'
import { root, walk } from './helpers'

const BEFORE = String.raw`(?<=[\s"'` + '`' + String.raw`:!])`
const SPACING = new RegExp(BEFORE + String.raw`-?(?:pl|pr|ml|mr)-(?=[\w\[(])`)
const WORDS = new RegExp(BEFORE + String.raw`(?:text-left|text-right|border-[lr])(?![\w])`)
const PLACE = new RegExp(BEFORE + String.raw`-?(?:left|right)-(?=[\w\[(])`)
/** Where a physical place is the meaning. */
const PHYSICAL_PLACE = new Set(['src/assemblies/swipe-deck.tsx', 'src/components/Toasts.tsx', 'src/components/calendar.tsx'])

test('no class of the source names a physical side where a logical one would do', () => {
  const found: string[] = []
  for (const file of walk(join(root, 'src')).filter((path) => /\.tsx?$/.test(path))) {
    const name = relative(root, file).replaceAll('\\', '/')
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, at) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
        if (SPACING.test(line) || WORDS.test(line) || (!PHYSICAL_PLACE.has(name) && PLACE.test(line))) found.push(`${name}:${at + 1}`)
      })
  }
  expect(found).toEqual([])
})
