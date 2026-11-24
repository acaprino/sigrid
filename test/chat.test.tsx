// The parts of a conversation: `Conversation`, `Message`, `PromptInput`, `Suggestions`, `Reasoning`, `ToolCall`. Met
// through the roles and the words: the thread is a log that waits while an answer is written, a message says who it
// is from, the field sends with Enter and never an empty message, its one button sends or stops in the same place,
// a reasoning follows `busy` until the reader chooses, and a tool's call says its state in a word.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { Disclosure, Message, Reasoning, Suggestions, ToolCall, type ToolCallStatus } from '../src/components'
import { CONVERSATION_NEAR_PX, Chat, type ChatMessage, Conversation, PromptInput } from '../src/assemblies'

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

  /** The thread as tall as `height` showing `shown` of it, at `top`: jsdom lays nothing out. */
  const place = (log: HTMLElement, top: number) => {
    Object.defineProperties(log, { scrollHeight: { value: 1000, configurable: true }, clientHeight: { value: 200, configurable: true } })
    log.scrollTop = top
    fireEvent.scroll(log)
  }
  const latest = () => screen.queryByRole('button', { name: 'Go to the latest message' })

  test('the button back to the latest message shows only while the reader is away from the end, and gives the focus to the thread', () => {
    render(
      <Conversation>
        <Message from="assistant">A long answer</Message>
      </Conversation>,
    )
    const log = screen.getByRole('log')
    place(log, 800)
    expect(latest()).toBeNull()
    place(log, 100)
    fireEvent.click(latest()!)
    expect(log.scrollTop).toBe(1000)
    expect(latest()).toBeNull()
    // The button is gone: the focus it had is on the thread, not nowhere.
    expect(document.activeElement).toBe(log)
  })

  test('any move up leaves the end, however small, so a slow scroll is not pulled back; coming back near takes it up again', () => {
    render(
      <Conversation>
        <Message from="assistant">A long answer</Message>
      </Conversation>,
    )
    const log = screen.getByRole('log')
    place(log, 800)
    // Ten pixels up: still within reach of the end, and yet the reader has left it.
    place(log, 790)
    expect(latest()).not.toBeNull()
    // Down again, to within reach of the end (which is at 800).
    expect(800 - 795).toBeLessThanOrEqual(CONVERSATION_NEAR_PX)
    place(log, 795)
    expect(latest()).toBeNull()
  })

  test('a condition that came out false is not a message: the empty thread still shows what the app gives', () => {
    const none: string[] = []
    render(
      <Conversation empty="Ask anything">
        {none.map((text) => (
          <Message key={text} from="user">
            {text}
          </Message>
        ))}
        {null}
        {false}
      </Conversation>,
    )
    expect(screen.getByText('Ask anything')).toBeTruthy()
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

  test('sent with the button, the focus goes back to the text, not to a button that is now off', () => {
    render(<PromptInput defaultValue="Hello" onSubmit={() => {}} />)
    const button = screen.getByRole('button', { name: 'Send' })
    button.focus()
    fireEvent.click(button)
    expect(document.activeElement).toBe(screen.getByRole('textbox'))
  })

  test('Enter that confirms a composition (an IME) does not send', () => {
    const onSubmit = vi.fn()
    render(<PromptInput defaultValue="こん" onSubmit={onSubmit} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', keyCode: 229 })
    expect(onSubmit).not.toHaveBeenCalled()
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

  test('what a tool was given and gave back is code that the keyboard can reach and scroll', () => {
    render(<ToolCall name="Run" input="ls -la" defaultOpen />)
    const block = screen.getByText('ls -la')
    expect(block.getAttribute('tabindex')).toBe('0')
    expect(block.getAttribute('aria-label')).toBe('Input')
    expect(block.className).toMatch(/\bfont-mono\b/)
  })

  test('a reasoning and a call are the row of every disclosure: the same row, the same arrow', () => {
    const { container } = render(
      <>
        <Disclosure label="More">x</Disclosure>
        <Reasoning>y</Reasoning>
        <ToolCall name="Run" input="z" />
      </>,
    )
    const rows = [...container.querySelectorAll('[data-slot="disclosure-row"]')]
    expect(rows).toHaveLength(3)
    expect(new Set(rows.map((row) => row.className)).size).toBe(1)
    expect(new Set(rows.map((row) => row.querySelector('[data-slot="disclosure-chevron"]')!.innerHTML)).size).toBe(1)
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

describe('Chat', () => {
  const TURNS: ChatMessage[] = [
    { id: '1', from: 'user', text: 'Hi' },
    { id: '2', from: 'assistant', text: 'An **older** answer', time: '10:00' },
    { id: '3', from: 'user', text: 'More' },
    { id: '4', from: 'assistant', text: 'The last answer', reasoning: 'Thinking it over', reasoningSeconds: 2, tools: [{ id: 't', name: 'Search', summary: '2 results' }] },
  ]

  test('draws the messages it is given: who each is from, Markdown in an answer, the reasoning and the tools before the text', () => {
    render(<Chat label="Help" messages={TURNS} onSend={() => {}} />)
    const turns = within(screen.getByRole('log', { name: 'Help' })).getAllByRole('article')
    expect(turns.map((turn) => turn.getAttribute('data-from'))).toEqual(['user', 'assistant', 'user', 'assistant'])
    expect(turns[1]!.querySelector('strong')!.textContent).toBe('older')
    expect(within(turns[3]!).getByRole('button', { name: 'Thought for 2 s' })).toBeTruthy()
    expect(within(turns[3]!).getByText('Search')).toBeTruthy()
  })

  test('«try again» is on the last answer only, and names the message; a vote names it too', () => {
    const onRetry = vi.fn()
    const onVote = vi.fn()
    render(<Chat messages={TURNS} onSend={() => {}} onRetry={onRetry} onVote={onVote} />)
    const retry = screen.getAllByRole('button', { name: 'Try again' })
    expect(retry).toHaveLength(1)
    fireEvent.click(retry[0]!)
    expect(onRetry).toHaveBeenCalledWith(TURNS[3])
    fireEvent.click(screen.getAllByRole('button', { name: 'Good answer' })[0]!)
    expect(onVote).toHaveBeenCalledWith(TURNS[1], 'up')
  })

  test('an answer still being written has no actions, and its reasoning is open until the text starts', () => {
    const writing: ChatMessage[] = [...TURNS.slice(0, 3), { id: '4', from: 'assistant', text: '', reasoning: 'Looking' }]
    const { rerender } = render(<Chat messages={writing} busy onSend={() => {}} onRetry={() => {}} onVote={() => {}} />)
    const last = () => screen.getAllByRole('article')[3]!
    expect(within(last()).getByRole('button', { name: 'Thinking' }).getAttribute('aria-expanded')).toBe('true')
    expect(within(last()).queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(within(last()).queryByRole('button', { name: 'Good answer' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy()
    rerender(<Chat messages={[...writing.slice(0, 3), { ...writing[3]!, text: 'Here' }]} busy onSend={() => {}} onRetry={() => {}} onVote={() => {}} />)
    expect(within(last()).getByRole('button', { name: 'Thought' }).getAttribute('aria-expanded')).toBe('false')
  })

  test('an answer that failed is an error note in the thread, with «Try again» when the app can', () => {
    const onRetry = vi.fn()
    const failed: ChatMessage = { id: '5', from: 'assistant', text: '', error: 'The model did not answer' }
    render(<Chat messages={[...TURNS, failed]} onSend={() => {}} onRetry={onRetry} />)
    const note = screen.getByRole('alert')
    expect(note.textContent).toContain('Error: The model did not answer')
    fireEvent.click(within(note).getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledWith(failed)
  })

  test('a suggestion fills the field and gives it the focus; sending tells the app and empties the field', () => {
    const onSend = vi.fn()
    render(<Chat messages={[]} empty="Ask anything" onSend={onSend} suggestions={[{ id: 's', label: 'Plan my day' }]} />)
    expect(screen.getByText('Ask anything')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Plan my day' }))
    const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Message' })
    expect(field.value).toBe('Plan my day')
    expect(document.activeElement).toBe(field)
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('Plan my day')
    expect(field.value).toBe('')
  })
})
