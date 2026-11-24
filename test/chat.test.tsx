// The parts of a conversation: `Conversation`, `Message`, `PromptInput`, `Suggestions`, `Reasoning`, `ToolCall`. Met
// through the roles and the words: the thread is a log that waits while an answer is written, a message says who it
// is from, the field sends with Enter and never an empty message, its one button sends or stops in the same place,
// a reasoning follows `busy` until the reader chooses, and a tool's call says its state in a word.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Conversation, Message, PromptInput, Reasoning, Suggestions, ToolCall, WordsProvider, type ToolCallStatus } from '../src'

describe('Conversation', () => {
  test('a named log that waits while an answer is written', () => {
    const { rerender } = render(
      <Conversation label="Chat" busy>
        <Message from="user">Hello</Message>
      </Conversation>,
    )
    const log = screen.getByRole('log', { name: 'Chat' })
    expect(log.getAttribute('aria-busy')).toBe('true')
    rerender(
      <Conversation label="Chat">
        <Message from="user">Hello</Message>
      </Conversation>,
    )
    expect(log.hasAttribute('aria-busy')).toBe(false)
  })

  test('with no message it shows what the app gives for an empty thread', () => {
    render(<Conversation empty="Ask anything" />)
    expect(within(screen.getByRole('log', { name: 'Conversation' })).getByText('Ask anything')).toBeTruthy()
  })

  test('the button back to the latest message shows only while the reader is away from the end', () => {
    render(
      <Conversation>
        <Message from="assistant">A long answer</Message>
      </Conversation>,
    )
    const log = screen.getByRole('log')
    expect(screen.queryByRole('button', { name: 'Go to the latest message' })).toBeNull()
    Object.defineProperties(log, { scrollHeight: { value: 1000, configurable: true }, clientHeight: { value: 200, configurable: true } })
    log.scrollTop = 100
    fireEvent.scroll(log)
    fireEvent.click(screen.getByRole('button', { name: 'Go to the latest message' }))
    expect(log.scrollTop).toBe(1000)
    expect(screen.queryByRole('button', { name: 'Go to the latest message' })).toBeNull()
  })
})

