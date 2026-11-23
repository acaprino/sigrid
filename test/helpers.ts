// The small functions the tests share: the repository's folder and its files, the classes of an element, the waits
// for React and the overlays, a stand-in for the system's motion setting, a fake DataTransfer.
import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * The repository's folder, with its trailing slash (`${root}src/…` and `join(root, 'src')` both work). From the path of
 * this file, not `new URL('../', import.meta.url)`: under jsdom `URL` is jsdom's, which `fileURLToPath` refuses.
 */
export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '/')

/** Every file under `dir`, in its subfolders too. */
export function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

/** A handler that does nothing. */
export const noop = () => {}

/** The classes of an element, one by one (none for no element). */
export const classes = (el: Element | null | undefined) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

/**
 * Lets React finish what is pending: the microtasks, and with `ms` also a timer of that many milliseconds (what an
 * overlay, a debounce or a lazy import needs to arrive). Each test file keeps the wait it was written with.
 */
export const settle = (ms?: number) =>
  act(async () => {
    if (ms !== undefined) await new Promise((done) => setTimeout(done, ms))
  })

/** `settle(30)`: the wait for a menu, a palette or a command to arrive. */
export const flush = () => settle(30)

/** `prefers-reduced-motion: reduce` on or off (jsdom has no matchMedia). Undone by `vi.unstubAllGlobals()`. */
export const systemMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') ? reduce : false, media: q, addEventListener() {}, removeEventListener() {} }))

/** The sRGB transfer of one channel (0 to 1) to linear light, as WCAG 2.x computes it. */
export const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

/** A fake DataTransfer: jsdom does not implement it. */
export const dt = (types: Record<string, string>, files: File[] = []) => ({
  types: Object.keys(types).concat(files.length ? ['Files'] : []),
  getData: (t: string) => types[t] ?? '',
  files: files as unknown as FileList,
})
