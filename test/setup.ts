import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// jsdom has no ResizeObserver: Ark's positioned parts (the calendar of a date field) watch their anchor with one.
// A placeholder that measures nothing: the tests do not check layout. A test that needs one stubs its own.
class FakeResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
// jsdom has no `CSS.escape`: Ark's combobox uses it to find the row reached with the arrows.
if (typeof (globalThis as { CSS?: { escape?: unknown } }).CSS?.escape !== 'function') {
  const escape = (value: string) => value.replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, (ch) => `\\${ch}`)
  Object.defineProperty(globalThis, 'CSS', { value: { ...(globalThis as { CSS?: object }).CSS, escape }, configurable: true, writable: true })
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.defineProperty(globalThis, 'ResizeObserver', { value: FakeResizeObserver, configurable: true, writable: true })
}
