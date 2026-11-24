// The width of a sheet at the side (`SheetContent width`): three named steps, the smallest by default; a sheet at the
// foot or the top is as wide as the window.
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Sheet, SheetContent, SheetTitle, type SheetWidth } from '../src/primitives'

function Open({ side, width }: { side: 'left' | 'right' | 'bottom' | 'top'; width?: SheetWidth }) {
  return (
    <Sheet open>
      <SheetContent side={side} width={width}>
        <SheetTitle>Write</SheetTitle>
      </SheetContent>
    </Sheet>
  )
}

const sheet = () => document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!

test('at the side a sheet is sm by default, and md or lg when named', () => {
  const { rerender } = render(<Open side="right" />)
  expect(sheet().className).toContain('sm:max-w-sm')
  rerender(<Open side="right" width="md" />)
  expect(sheet().className).toContain('sm:max-w-md')
  expect(sheet().className).not.toContain('sm:max-w-sm')
  rerender(<Open side="left" width="lg" />)
  expect(sheet().className).toContain('sm:max-w-lg')
  expect(sheet().className).toContain('w-3/4')
})

test('at the foot or the top the width is not used: the sheet is as wide as the window', () => {
  const { rerender } = render(<Open side="bottom" width="md" />)
  expect(sheet().className).toContain('w-full')
  expect(sheet().className).not.toContain('max-w-')
  rerender(<Open side="top" width="lg" />)
  expect(sheet().className).not.toContain('max-w-')
})

test('a sheet floats on the raised surface; one that covers a narrow window is on the page\'s ground there', () => {
  const drawn = (cover: boolean) => {
    const { unmount } = render(
      <Sheet open>
        <SheetContent cover={cover}>
          <SheetTitle>Details</SheetTitle>
        </SheetContent>
      </Sheet>,
    )
    const classes = document.querySelector('[data-slot="sheet-content"]')!.className.split(/\s+/)
    unmount()
    return classes
  }
  expect(drawn(false)).toContain('bg-raised')
  expect(drawn(false)).not.toContain('max-sm:bg-paper')
  expect(drawn(true)).toEqual(expect.arrayContaining(['bg-raised', 'w-full', 'max-sm:bg-paper']))
})
