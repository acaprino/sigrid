// Extensions to existing components: `Separator label`, `AvatarGroup`, `DateRangeField` two-month view &
// `pastRangePicks`, and `AttachmentsSection` upload progress & retry.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { AvatarGroup, Separator } from '../src/primitives'
import { DateRangeField, pastRangePicks } from '../src/components'
import { AttachmentsSection, stateText, type AttachmentView } from '../src/assemblies'
import { flush } from './helpers'

describe('Separator label', () => {
  test('renders plain hr without label, labelled separator with aria-labelledby, and keeps visible label readable when decorative', () => {
    const { container, rerender } = render(<Separator />)
    expect(container.querySelector('hr')).toBeTruthy()

    rerender(<Separator label="Today" />)
    expect(container.querySelector('hr')).toBeNull()
    const sep = screen.getByRole('separator', { name: 'Today' })
    expect(sep.getAttribute('aria-labelledby')).toBeTruthy()

    rerender(<Separator label="or" decorative align="start" />)
    expect(screen.queryByRole('separator')).toBeNull()
    expect(container.querySelector('[data-slot="separator"]')?.getAttribute('aria-hidden')).toBeNull()
    expect(screen.getByText('or')).toBeTruthy()
  })
})

describe('AvatarGroup', () => {
  test('caps visible avatars, exposes sr-only overflow count, handles quiet surface, empty list and invalid max', () => {
    const people = [
      { name: 'Ada Lovelace' },
      { name: 'Grace Hopper' },
      { name: 'Alan Turing' },
      { name: 'Katherine Johnson' },
      { name: 'Barbara Liskov' },
    ]
    const { container, rerender } = render(<AvatarGroup items={people} max={3} surface="quiet" label="Reviewers" />)
    expect(screen.getByRole('group', { name: 'Reviewers' })).toBeTruthy()
    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(3)
    const overflow = container.querySelector('[data-slot="avatar-overflow"]')!
    expect(overflow.getAttribute('aria-label')).toBeNull()
    expect(overflow.className).toContain('bg-raised')
    expect(overflow.querySelector('.sr-only')?.textContent).toBe('2 more')

    rerender(<AvatarGroup items={people} max={Number.NaN} label="Reviewers" />)
    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(4)

    rerender(<AvatarGroup items={[]} label="Empty" />)
    expect(container.firstChild).toBeNull()
  })
})

describe('DateRangeField months and pastRangePicks', () => {
  test('pastRangePicks returns six valid past-facing spans for a fixed date', () => {
    const picks = pastRangePicks(undefined, new Date(2026, 10, 27))
    expect(picks.map((p) => p.label)).toEqual(['Today', 'Last 7 days', 'Last 30 days', 'This month', 'Last month', 'This year'])
    expect(picks[0]).toEqual({ label: 'Today', start: '2026-11-27', end: '2026-11-27' })
    expect(picks[1]).toEqual({ label: 'Last 7 days', start: '2026-11-21', end: '2026-11-27' })
    expect(picks[3]).toEqual({ label: 'This month', start: '2026-11-01', end: '2026-11-27' })
    expect(picks[4]).toEqual({ label: 'Last month', start: '2026-10-01', end: '2026-10-31' })
    expect(picks[5]).toEqual({ label: 'This year', start: '2026-01-01', end: '2026-11-27' })
  })

  test('DateRangeField with months={2} renders two labelled grids without duplicate IDs or double tab stops', async () => {
    render(<DateRangeField value={{ start: '2026-11-10', end: '2026-11-20' }} onChange={() => {}} months={2} />)
    fireEvent.click(screen.getByRole('button'))
    await flush()
    const calendar = document.querySelector('[data-slot="calendar"]')!
    expect(calendar.getAttribute('data-months')).toBe('2')
    const tables = calendar.querySelectorAll('[data-part="view"]:not([hidden]) table')
    expect(tables).toHaveLength(2)
    for (const table of tables) expect(table.getAttribute('aria-labelledby')).toBeTruthy()
    // No duplicate IDs across the two months and exactly one roving tabIndex="0" trigger.
    const triggers = [...calendar.querySelectorAll<HTMLElement>('[data-part="view"]:not([hidden]) [data-part="table-cell-trigger"]')]
    const ids = triggers.map((el) => el.id).filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
    expect(triggers.filter((el) => el.tabIndex === 0)).toHaveLength(1)
  })
})

describe('AttachmentsSection uploading and failed states', () => {
  test('renders progress bar (including null and 100 while uploading), blocks thumbnail open, obeys WCAG 2.5.3 on retry and keeps focus after retry', () => {
    const onAction = vi.fn()
    const items: AttachmentView<string>[] = [
      { id: '1', kind: 'file', title: 'report.pdf', detail: '2.4 MB', href: null, state: 'uploading', progress: 45, thumbnail: true, open: 'open:1', remove: 'rm:1' },
      { id: '2', kind: 'file', title: 'scan.png', detail: '1.1 MB', href: null, state: 'uploading', progress: null, open: null, remove: 'rm:2' },
      { id: '3', kind: 'file', title: 'final.pdf', detail: '3.0 MB', href: null, state: 'uploading', progress: 100, open: null, remove: 'rm:3' },
      { id: '4', kind: 'file', title: 'video.mp4', detail: '18 MB', href: null, state: 'failed', retry: 'retry:4', open: 'open:4', remove: 'rm:4' },
    ]
    const { rerender } = render(
      <AttachmentsSection
        attachments={items}
        onAction={onAction}
        onAttach={() => {}}
        maxFileBytes={25 * 1024 * 1024}
        thumbnails={{ '1': 'blob:thumb-1' }}
        onNeedThumbnail={undefined}
      />,
    )
    expect(stateText('uploading', 1024)).toBe('Uploading')
    expect(stateText('failed', 1024)).toBe('Upload failed')

    const bar45 = screen.getByRole('progressbar', { name: 'report.pdf' })
    expect(bar45.getAttribute('aria-valuenow')).toBe('45')
    // Thumbnail is not clickable while uploading.
    expect(screen.queryByRole('button', { name: 'Open: report.pdf' })).toBeNull()

    const barNull = screen.getByRole('progressbar', { name: 'scan.png' })
    expect(barNull.getAttribute('aria-valuetext')).toBe('Uploading')

    const bar100 = screen.getByRole('progressbar', { name: 'final.pdf' })
    expect(bar100.getAttribute('data-state')).toBe('active')

    expect(screen.getByText('Upload failed')).toBeTruthy()
    // WCAG 2.5.3: accessible name contains visible text "Try again".
    const retryBtn = screen.getByRole('button', { name: 'Try again: video.mp4' })
    fireEvent.click(retryBtn)
    expect(onAction).toHaveBeenCalledWith('retry:4')

    // Transitioning out of failed restores focus inside the row instead of dropping to document.body.
    const next = items.map((item) => (item.id === '4' ? { ...item, state: 'uploading' as const, progress: 0 } : item))
    rerender(
      <AttachmentsSection
        attachments={next}
        onAction={onAction}
        onAttach={() => {}}
        maxFileBytes={25 * 1024 * 1024}
        thumbnails={{ '1': 'blob:thumb-1' }}
        onNeedThumbnail={undefined}
      />,
    )
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove: video.mp4' }))
  })
})
