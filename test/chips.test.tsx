import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { ChipsInput } from '../src/internal/chips'

// The labels field (chips) on Ark UI's TagsInput, with Park's `tags-input` form. No motion. (How an app shows labels
// elsewhere is tested in the app's package.)

// The labels of steps («2/5») and of duration («1h 30m») carry an icon before the text; the others do not.

function Chips({ initial = [] as string[], spy }: { initial?: string[]; spy?: (v: string[]) => void }) {
  const [tags, setTags] = useState(initial)
  return (
    <>
      <label htmlFor="tags">Labels</label>
      <ChipsInput
        id="tags"
        value={tags}
        onChange={(v) => {
          spy?.(v)
          setTags(v)
        }}
        placeholder="Type, then Enter or comma"
      />
    </>
  )
}
const chipTexts = () => [...document.querySelectorAll('[data-slot="chip"]')].map((c) => c.textContent)

// Ark's TagsInput acts in a microtask after each event (a paste, in an animation frame): `settle()` lets it.
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 50))))
const typed = async (box: HTMLElement, text: string) => {
  fireEvent.input(box, { target: { value: text } })
  await settle()
}
const pasted = async (box: HTMLElement, text: string) => {
  fireEvent.input(box, { target: { value: text }, inputType: 'insertFromPaste' })
  await settle()
}
const pressed = async (box: HTMLElement, key: string) => {
  fireEvent.keyDown(box, { key })
  await settle()
}

test('chips: labelled box, Enter and comma add, duplicates ignored, Backspace removes the last', async () => {
  const spy = vi.fn()
  render(
    <>
      <Chips initial={['email']} spy={spy} />
      <button>Elsewhere</button>
    </>,
  )
  const box = screen.getByRole('textbox', { name: 'Labels' }) as HTMLInputElement
  act(() => box.focus())
  await settle()
  await typed(box, 'home')
  await pressed(box, 'Enter')
  expect(chipTexts()).toEqual(['email', 'home'])
  expect(box.value).toBe('')
  // A comma closes the label being written, and is never part of it.
  await typed(box, 'one')
  await typed(box, 'one,')
  expect(chipTexts()).toEqual(['email', 'home', 'one'])
  expect(box.value).toBe('')
  // A label already there is not added again, whatever its case; the box is emptied all the same.
  await typed(box, 'EMAIL')
  await pressed(box, 'Enter')
  expect(chipTexts()).toEqual(['email', 'home', 'one'])
  expect(box.value).toBe('')
  // A pasted list is split at the commas; the ones already there are left out.
  await pasted(box, 'two, Home ,three')
  expect(chipTexts()).toEqual(['email', 'home', 'one', 'two', 'three'])
  expect(spy).toHaveBeenLastCalledWith(['email', 'home', 'one', 'two', 'three'])
  expect(box.value).toBe('')
  // Backspace in the empty box removes the last label, at the first press.
  await pressed(box, 'Backspace')
  expect(chipTexts()).toEqual(['email', 'home', 'one', 'two'])
  // Backspace while writing only deletes text.
  await typed(box, 'x')
  await pressed(box, 'Backspace')
  expect(chipTexts()).toEqual(['email', 'home', 'one', 'two'])
  await typed(box, '')
  // Enter in the empty box adds nothing.
  await pressed(box, 'Enter')
  expect(chipTexts()).toEqual(['email', 'home', 'one', 'two'])
  // The text left in the box becomes a label when the field is left.
  await typed(box, 'four')
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }))
  act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus())
  await settle()
  expect(chipTexts()).toEqual(['email', 'home', 'one', 'two', 'four'])
})

test('chips: the arrows walk the chips from the box, and Delete or Backspace removes the one reached', async () => {
  const spy = vi.fn()
  const { unmount } = render(<Chips initial={['email', 'home', 'work']} spy={spy} />)
  let box = screen.getByRole('textbox', { name: 'Labels' }) as HTMLInputElement
  act(() => box.focus())
  await settle()
  const reached = () => [...document.querySelectorAll('[data-slot="chip"][data-highlighted]')].map((c) => c.textContent)
  await pressed(box, 'ArrowLeft')
  expect(reached()).toEqual(['work'])
  await pressed(box, 'ArrowLeft')
  expect(reached()).toEqual(['home'])
  // Focus never leaves the box: one Tab stop for the whole field.
  expect(document.activeElement).toBe(box)
  await pressed(box, 'Delete')
  expect(chipTexts()).toEqual(['email', 'work'])
  expect(spy).toHaveBeenLastCalledWith(['email', 'work'])
  // The chip that took its place is the one reached now: Delete again removes it too.
  expect(reached()).toEqual(['work'])
  await pressed(box, 'Delete')
  expect(chipTexts()).toEqual(['email'])
  // Esc goes back to the box without removing anything.
  await pressed(box, 'ArrowLeft')
  expect(reached()).toEqual(['email'])
  await pressed(box, 'Escape')
  expect(reached()).toEqual([])
  expect(chipTexts()).toEqual(['email'])
  expect(document.activeElement).toBe(box)
  unmount()

  // Backspace on a chip reached with the arrows removes that one, not the last.
  render(<Chips initial={['email', 'home', 'work']} spy={spy} />)
  box = screen.getByRole('textbox', { name: 'Labels' }) as HTMLInputElement
  act(() => box.focus())
  await settle()
  await pressed(box, 'ArrowLeft')
  await pressed(box, 'ArrowLeft')
  expect(reached()).toEqual(['home'])
  await pressed(box, 'Backspace')
  expect(chipTexts()).toEqual(['email', 'work'])
})

