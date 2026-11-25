// A whole chat with an assistant, ready to wire to a model: the thread, what the assistant did on the way to each
// answer, the ready-made requests and the field, put together the one way they go together. The app holds the
// messages as data and talks to its model; the chat draws them and tells the app what the user did: sent a message,
// stopped the answer, asked for it again, said it was good or not.
// It is the parts of a conversation and nothing more (`Conversation`, `Message`, `Reasoning`, `ToolCall`,
// `Suggestions`, `PromptInput`): an app whose chat needs another arrangement composes those itself.
// What it decides, so every app's chat behaves alike: an answer still being written (`busy`, the last message) shows
// no actions yet, and its reasoning is open until the text starts; «try again» is offered on the last answer only; a
// failed answer is a `Note` with `tone="error"` in the thread, with «Try again»; a suggestion fills the field and
// gives it the focus, for the user to send or change; the field keeps its text while an answer is written.
import * as React from 'react'
import { cn, isEmptyNode } from '../lib/utils'
import { useWords } from '../words'
import { MarkdownBlocks } from '../components/markdown-blocks'
import { Button } from '../primitives/button'
import { Message, type MessageVote } from '../components/message'
import { Note } from '../components/note'
import { Reasoning, ToolCall, type ToolCallStatus } from '../components/reasoning'
import { Suggestions, type Suggestion } from '../components/suggestions'
import { Conversation } from './conversation'
import { PromptInput } from './prompt-input'

/** A tool an assistant used on the way to an answer. */
export type ChatTool = {
  id: string
  /** The tool's name, as the app calls it. */
  name: string
  /** Where the call is. `success` by default. */
  status?: ToolCallStatus | undefined
  /** A few words on what it did. */
  summary?: string | undefined
  /** What it was given and what it gave back, shown as written. */
  input?: string | undefined
  output?: string | undefined
}

/** One turn of a chat, as data. */
export type ChatMessage = {
  id: string
  from: 'user' | 'assistant'
  /** The text: Markdown in an answer, as written in a user's message. Empty while an answer has not started. */
  text: string
  /** When it was sent, already written out («10:42»). */
  time?: string | undefined
  /** What the assistant thought before answering, as Markdown, and how many seconds it took. */
  reasoning?: string | undefined
  reasoningSeconds?: number | undefined
  /** The tools it used, in order. */
  tools?: readonly ChatTool[] | undefined
  /** The answer failed: what happened, in a few words. Shown as an error note, with «Try again» when the app can. */
  error?: string | undefined
  /** What the reader said of the answer. */
  vote?: MessageVote | null | undefined
}

export type ChatProps = {
  /** The turns, oldest first. */
  messages: readonly ChatMessage[]
  /** The user sent a message: the app adds it to `messages` and asks its model. */
  onSend: (text: string) => void
  /** An answer is being written: the last message is the one growing, and the field's button stops it. */
  busy?: boolean | undefined
  /** Stop the answer being written. */
  onStop?: (() => void) | undefined
  /** Ask again for an answer (the last one, or one that failed). Absent: no button. */
  onRetry?: ((message: ChatMessage) => void) | undefined
  /** The reader says an answer was good or not; `null` takes it back. Absent: no buttons. */
  onVote?: ((message: ChatMessage, vote: MessageVote | null) => void) | undefined
  /** Ready-made requests above the field: choosing one fills the field. The app passes them while they help (an empty thread, a follow-up). */
  suggestions?: readonly Suggestion[] | undefined
  /** What the thread shows while it has no message: a greeting, an `Empty`. */
  empty?: React.ReactNode
  /** The name of the chat for screen readers. Absent: the toolkit's word. */
  label?: string | undefined
  /** The assistant's name, read before its answers. Absent: the toolkit's word. */
  assistantName?: string | undefined
  /** What the field shows while empty. */
  placeholder?: string | undefined
  /** The most characters a message may have. */
  maxLength?: number | undefined
  /** The text of the field, when the app keeps it (a draft kept between visits). */
  draft?: string | undefined
  onDraftChange?: ((text: string) => void) | undefined
  /** The app's tools in the field's row (attach a file, choose a model). */
  tools?: React.ReactNode
  /** Its buttons answer the press and its hints enter with a movement. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  className?: string | undefined
}

/** A whole chat with an assistant: the thread, the ready-made requests and the field. */
function Chat({ messages, onSend, busy = false, onStop, onRetry, onVote, suggestions, empty, label, assistantName, placeholder, maxLength, draft, onDraftChange, tools, animated, className }: ChatProps) {
  const words = useWords().chat
  const field = React.useRef<HTMLTextAreaElement>(null)
  const [own, setOwn] = React.useState('')
  const text = draft ?? own
  const setText = (next: string) => {
    if (draft === undefined) setOwn(next)
    onDraftChange?.(next)
  }
  const last = messages[messages.length - 1]
  return (
    <div data-slot="chat" className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-3', className)}>
      <Conversation label={label} busy={busy} empty={empty} animated={animated}>
        {messages.map((message) => {
          if (message.from === 'user') {
            return (
              <Message key={message.id} from="user" time={message.time} animated={animated}>
                {message.text}
              </Message>
            )
          }
          const writing = busy && message === last
          const failed = message.error !== undefined
          const done = !writing && !failed
          return (
            <Message
              key={message.id}
              from="assistant"
              name={assistantName}
              time={done ? message.time : undefined}
              copyText={done && message.text !== '' ? message.text : undefined}
              onRetry={done && message === last && onRetry ? () => onRetry(message) : undefined}
              vote={message.vote}
              animated={animated}
              onVote={done && onVote ? (vote) => onVote(message, vote) : undefined}
            >
              {message.reasoning === undefined ? null : (
                <Reasoning busy={writing && message.text === ''} seconds={message.reasoningSeconds} animated={animated}>
                  {message.reasoning}
                </Reasoning>
              )}
              {(message.tools ?? []).map((tool) => (
                <ToolCall key={tool.id} name={tool.name} status={tool.status} summary={tool.summary} input={tool.input} output={tool.output} animated={animated} />
              ))}
              {message.text === '' ? null : <MarkdownBlocks text={message.text} />}
              {failed ? (
                <Note
                  tone="error"
                  title={message.error}
                  actions={
                    onRetry ? (
                      <Button variant="outline" onClick={() => onRetry(message)}>
                        {words.retry}
                      </Button>
                    ) : undefined
                  }
                />
              ) : null}
            </Message>
          )
        })}
      </Conversation>
      {suggestions && suggestions.length > 0 ? (
        <Suggestions
          items={suggestions}
          animated={animated}
          onSelect={(item) => {
            setText(item.label)
            field.current?.focus()
          }}
        />
      ) : null}
      <PromptInput ref={field} value={text} onValueChange={setText} onSubmit={onSend} busy={busy} onStop={onStop} placeholder={placeholder} maxLength={maxLength} tools={isEmptyNode(tools) ? undefined : tools} animated={animated} />
    </div>
  )
}

export { Chat }