describe('Message', () => {
  test('says who it is from before its text; an answer reads Markdown, a user message stays as written', () => {
    render(
      <>
        <Message from="user">{'**not bold**'}</Message>
        <Message from="assistant" name="Support">
          {'**bold**'}
        </Message>
      </>,
    )
    const [mine, answer] = screen.getAllByRole('article')
    expect(mine!.textContent).toBe('You: **not bold**')
    expect(answer!.textContent).toBe('Support: bold')
    expect(answer!.querySelector('strong')).not.toBeNull()
  })

  test('only the actions asked for are there; a vote is pressed, and the same button takes it back', () => {
    const onVote = vi.fn()
    const onRetry = vi.fn()
    const { rerender } = render(<Message from="assistant">Plain</Message>)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(
      <Message from="assistant" copyText="Plain" onRetry={onRetry} vote="up" onVote={onVote}>
        Plain
      </Message>,
    )
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    const good = screen.getByRole('button', { name: 'Good answer' })
    expect(good.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(good)
    fireEvent.click(screen.getByRole('button', { name: 'Bad answer' }))
    expect(onVote.mock.calls).toEqual([[null], ['down']])
  })

  test("a user's message has no vote", () => {
    render(
      <Message from="user" onVote={() => {}}>
        Hi
      </Message>,
    )
    expect(screen.queryByRole('button', { name: 'Good answer' })).toBeNull()
  })
})

describe('PromptInput', () => {
  test('Enter sends the text without the blanks around it and empties the field; Shift+Enter does not send', () => {
    const onSubmit = vi.fn()
    render(<PromptInput onSubmit={onSubmit} />)
    const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Message' })
    fireEvent.change(field, { target: { value: '  Hello  ' } })
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onSubmit.mock.calls).toEqual([['Hello']])
    expect(field.value).toBe('')
  })

  test('an empty message is never sent, and the button is off', () => {
    const onSubmit = vi.fn()
    render(<PromptInput onSubmit={onSubmit} />)
    const field = screen.getByRole('textbox')
    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Send' }).disabled).toBe(true)
  })

  test('while an answer is written the same button stops it, and Enter keeps the text', () => {
    const onSubmit = vi.fn()
    const onStop = vi.fn()
    const { rerender } = render(<PromptInput value="Next" onSubmit={onSubmit} />)
    const button = screen.getByRole('button', { name: 'Send' })
    rerender(<PromptInput value="Next" onSubmit={onSubmit} busy onStop={onStop} />)
    expect(screen.getByRole('button', { name: 'Stop' })).toBe(button)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    fireEvent.click(button)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  test('a controlled field asks for an empty text after sending; the count shows with a limit', () => {
    const onValueChange = vi.fn()
    const { container } = render(<PromptInput value="Hi" onValueChange={onValueChange} onSubmit={() => {}} maxLength={100} />)
    expect(container.querySelector('[data-slot="prompt-input-count"]')!.textContent).toBe('2/100')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onValueChange).toHaveBeenLastCalledWith('')
  })
})

describe('Suggestions', () => {
  test('a named group of buttons that tells the app which was chosen; none for an empty list', () => {
    const onSelect = vi.fn()
    const items = [{ id: 'a', label: 'Summarise' }, { id: 'b', label: 'Plan' }]
    const { rerender, container } = render(<Suggestions items={items} onSelect={onSelect} />)
    fireEvent.click(within(screen.getByRole('group', { name: 'Suggestions' })).getByRole('button', { name: 'Plan' }))
    expect(onSelect).toHaveBeenCalledWith(items[1])
    rerender(<Suggestions items={[]} onSelect={onSelect} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('Reasoning', () => {
  test('open while it is written and closed once done, with the time it took', () => {
    const { rerender } = render(<Reasoning busy>Step one</Reasoning>)
    expect(screen.getByRole('button', { name: 'Thinking' }).getAttribute('aria-expanded')).toBe('true')
    rerender(<Reasoning seconds={4}>Step one</Reasoning>)
    expect(screen.getByRole('button', { name: 'Thought for 4 s' }).getAttribute('aria-expanded')).toBe('false')
  })

  test("the reader's choice stays when it ends", () => {
    const { rerender } = render(<Reasoning>Step one</Reasoning>)
    fireEvent.click(screen.getByRole('button', { name: 'Thought' }))
    rerender(<Reasoning busy>Step one</Reasoning>)
    rerender(<Reasoning>Step one</Reasoning>)
    expect(screen.getByRole('button', { name: 'Thought' }).getAttribute('aria-expanded')).toBe('true')
  })
})

describe('ToolCall', () => {
  const WORD: Record<ToolCallStatus, string> = { pending: 'waiting', running: 'running', success: 'done', error: 'failed' }

  test.each(Object.keys(WORD) as ToolCallStatus[])('%s: the state is said in a word after the name', (status) => {
    const { container } = render(<ToolCall name="Search" status={status} />)
    expect(container.textContent).toBe(`Search, ${WORD[status]}`)
    // Nothing to show: no button to open.
    expect(screen.queryByRole('button')).toBeNull()
  })

  test('with something to show it is a row that opens on what it was given and what it gave back', () => {
    render(<ToolCall name="Search" summary="2 results" input='{"q":"x"}' output="two" />)
    const row = screen.getByRole('button', { name: /Search, done/ })
    expect(row.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Input')).toBeTruthy()
    expect(screen.getByText('{"q":"x"}').tagName).toBe('PRE')
    expect(screen.getByText('Output')).toBeTruthy()
  })

  test("the words are the app's", () => {
    render(
      <WordsProvider words={{ chat: { toolRunning: 'in corso', send: 'Invia' } }}>
        <ToolCall name="Cerca" status="running" />
        <PromptInput defaultValue="Ciao" onSubmit={() => {}} />
      </WordsProvider>,
    )
    expect(screen.getByText(', in corso')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Invia' })).toBeTruthy()
  })
})
