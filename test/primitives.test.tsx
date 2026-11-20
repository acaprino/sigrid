import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Button, Checkbox, Dialog, Input, Textarea } from '../src'

test('Button default is the accent action', () => {
  render(<Button>Add</Button>)
  const b = screen.getByRole('button', { name: 'Add' })
  expect(b.className).toMatch(/(^|\s)bg-primary(\s|$)/)
  expect(b.getAttribute('type')).toBe('button')
})

test('Button destructive uses the semantic red text and a soft background', () => {
  render(<Button variant="destructive">Delete</Button>)
  expect(screen.getByRole('button').className.split(' ')).toEqual(expect.arrayContaining([
    'bg-destructive-soft', 'text-destructive', 'hover:' + 'bg-destructive-soft/80',
  ]))
})

test('Checkbox is a real checkbox', () => {
  render(<Checkbox aria-label="Complete" checked onCheckedChange={() => {}} />)
  expect(screen.getByRole('checkbox', { name: 'Complete' }).getAttribute('data-state')).toBe('checked')
})

test('Dialog renders title and footer when open', () => {
  render(
    <Dialog open onOpenChange={() => {}} title="New area" footer={<Button>Create</Button>}>
      <Input aria-label="Name" />
    </Dialog>,
  )
  expect(screen.getByRole('dialog', { name: 'New area' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy()
})

test('primitives carry no automatic motion classes', () => {
  // `baseElement`: the Dialog lives in a portal, outside the container. `transition-none` is the absence of motion.
  const { baseElement } = render(
    <>
      <Button>x</Button>
      <Input />
      <Textarea />
      <Checkbox aria-label="Complete" />
      <Dialog open onOpenChange={() => {}} title="New area" footer={<Button>Create</Button>} />
    </>,
  )
  expect(baseElement.innerHTML).not.toMatch(/(^|[\s"])(transition|animate)-(?!none)/)
})
