// The preview of an attachment (`AttachmentViewer`; how an app opens it is tested in the app's package): the state (downloading, error, ready), the pages with their measures,
// stepped zoom, the original button and the request for pages. The package does not open the document.
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AttachmentViewer, VIEWER_ZOOMS, type AttachmentViewerProps } from '../src/assemblies/AttachmentViewer'

const A4 = { width: 595, height: 842 }

function viewer(props: Partial<AttachmentViewerProps> = {}) {
  const onOpenChange = vi.fn()
  const rendered = render(<AttachmentViewer open onOpenChange={onOpenChange} title="quote.pdf" status={{ kind: 'ready' }} pages={[A4, A4, A4, A4]} {...props} />)
  return { onOpenChange, ...rendered }
}

describe('AttachmentViewer', () => {
  it('shows the file name and, once the document is ready, the page you are on', () => {
    viewer()
    expect(screen.getByText('quote.pdf')).toBeTruthy()
    expect(screen.getByText('Page 1 of 4')).toBeTruthy()
  })

  it('while downloading or preparing it says what it does, announced as a status, and shows neither pages nor zoom', () => {
    viewer({ status: { kind: 'loading', label: 'Downloading the file…' }, pages: [], onZoomChange: vi.fn() })
    expect(within(screen.getByRole('status')).getByText('Downloading the file…')).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Zoom' })).toBeNull()
    expect(screen.queryByLabelText('Pages of the document')).toBeNull()
  })

  it('an error has the one look of a failure, a `Note` error: announced, «Error» read first, and it offers the original', () => {
    const onOpenOriginal = vi.fn()
    viewer({ status: { kind: 'error', message: 'I cannot show this file.' }, onOpenOriginal, originalLabel: 'Download the file' })
    const notice = screen.getByRole('alert')
    expect(within(notice).getByText('Error:')).toBeTruthy()
    expect(within(notice).getByText('I cannot show this file.')).toBeTruthy()
    expect(notice.textContent).toMatch(/^Error: I cannot show this file\./)
    fireEvent.click(within(notice).getByRole('button', { name: 'Download the file' }))
    expect(onOpenOriginal).toHaveBeenCalledTimes(1)
  })

  it('each page has its place before the image (ratio and number) and then the image', () => {
    viewer({ pages: [{ ...A4, src: 'blob:page-1' }, { width: 842, height: 595 }] })
    const pages = screen.getAllByRole('img')
    expect(pages.map((p) => p.getAttribute('aria-label'))).toEqual(['Page 1 of 2', 'Page 2 of 2'])
    expect((pages[0] as HTMLElement).style.aspectRatio).toBe('595 / 842')
    expect((pages[1] as HTMLElement).style.aspectRatio).toBe('842 / 595')
    expect(pages[0]?.querySelector('img')?.getAttribute('src')).toBe('blob:page-1')
    // The second one is not drawn yet: the number holds the place, no image.
    expect(pages[1]?.querySelector('img')).toBeNull()
    expect(within(pages[1] as HTMLElement).getByText('2')).toBeTruthy()
  })

  it('without IntersectionObserver it asks for the first three pages, once each', () => {
    const onNeedPage = vi.fn()
    viewer({ onNeedPage })
    expect(onNeedPage.mock.calls.map(([i]) => i)).toEqual([0, 1, 2])
  })

  it('with IntersectionObserver it asks only for the pages that come near and follows the most visible one', () => {
    const callbacks: Array<(entries: Array<Partial<IntersectionObserverEntry>>) => void> = []
    class Observer {
      constructor(callback: (entries: Array<Partial<IntersectionObserverEntry>>) => void) {
        callbacks.push(callback)
      }
      observe = vi.fn()
      disconnect = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', Observer)
    try {
      const onNeedPage = vi.fn()
      viewer({ onNeedPage })
      expect(onNeedPage).not.toHaveBeenCalled()
      const pageAt = (n: number) => document.querySelector(`[data-page="${n}"]`) as Element
      const [near, seen] = callbacks as [(typeof callbacks)[0], (typeof callbacks)[0]]
      near([{ target: pageAt(2), isIntersecting: true }, { target: pageAt(3), isIntersecting: false }])
      expect(onNeedPage.mock.calls.map(([i]) => i)).toEqual([2])
      act(() => seen([{ target: pageAt(1), intersectionRatio: 0.3 }, { target: pageAt(2), intersectionRatio: 0.9 }]))
      expect(screen.getByText('Page 3 of 4')).toBeTruthy()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('zoom goes in steps: “Zoom in” and “Zoom out” propose the nearby step and switch off at the ends', () => {
    const onZoomChange = vi.fn()
    const { rerender, onOpenChange } = viewer({ zoom: 1, onZoomChange })
    expect(screen.getByText('100%')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(onZoomChange.mock.calls.map(([z]) => z)).toEqual([1.5, 0.75])
    const props = { open: true, onOpenChange, title: 'quote.pdf', status: { kind: 'ready' } as const, pages: [A4], onZoomChange }
    rerender(<AttachmentViewer {...props} zoom={VIEWER_ZOOMS[0]} />)
    expect((screen.getByRole('button', { name: 'Zoom out' }) as HTMLButtonElement).disabled).toBe(true)
    rerender(<AttachmentViewer {...props} zoom={VIEWER_ZOOMS.at(-1)} />)
    expect((screen.getByRole('button', { name: 'Zoom in' }) as HTMLButtonElement).disabled).toBe(true)
    // A value outside the list reads as the nearest step.
    rerender(<AttachmentViewer {...props} zoom={1.2} />)
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('the column follows the zoom: under 1 it stays centered, over 1 it also scrolls sideways', () => {
    const { rerender, onOpenChange } = viewer({ zoom: 0.5 })
    const column = () => screen.getAllByRole('img')[0]?.parentElement as HTMLElement
    expect(column().style.width).toBe('50%')
    expect(column().className).toContain('mx-auto')
    rerender(<AttachmentViewer open onOpenChange={onOpenChange} title="x.pdf" status={{ kind: 'ready' }} pages={[A4]} zoom={2} />)
    expect(column().style.width).toBe('200%')
    expect(column().className).not.toContain('mx-auto')
  })

  it('“Open the original” is there only if whoever uses the package gives it, and carries the name they give', () => {
    const { unmount } = viewer()
    expect(screen.queryByRole('button', { name: /original|Download/ })).toBeNull()
    unmount()
    const onOpenOriginal = vi.fn()
    viewer({ onOpenOriginal, originalLabel: 'Open with the app' })
    fireEvent.click(screen.getByRole('button', { name: 'Open with the app' }))
    expect(onOpenOriginal).toHaveBeenCalledTimes(1)
  })

  it('closed it draws nothing; the X of the sheet closes', () => {
    const { onOpenChange, unmount } = viewer()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    unmount()
    render(<AttachmentViewer open={false} onOpenChange={() => {}} title="hidden.pdf" status={{ kind: 'ready' }} pages={[A4]} />)
    expect(screen.queryByText('hidden.pdf')).toBeNull()
  })
})
