import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Empty } from '../src/components/empty'
import { Kbd } from '../src/primitives/kbd'

test('Kbd renders a <kbd> with the same words', () => {
  render(<Kbd>Ctrl+Enter</Kbd>)
  const k = screen.getByText('Ctrl+Enter')
  expect(k.tagName).toBe('KBD')
  expect(k.getAttribute('data-slot')).toBe('kbd')
})

test('Empty: title, description and action, no image', () => {
  const onClick = vi.fn()
  const { container } = render(<Empty title="Nothing here." description="One sentence." action={<button onClick={onClick}>Do it</button>} />)
  expect(container.querySelector('[data-slot="empty"]')).not.toBeNull()
  expect(screen.getByText('Nothing here.').getAttribute('data-slot')).toBe('empty-title')
  expect(screen.getByText('One sentence.').getAttribute('data-slot')).toBe('empty-description')
  expect(container.querySelector('img, svg')).toBeNull()
  expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Do it' }))
  expect(onClick).toHaveBeenCalledTimes(1)
})

test('Empty: a description that is markup (a Note with its action) is a block, not a paragraph that would hold a div', () => {
  const { container } = render(<Empty title="Could not read" description={<div role="alert">The store is locked</div>} />)
  const description = container.querySelector('[data-slot="empty-description"]')!
  expect(description.tagName).toBe('DIV')
  expect(description.querySelector('[role="alert"]')).not.toBeNull()
})
