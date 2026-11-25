// What a library that cannot read `var()` takes from the page (src/internal/look.ts): a token as a hex colour, a font stack
// or a length; the moment the look changes; a stylesheet put in the page once. Used by the terminal and the code view.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ensureStyle, isDarkColor, readColor, readLength, readText, toHexColor, watchLook } from '../src/internal/look'

afterEach(() => {
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('data-scheme')
  document.head.querySelectorAll('style[id^="test-"]').forEach((style) => style.remove())
})

describe('toHexColor: any way a browser writes a colour, as hex', () => {
  test.each([
    ['#abc', '#aabbcc'],
    ['#AABBCC', '#aabbcc'],
    ['  #123456 ', '#123456'],
    ['#112233ff', '#112233'],
    ['#11223380', '#11223380'],
    ['#abcf', '#aabbcc'],
    ['#abc8', '#aabbcc88'],
    ['rgb(17, 34, 51)', '#112233'],
    ['rgb(17 34 51)', '#112233'],
    ['rgb(17 34 51 / 0.5)', '#11223380'],
    ['rgba(17, 34, 51, 0.5)', '#11223380'],
    ['rgb(100% 0% 0%)', '#ff0000'],
    ['rgb(17 34 51 / 50%)', '#11223380'],
    ['rgba(17, 34, 51, 1)', '#112233'],
  ])('%s is %s', (written, hex) => {
    expect(toHexColor(written)).toBe(hex)
  })

  test.each(['', 'red', 'var(--x)', 'color-mix(in srgb, red, blue)', '#12', '#12345'])('%j is not a colour it reads', (written) => {
    expect(toHexColor(written)).toBeNull()
  })
})

describe('readColor, readText and readLength read the token where the element is', () => {
  test('a colour token is its value as hex, and a token that is not set is the fallback', () => {
    document.documentElement.style.setProperty('--color-ink', '#336699')
    expect(readColor(document.documentElement, '--color-ink', '#000000')).toBe('#336699')
    expect(readColor(document.documentElement, '--color-nothing', '#abcdef')).toBe('#abcdef')
    document.documentElement.style.setProperty('--color-odd', 'not a colour')
    expect(readColor(document.documentElement, '--color-odd', '#abcdef')).toBe('#abcdef')
  })

  test('a token on a closer element wins over the root\'s (a part inside a themed region)', () => {
    document.documentElement.style.setProperty('--color-ink', '#336699')
    const region = document.body.appendChild(document.createElement('div'))
    region.style.setProperty('--color-ink', '#990033')
    expect(readColor(region, '--color-ink', '#000000')).toBe('#990033')
    region.remove()
  })

  test('a text token is trimmed, and absent it is the fallback', () => {
    document.documentElement.style.setProperty('--font-mono', '  "Fira Code", monospace ')
    expect(readText(document.documentElement, '--font-mono', 'monospace')).toBe('"Fira Code", monospace')
    expect(readText(document.documentElement, '--font-none', 'monospace')).toBe('monospace')
  })

  test('a length is in pixels: px as it is, rem by the size of the root, anything else the fallback', () => {
    document.documentElement.style.setProperty('--a', '13px')
    document.documentElement.style.setProperty('--b', '0.8125rem')
    document.documentElement.style.setProperty('--c', 'calc(1px + 2px)')
    expect(readLength(document.documentElement, '--a', 1)).toBe(13)
    // jsdom's root has no font size of its own: 16px, as a browser's.
    expect(readLength(document.documentElement, '--b', 1)).toBe(13)
    expect(readLength(document.documentElement, '--c', 7)).toBe(7)
    expect(readLength(document.documentElement, '--d', 9)).toBe(9)
  })
})

describe('isDarkColor: a ground a white label reads better on', () => {
  test.each([
    ['#101010', true],
    ['#1e1e1e', true],
    ['#fafcfc', false],
    ['#eeeeee', false],
    ['#101010cc', true],
  ])('%s', (ground, dark) => {
    expect(isDarkColor(ground)).toBe(dark)
  })
})

describe('watchLook: the look of the page changed', () => {
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  test('a theme written on the root is one call, however many variables it carries', async () => {
    const changed = vi.fn()
    const stop = watchLook(document, changed)
    for (let i = 0; i < 30; i++) document.documentElement.style.setProperty(`--color-x${i}`, '#000000')
    document.documentElement.setAttribute('data-scheme', 'dark')
    await wait(60)
    expect(changed).toHaveBeenCalledTimes(1)
    stop()
  })

  test('it stops when it is told to', async () => {
    const changed = vi.fn()
    watchLook(document, changed)()
    document.documentElement.setAttribute('data-scheme', 'dark')
    await wait(60)
    expect(changed).not.toHaveBeenCalled()
  })

  test('the system\'s scheme changing is one too (the first paint follows it)', async () => {
    let listener: (() => void) | null = null
    const media = { matches: false, addEventListener: (_: string, fn: () => void) => { listener = fn }, removeEventListener: () => { listener = null } }
    const original = window.matchMedia
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => media })
    const changed = vi.fn()
    const stop = watchLook(document, changed)
    expect(listener).not.toBeNull()
    listener!()
    await wait(60)
    expect(changed).toHaveBeenCalledTimes(1)
    stop()
    expect(listener).toBeNull()
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: original })
  })
})

describe('ensureStyle', () => {
  test('puts a stylesheet in the head once, by its id', () => {
    ensureStyle(document, 'test-sheet', '.a { color: inherit }')
    ensureStyle(document, 'test-sheet', '.b { color: inherit }')
    const sheets = document.head.querySelectorAll('#test-sheet')
    expect(sheets).toHaveLength(1)
    expect(sheets[0]!.textContent).toBe('.a { color: inherit }')
  })
})
