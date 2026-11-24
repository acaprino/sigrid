// A message of mail being written, with a text that has a little form: who it goes to, its subject, its text, and
// the button that sends it. It is on the `./rich-text` entry, with the field its text is written in (TipTap).
// The rows are a form read from the top: «To», then «Cc» and «Bcc», which stay behind a button of the «To» row until
// they are asked for or hold an address (most messages have neither), the subject, and the text (`RichTextField`:
// bold, italic, underline, two lists, a quote; its value is HTML). An address is a chip (`ChipsInput`): a comma, a
// semicolon, a blank or Enter closes one, and one that is not an address is said so on its chip, never refused.
// The app holds the draft (`value`, `onChange`) and sends it: the composer knows no server. «Send» is the one solid
// button (R3); Ctrl+Enter (⌘ Enter) does the same from anywhere in the form, after an address still being typed is
// closed into its chip. Enter alone never sends: in the subject it does nothing, in the text it makes a new line.
// A message that cannot go (nobody to send it to, an address that is not one) is not sent: the reason is said in
// words above the buttons and the focus goes to the row that is wrong.
// The names of the rows are at their start, in the muted ink, not above the fields as in a `FormField`: a message
// is read down one column of fields, and the names are a margin beside it. While it is being
// sent the button waits in its place. «Discard» is there only when the app can throw the draft away, and does it at
// once: the app offers Undo in a notice (`Toasts`).
import * as React from 'react'
import { cn, isEmptyNode } from '../lib/utils'
import { useWords } from '../words'
import { useReveal } from '../internal/reveal'
import { isEmailAddress } from '../internal/email'
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
  // They glide open and shut after a press on their button; shown because they hold an address, they are just there.
  const reveal = useReveal(copies)
  // The reason the last try to send did not go, until the draft changes; counted, so the same reason said again
  // is a new alert and is read again.
  const [problem, setProblem] = React.useState<{ why: 'noRecipient' | 'badAddress'; at: number } | null>(null)
  const tries = React.useRef(0)
  const set = (part: Partial<EmailDraft>) => {
    setProblem(null)
    onChange({ ...value, ...part })
  }
  const focusRow = (field: 'to' | 'cc' | 'bcc') => form.current?.ownerDocument.getElementById(`${id}-${field}`)?.focus()
  const send = () => {
    if (sending) return
    const why = emailProblem(value)
    if (why === null) {
      setProblem(null)
      onSend(value)
      return
    }
    tries.current += 1
    setProblem({ why, at: tries.current })
    // To the first row with an address that is not one; with nobody to send it to, to «To».
    focusRow(why === 'badAddress' ? ((['to', 'cc', 'bcc'] as const).find((field) => !value[field].every(isEmailAddress)) ?? 'to') : 'to')
  }
  // Ctrl+Enter sends what the form holds once it is drawn again: an address being typed has become a chip by then.
  const [asking, setAsking] = React.useState(0)
  const sendLatest = React.useRef(send)
  sendLatest.current = send
  React.useEffect(() => {
    if (asking > 0) sendLatest.current()
  }, [asking])
  const addresses = (field: 'to' | 'cc' | 'bcc', name: string, end?: React.ReactNode) => (
    <div data-slot="email-composer-row" className={ROW}>
      <label htmlFor={`${id}-${field}`} data-slot="email-composer-name" className={NAME}>
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
      // Enter in a field of one line would send the form: here only the button and Ctrl+Enter send.
      onSubmit={(event) => event.preventDefault()}
      // Before the fields see it: the text's own Ctrl+Enter (a line break) does not run as well.
      onKeyDownCapture={(event) => {
        if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || event.nativeEvent.isComposing || event.keyCode === 229) return
        event.preventDefault()
        event.stopPropagation()
        // Leaving the field closes an address being typed into its chip.
        const active = form.current?.ownerDocument.activeElement
        if (active instanceof HTMLElement && form.current?.contains(active)) active.blur()
        setAsking((n) => n + 1)
      }}
    >
      {isEmptyNode(from) ? null : (
        // A group named «From»: the app's control inside it is named by the row.
        <div data-slot="email-composer-row" role="group" aria-labelledby={`${id}-from`} className={ROW}>
          <span id={`${id}-from`} data-slot="email-composer-name" className={NAME}>
            {words.from}
          </span>
          <div className="min-w-0 flex-1">{from}</div>
        </div>
      )}
      {addresses(
        'to',
        words.to,
        <Button type="button" variant="ghost" aria-expanded={copies} disabled={held} onClick={() => { reveal.pressed(); setAsked((now) => !now) }}>
          {words.copies}
        </Button>,
      )}
      {/* In the page while shown, and after a press that hid them, so that they are seen closing. */}
      {copies || reveal.byPress ? (
        <div data-slot="email-composer-copies" hidden={!copies} {...reveal.attrs} className="flex shrink-0 flex-col gap-2">
          {addresses('cc', words.cc)}
          {addresses('bcc', words.bcc)}
        </div>
      ) : null}
      <div data-slot="email-composer-row" className={ROW}>
        <label htmlFor={`${id}-subject`} data-slot="email-composer-name" className={NAME}>
          {words.subject}
        </label>
        <Input id={`${id}-subject`} className="min-w-0 flex-1" value={value.subject} onChange={(event) => set({ subject: event.target.value })} />
      </div>
      <RichTextField aria-label={words.body} value={value.html} onChange={(html) => set({ html })} className="min-h-0 flex-1" />
      {isEmptyNode(attachments) ? null : <div data-slot="email-composer-attachments">{attachments}</div>}
      {problem ? (
        <p key={problem.at} role="alert" data-slot="email-composer-problem" className="flex items-center gap-2 text-sm text-destructive">
          <Icon name="error" />
          {words[problem.why]}
        </p>
      ) : null}
      <div data-slot="email-composer-actions" className="flex items-center gap-2">
        <div data-slot="email-composer-tools" className="flex min-w-0 flex-1 items-center gap-1">
          {tools}
        </div>
        {onDiscard ? (
          <Button type="button" variant="ghost" onClick={onDiscard}>
            {words.discard}
          </Button>
        ) : null}
        <Button type="button" loading={sending} loadingText={words.sending} onClick={send}>
          <Icon name="send" />
          {words.send}
        </Button>
      </div>
    </form>
  )
}

// Handed out from this entry since 6.0.0: the check itself is shared with the form to sign in (internal/email.ts).
export { EmailComposer, isEmailAddress }
