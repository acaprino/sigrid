// The width of a centred dialog (`Dialog width`): three named steps, `md` by default; a drawer keeps its own width.
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Dialog, type DialogProps } from '../src/components'

function Open(props: Partial<DialogProps>) {
  return <Dialog open onOpenChange={() => {}} title="Rename" {...props} />
}

const window_ = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!
const classes = () => window_().className.split(/\s+/)

test('a dialog is md by default, and lg or xl when named', () => {
  const { rerender } = render(<Open />)
  expect(classes()).toContain('sm:max-w-lg')
  rerender(<Open width="md" />)
  expect(classes()).toContain('sm:max-w-lg')
  rerender(<Open width="lg" />)
  expect(classes()).toContain('sm:max-w-2xl')
  expect(classes()).not.toContain('sm:max-w-lg')
  rerender(<Open width="xl" />)
  expect(classes()).toContain('sm:max-w-4xl')
  expect(classes()).not.toContain('sm:max-w-2xl')
})

test('a window narrower than the step still leaves its margin on a phone', () => {
  render(<Open width="xl" />)
  expect(classes()).toContain('max-w-[calc(100%-2rem)]')
})

test('a drawer has its own width and ignores the step', () => {
  render(<Open drawer width="xl" />)
  expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()
  const sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!
  expect(sheet.className).toContain('sm:max-w-xl')
  expect(sheet.className).not.toContain('sm:max-w-4xl')
})
