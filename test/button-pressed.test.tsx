// A button that is a switch: `aria-pressed` gives it the selection tint and its ink; without it the button is as it was.
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Button } from '../src/primitives'

test('a pressed button has the selection tint, and a button that is not a switch has no such class state to show', () => {
  render(
    <>
      <Button aria-pressed>On</Button>
      <Button aria-pressed={false}>Off</Button>
      <Button>Plain</Button>
    </>,
  )
  expect(screen.getByRole('button', { name: 'On' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'On' }).className).toContain('aria-pressed:bg-selected')
  expect(screen.getByRole('button', { name: 'Off' }).getAttribute('aria-pressed')).toBe('false')
  expect(screen.getByRole('button', { name: 'Plain' }).hasAttribute('aria-pressed')).toBe(false)
})