test('chips: text that arrives with commas in one go closes the labels before the last comma and keeps the rest', async () => {
  const spy = vi.fn()
  render(<Chips initial={['email']} spy={spy} />)
  const box = screen.getByRole('textbox', { name: 'Labels' }) as HTMLInputElement
  act(() => box.focus())
  await settle()
  await typed(box, 'ho')
  // An autocorrection replaces «ho» with «home, EMAIL, gar» in a single event.
  await typed(box, 'home, EMAIL, gar')
  expect(chipTexts()).toEqual(['email', 'home'])
  expect(spy).toHaveBeenLastCalledWith(['email', 'home'])
  expect(box.value).toBe(' gar')
  await pressed(box, 'Enter')
  expect(chipTexts()).toEqual(['email', 'home', 'gar'])
  expect(box.value).toBe('')
})

test('chips: each chip is a badge with a named remove button that keeps focus in the box', async () => {
  const spy = vi.fn()
  render(<Chips initial={['email', 'home']} spy={spy} />)
  await settle()
  const chip = document.querySelector('[data-slot="chip"]') as HTMLElement
  expect(chip.getAttribute('data-variant')).toBe('secondary')
  // The label color, the same as the row's (test/tag-colors.test.tsx), as an 8px dot on a neutral chip (R10: data
  // colours never as a filled block).
  expect(chip.getAttribute('data-tag-hue')).toMatch(/^[1-8]$/)
  expect(chip.className).not.toContain('bg-(--tag-bg)')
  expect(chip.className).toContain('bg-ink/6')
  const dot = chip.querySelector('[data-slot="chip-dot"]') as HTMLElement
  expect(dot.getAttribute('aria-hidden')).toBe('true')
  for (const c of ['size-2', 'rounded-full', 'bg-(--tag-ink)']) expect(dot.className.split(' '), c).toContain(c)
  expect(chip.className).not.toMatch(/transition-\[/)
  // Ark's parts: the chip is the item preview, its text and its remove button are named parts.
  expect(chip.getAttribute('data-scope')).toBe('tags-input')
  expect(chip.getAttribute('data-part')).toBe('item-preview')
  const remove = screen.getByRole('button', { name: 'Remove label email' })
  expect(remove.tagName).toBe('BUTTON')
  // The remove buttons are for the pointer: from the keyboard the field is one Tab stop (see the arrows above).
  expect(remove.tabIndex).toBe(-1)
  fireEvent.click(remove)
  await settle()
  expect(spy).toHaveBeenLastCalledWith(['home'])
  expect(chipTexts()).toEqual(['home'])
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Labels' }))
  // The colors come from the attribute, not from a style: the field carries no inline style at all.
  const field = document.querySelector('[data-scope="tags-input"][data-part="root"]')!
  expect(field.hasAttribute('style')).toBe(false)
  expect(field.querySelector('[style]')).toBeNull()
  // Ark tells screen readers what happened, in our words (its live region, outside the field).
  expect(document.querySelector('#__live-region__')?.textContent).toBe('Label email removed')
})

test('chips: the placeholder shows only with no tags; the box border keeps the 3:1 token', () => {
  const { unmount } = render(<Chips />)
  expect(screen.getByPlaceholderText('Type, then Enter or comma')).toBeTruthy()
  unmount()
  render(<Chips initial={['a']} />)
  expect(screen.queryByPlaceholderText('Type, then Enter or comma')).toBeNull()
  const box = screen.getByRole('textbox', { name: 'Labels' }).parentElement as HTMLElement
  expect(box.className).toContain('border-input')
})

// The remove button of a chip, named and with its tooltip.
test('the tag remove button keeps its name and shows it as a tooltip on focus', async () => {
  render(<ChipsInput id="tags" value={['home']} onChange={() => {}} />)
  const remove = screen.getByRole('button', { name: 'Remove label home' })
  expect(remove.hasAttribute('title')).toBe(false)
  await act(async () => {
    fireEvent.focus(remove)
    remove.focus()
  })
  const content = await screen.findByText('Remove label home', { selector: '[data-slot="tooltip-content"]' })
  expect(content.getAttribute('aria-hidden')).toBe('true')
  expect(screen.getAllByRole('button', { name: 'Remove label home' })).toHaveLength(1)
})
