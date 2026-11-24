// A long list as tall as the region that holds it (`VirtualList fill`), with the room inside its box a step of the
// scale (`pad`): an app writes no class for either.
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ItemRow } from '../src/components'
import { VirtualList } from '../src/virtual'

const box = () => screen.getByRole('list', { name: 'Messages' }).parentElement!

test('fill makes the box as tall as its region, and the box scrolls; pad is the room around the rows', () => {
  render(
    <VirtualList aria-label="Messages" count={5000} fill pad="sm">
      {(index) => <ItemRow title={`Message ${index + 1}`} />}
    </VirtualList>,
  )
  expect(box().getAttribute('data-slot')).toBe('virtual-list')
  expect(box().hasAttribute('data-fill')).toBe(true)
  // In a block its whole height (`h-full`), in a pile what the other parts leave (`flex-1`).
  for (const part of ['h-full', 'min-h-0', 'flex-1', 'overflow-y-auto', 'p-2']) expect(box().className).toContain(part)
})

test('without them the box has no height and no room of its own: the app gives one, as before', () => {
  render(
    <VirtualList aria-label="Messages" count={3}>
      {(index) => <ItemRow title={`Message ${index + 1}`} />}
    </VirtualList>,
  )
  expect(box().hasAttribute('data-fill')).toBe(false)
  expect(box().className).toBe('overflow-y-auto')
})
