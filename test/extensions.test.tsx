// Extensions to existing components: `Separator label`, `AvatarGroup`, `DateRangeField` two-month view &
// `pastRangePicks`, and `AttachmentsSection` upload progress & retry.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { AvatarGroup, Separator } from '../src/primitives'
import { DateRangeField, pastRangePicks } from '../src/components'
import { AttachmentsSection, stateText, type AttachmentView } from '../src/assemblies'
import { flush } from './helpers'

describe('Separator label', () => {
  test('renders plain hr without label and labelled separator with label', () => {
    const { container, rerender } = render(<Separator />)
    expect(container.querySelector('hr')).toBeTruthy()

    rerender(<Separator label="Today" />)
    expect(container.querySelector('hr')).toBeNull()
    expect(screen.getByRole('separator').textContent).toBe('Today')

    rerender(<Separator label="or" decorative align="start" />)
    expect(screen.queryByRole('separator')).toBeNull()
    expect(container.querySelector('[data-slot="separator"]')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('AvatarGroup', () => {
  test('caps visible avatars at max and shows accessible +N overflow', () => {
    const people = [
      { name: 'Ada Lovelace' },
      { name: 'Grace Hopper' },
      { name: 'Alan Turing' },
      { name: 'Katherine Johnson' },
      { name: 'Barbara Liskov' },
    ]
    const { container } = render(<AvatarGroup items={people} max={3} surface="raised" label="Reviewers" />)
    expect(screen.getByRole('group', { name: 'Reviewers' })).toBeTruthy()
    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(3)
    const overflow = container.querySelector('[data-slot="avatar-overflow"]')!
    expect(overflow.textContent).toBe('+2')
    expect(overflow.getAttribute('aria-label')).toBe('2 more')
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

  test('DateRangeField with months={2} renders two month grids when opened', async () => {
    render(<DateRangeField value={{ start: '2026-11-10', end: '2026-11-20' }} onChange={() => {}} months={2} />)
    fireEvent.click(screen.getByRole('button'))
    await flush()
    const calendar = document.querySelector('[data-slot="calendar"]')!
    expect(calendar.getAttribute('data-months')).toBe('2')
    expect(calendar.querySelectorAll('[data-part="view"]:not([hidden]) table')).toHaveLength(2)
  })
})

describe('AttachmentsSection uploading and failed states', () => {
  test('renders progress bar while uploading and error + retry action when failed', () => {
    const onAction = vi.fn()
    const items: AttachmentView<string>[] = [
      { id: '1', kind: 'file', title: 'report.pdf', detail: '2.4 MB', href: null, state: 'uploading', progress: 45, open: null, remove: 'rm:1' },
      { id: '2', kind: 'file', title: 'video.mp4', detail: '18 MB', href: null, state: 'failed', retry: 'retry:2', open: null, remove: 'rm:2' },
    ]
    render(
      <AttachmentsSection
        attachments={items}
        onAction={onAction}
        onAttach={() => {}}
        maxFileBytes={25 * 1024 * 1024}
        thumbnails={undefined}
        onNeedThumbnail={undefined}
      />,
    )
    expect(stateText('uploading', 1024)).toBe('Uploading')
    expect(stateText('failed', 1024)).toBe('Upload failed')

    const bar = screen.getByRole('progressbar', { name: 'report.pdf' })
    expect(bar.getAttribute('aria-valuenow')).toBe('45')

    expect(screen.getByText('Upload failed')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try uploading video.mp4 again' }))
    expect(onAction).toHaveBeenCalledWith('retry:2')
  })
})
