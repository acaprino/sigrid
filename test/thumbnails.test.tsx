import { describe, expect, test } from 'vitest'
import { safeThumbnail } from '../src/internal/thumbnail'

// Thumbnails of image attachments: only from JPEG/PNG data URLs. (How an app draws them is tested in the app's
// package.)

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHR8eHRoc'
const HOSTILE = [
  'javascript:alert(1)',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'http://example.com/photo.png',
  'https://example.com/photo.png',
  'data:image/svg+xml;base64,PHN2Zy8+',
  'data:image/png,iVBORw0KGgo',
  ' data:image/png;base64,iVBORw0KGgo',
  'data:image/png;base64,iVBORw0KGgo"onerror="alert(1)',
  'DATA:IMAGE/PNG;BASE64,iVBORw0KGgo',
  'data:image/png;base64,',
]

describe('safeThumbnail: only JPEG or PNG base64 data URLs reach src', () => {
  test('accepts data:image/jpeg;base64 and data:image/png;base64', () => {
    expect(safeThumbnail(PNG)).toBe(PNG)
    expect(safeThumbnail(JPEG)).toBe(JPEG)
  })

  test.each(HOSTILE)('refuses %s', (src) => {
    expect(safeThumbnail(src)).toBeNull()
  })

  test('refuses null and undefined', () => {
    expect(safeThumbnail(null)).toBeNull()
    expect(safeThumbnail(undefined)).toBeNull()
  })
})

const row = (over: Partial<TaskRowData> & { id: string }): TaskRowData => ({ title: `Task ${over.id}`, done: false, priority: 4, tags: [], ...over })

function stackProps(over: Partial<StackProps> = {}): StackProps {
  return {
    items: [],
    count: 0,
    draft: '',
    onDraftChange: noop,
    onCapture: noop,
    onDrop: noop,
    onPick: noop,
    onNow: noop,
    onDelete: noop,
    autoFocus: false,
    ...over,
  }
}

const listItemOf = (title: string) => screen.getAllByRole('listitem').find((li) => within(li).queryByText(title))!
