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
if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.defineProperty(globalThis, 'ResizeObserver', { value: FakeResizeObserver, configurable: true, writable: true })
}
