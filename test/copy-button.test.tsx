// CopyButton: the text goes on the clipboard, the button says so in place for two seconds, and nothing changes size.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { COPIED_MS, CopyButton, InputGroup, WordsProvider, DEFAULT_WORDS } from '../src'

const writeText = vi.fn<(text: string) => Promise<void>>()
const press = async (button: HTMLElement) => {
  fireEvent.click(button)
  await act(async () => {})
}
const icon = (button: HTMLElement) => button.querySelector('[data-icon]')!.getAttribute('data-icon')
const status = () => document.querySelector('[data-slot="copy-button-status"]')!

beforeEach(() => {
  vi.useFakeTimers()
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})
afterEach(() => vi.useRealTimers())

describe('CopyButton', () => {
  test('alone: a quiet icon button named by its label; a press copies, shows a check and says «Copied», then goes back', async () => {
    const onCopied = vi.fn()
    render(<CopyButton value="ABC-1" label="Copy the code" onCopied={onCopied} />)
    const button = screen.getByRole('button', { name: 'Copy the code' })
    expect(button.getAttribute('data-variant')).toBe('ghost')
    expect(button.getAttribute('data-size')).toBe('icon-sm')
    expect(icon(button)).toBe('copy')
    expect(status().textContent).toBe('')

    await press(button)
    expect(writeText).toHaveBeenCalledWith('ABC-1')
    expect(onCopied).toHaveBeenCalledWith('ABC-1')
    expect(icon(button)).toBe('check')
    expect(button.getAttribute('data-state')).toBe('copied')
    // The name stays: the news is the status beside the button.
    expect(button.getAttribute('aria-label')).toBe('Copy the code')
    expect(status().getAttribute('role')).toBe('status')
    expect(status().textContent).toBe('Copied')

    act(() => vi.advanceTimersByTime(COPIED_MS - 1))
    expect(icon(button)).toBe('check')
    act(() => vi.advanceTimersByTime(1))
    expect(icon(button)).toBe('copy')
    expect(status().textContent).toBe('')
  })

  test('with its word: both texts share one cell, so the width is the wider of the two before and after', async () => {
    render(<CopyButton value="x" showLabel />)
    const button = screen.getByRole('button', { name: 'Copy' })
    expect(button.getAttribute('data-size')).toBe('sm')
    const [word, done] = [...button.querySelector('[data-slot="copy-button-label"]')!.children] as HTMLElement[]
    expect([word!.textContent, done!.textContent]).toEqual(['Copy', 'Copied'])
    expect(done!.className).toContain('invisible')
    expect(word!.className).not.toContain('invisible')
    await press(button)
    expect(word!.className).toContain('invisible')
    expect(done!.className).not.toContain('invisible')
  })

  test('a second press while it says «Copied» copies again and starts the two seconds again', async () => {
    render(<CopyButton value="x" />)
    const button = screen.getByRole('button', { name: 'Copy' })
    await press(button)
    act(() => vi.advanceTimersByTime(COPIED_MS - 100))
    await press(button)
    expect(writeText).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(COPIED_MS - 100))
    expect(icon(button)).toBe('check')
    act(() => vi.advanceTimersByTime(100))
    expect(icon(button)).toBe('copy')
  })

  test('the system refuses: no check, the status says so, the caller hears the error', async () => {
    const refused = new Error('no')
    writeText.mockRejectedValue(refused)
    const onCopyError = vi.fn()
    const onCopied = vi.fn()
    render(<CopyButton value="x" onCopied={onCopied} onCopyError={onCopyError} />)
    const button = screen.getByRole('button', { name: 'Copy' })
    await press(button)
    expect(icon(button)).toBe('copy')
    expect(status().textContent).toBe('Could not copy')
    expect(onCopyError).toHaveBeenCalledWith(refused)
    expect(onCopied).not.toHaveBeenCalled()
  })

  test('in an InputGroup it takes the size of the group\'s buttons and is off with the field', () => {
    const { rerender } = render(<InputGroup aria-label="Key" end={<CopyButton value="x" />} />)
    const button = () => screen.getByRole('button', { name: 'Copy' }) as HTMLButtonElement
    expect(button().getAttribute('data-size')).toBe('icon-xs')
    expect(button().disabled).toBe(false)
    rerender(<InputGroup aria-label="Key" disabled end={<CopyButton value="x" />} />)
    expect(button().disabled).toBe(true)
  })

  test('the words are the app\'s', async () => {
    render(
      <WordsProvider words={{ ...DEFAULT_WORDS, copy: { copy: 'Copia', copied: 'Copiato', failed: 'Copia non riuscita' } }}>
        <CopyButton value="x" />
      </WordsProvider>,
    )
    await press(screen.getByRole('button', { name: 'Copia' }))
    expect(status().textContent).toBe('Copiato')
  })
})
