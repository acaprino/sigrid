// A message of mail being written, with a text that has a little form: who it goes to, its subject, its text, and
// the button that sends it. It is on the `./rich-text` entry, with the field its text is written in (TipTap).
// The rows are a form read from the top: «To», then «Cc» and «Bcc», which stay behind a button of the «To» row until
// they are asked for or hold an address (most messages have neither), the subject, and the text (`RichTextField`:
// bold, italic, underline, two lists, a quote; its value is HTML). An address is a chip (`ChipsInput`): a comma, a
// semicolon, a blank or Enter closes one, and one that is not an address is said so on its chip, never refused.
// The app holds the draft (`value`, `onChange`) and sends it: the composer knows no server. «Send» is the one solid
// button (R3); Ctrl+Enter (⌘ Enter) does the same. A message that cannot go (nobody to send it to, an address that is
// not one) is not sent: the reason is said in words above the buttons and the focus goes to «To». While it is being
// sent the button waits in its place. «Discard» is there only when the app can throw the draft away, and does it at
// once: the app offers Undo in a notice (`Toasts`).
import * as React from 'react'
import { cn, isEmptyNode } from '../lib/utils'
import { useWords } from '../words'
import { Icon } from '../icons'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'
import { ChipsInput } from '../components/ChipsInput'
import { RichTextField } from './RichTextField'

/** A message being written: its addresses, its subject and its text as HTML. */
export type EmailDraft = {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  /** The text, as the HTML `RichTextField` writes. */
  html: string
}

/** A draft with nothing in it, to start from. */
export const EMPTY_EMAIL: EmailDraft = { to: [], cc: [], bcc: [], subject: '', html: '' }

/** True for a text shaped as an address (`name@domain.tld`); whether the address exists is the server's to say. */
export function isEmailAddress(value: string): boolean {
  return /^[^\s@<>(),;]+@[^\s@<>(),;]+\.[^\s@<>(),;.]+$/.test(value.trim())
}

/** Why a draft cannot be sent: it has nobody to go to, or one of its addresses is not one. `null` when it can. */
export function emailProblem(draft: EmailDraft): 'noRecipient' | 'badAddress' | null {
  const all = [...draft.to, ...draft.cc, ...draft.bcc]
  if (all.length === 0) return 'noRecipient'
  return all.every(isEmailAddress) ? null : 'badAddress'
}

export type EmailComposerProps = {
  /** The draft, which the app holds. */
  value: EmailDraft
  onChange: (draft: EmailDraft) => void
  /** Send it: called only with a draft that can go (somebody to send it to, every address shaped as one). */
  onSend: (draft: EmailDraft) => void
  /** Throw the draft away. Absent: no button. */
  onDiscard?: (() => void) | undefined
  /** It is being sent: the button waits, in its place. */
  sending?: boolean | undefined
  /** The name of the form for screen readers. Absent: the toolkit's words («New message»). */
  label?: string | undefined
  /** A row above «To»: who it is from, when the user has more than one address (the app's `Select`). */
  from?: React.ReactNode
  /** Addresses to offer while one is written (an address book). */
  contacts?: readonly string[] | undefined
  /** The text being typed in an address row, for an app that looks its contacts up as the user writes. */
  onQuery?: ((text: string) => void) | undefined
  /** What a chip shows in place of the address (the person's name). */
  display?: ((address: string) => string) | undefined
  /** Under the text: the files that go with it (`AttachmentsSection`). */
  attachments?: React.ReactNode
  /** At the start of the row of buttons: the app's own quiet tools (attach a file). */
  tools?: React.ReactNode
  className?: string | undefined
}

const SEPARATORS = [',', ';', ' '] as const
const ROW = 'flex min-w-0 items-start gap-2'
const NAME = 'flex min-h-(--control-md) w-16 shrink-0 items-center text-sm text-ink-mute pointer-coarse:min-h-11'

/** A message of mail being written: to whom, the subject, a text with a little form, and the button that sends it. */
function EmailComposer({ value, onChange, onSend, onDiscard, sending = false, label, from, contacts, onQuery, display, attachments, tools, className }: EmailComposerProps) {
  const words = useWords().mail
  const id = React.useId()
  const form = React.useRef<HTMLFormElement>(null)
  // «Cc» and «Bcc» once asked for; they also show whenever they hold an address.
  const [asked, setAsked] = React.useState(false)
  const held = value.cc.length > 0 || value.bcc.length > 0
  const copies = asked || held
  // The reason the last try to send did not go, until the draft changes.
  const [problem, setProblem] = React.useState<'noRecipient' | 'badAddress' | null>(null)
  const set = (part: Partial<EmailDraft>) => {
    setProblem(null)
    onChange({ ...value, ...part })
  }
  const send = () => {
    if (sending) return
    const found = emailProblem(value)
    setProblem(found)
    if (found) form.current?.ownerDocument.getElementById(`${id}-to`)?.focus()
    else onSend(value)
  }
  const addresses = (field: 'to' | 'cc' | 'bcc', name: string, end?: React.ReactNode) => (
    <div data-slot="email-composer-row" className={ROW}>
      <label htmlFor={`${id}-${field}`} className={NAME}>
        {name}
      </label>
      <div className="min-w-0 flex-1">
        <ChipsInput
          id={`${id}-${field}`}
          value={value[field]}
          onChange={(next) => set({ [field]: next })}
          suggestions={contacts}
          onQuery={onQuery}
          display={display}
          invalid={(address) => !isEmailAddress(address)}
          separators={SEPARATORS}
          dot={false}
        />
      </div>
      {end}
    </div>
  )
  return (
    <form
      ref={form}
      data-slot="email-composer"
      aria-label={label ?? words.compose}
      noValidate
      className={cn('flex min-h-0 min-w-0 flex-col gap-2', className)}
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || event.nativeEvent.isComposing) return
        event.preventDefault()
        send()
      }}
    >
      {isEmptyNode(from) ? null : (
        <div data-slot="email-composer-row" className={ROW}>
          <span className={NAME}>{words.from}</span>
          <div className="min-w-0 flex-1">{from}</div>
        </div>
      )}
      {addresses(
        'to',
        words.to,
        <Button type="button" variant="ghost" aria-expanded={copies} disabled={held} onClick={() => setAsked((now) => !now)}>
          {words.copies}
        </Button>,
      )}
      {copies ? addresses('cc', words.cc) : null}
      {copies ? addresses('bcc', words.bcc) : null}
      <div data-slot="email-composer-row" className={ROW}>
        <label htmlFor={`${id}-subject`} className={NAME}>
          {words.subject}
        </label>
        <Input id={`${id}-subject`} className="min-w-0 flex-1" value={value.subject} onChange={(event) => set({ subject: event.target.value })} />
      </div>
      <RichTextField aria-label={words.body} value={value.html} onChange={(html) => set({ html })} className="min-h-0 flex-1" />
      {isEmptyNode(attachments) ? null : <div data-slot="email-composer-attachments">{attachments}</div>}
      {problem ? (
        <p role="alert" data-slot="email-composer-problem" className="flex items-center gap-2 text-sm text-destructive">
          <Icon name="error" />
          {words[problem]}
        </p>
      ) : null}
      <div data-slot="email-composer-actions" className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">{tools}</div>
        {onDiscard ? (
          <Button type="button" variant="ghost" onClick={onDiscard}>
            {words.discard}
          </Button>
        ) : null}
        <Button type="submit" loading={sending} loadingText={words.sending}>
          <Icon name="send" />
          {words.send}
        </Button>
      </div>
    </form>
  )
}

export { EmailComposer }
