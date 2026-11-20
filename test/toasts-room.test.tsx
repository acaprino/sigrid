// The notices publish the room they take at the bottom of the window (`--toasts-room` on the root), so that a sheet
// can keep its foot above them at every width (an app's own sheets read it too: tested in the app's package).
import { act, render } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Toasts } from '../src'

describe('the toasts publish the room they take at the bottom', () => {
  test('Toasts publish the height of their column on the document root, and take it away when they go', async () => {
    // jsdom measures nothing: every notice is 100px tall.
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset['part'] === 'root' ? 100 : 0
    })
    try {
      const room = () => document.documentElement.style.getPropertyValue('--toasts-room')
      const { unmount, rerender } = render(<Toasts items={[{ id: 'x', text: 'Deleted.' }]} />)
      await act(async () => {})
      // The notice and the 16px from the bottom.
      expect(room()).toBe('116px')
      // A second one above it, 8px apart.
      rerender(<Toasts items={[{ id: 'x', text: 'Deleted.' }, { id: 'y', text: 'Moved.' }]} />)
      await act(async () => {})
      expect(room()).toBe('224px')
      rerender(<Toasts items={[]} />)
      await act(async () => {})
      expect(room()).toBe('0px')
      unmount()
      expect(room()).toBe('')
    } finally {
      height.mockRestore()
    }
  })

  test('inline toasts publish nothing', async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    render(<Toasts inline items={[{ id: 'x', text: 'Deleted.' }]} />)
    await act(async () => {})
    expect(document.documentElement.style.getPropertyValue('--toasts-room')).toBe('')
    vi.unstubAllGlobals()
  })
})
