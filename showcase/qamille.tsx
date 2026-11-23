// Qamille, a mail client, as it would be made with the toolkit's frame: a sketch for the Examples view. The concepts
// and the words are Qamille's own (accounts told apart by a colour, the Smart inbox in sections, «Get the essentials»,
// Reply R and Archive E, the undo of what was just done, the web build that is a preview where sending is off), the
// mail is made up, and the frame is the toolkit's `AppShell` (the real app has a frame of its own).
// - On a computer: accounts, folders and labels are the sidebar (the dark column, as in Qamille); the messages are a
//   column of the content and the one chosen is read beside it; its actions are under it, «Reply» the solid one;
//   writing is a panel at the end that leaves the mail readable.
// - On a phone: the folders are too many for tabs, so they are the drawer; the list is the screen, a message is a
//   page with its actions at the foot, and writing is a sheet. (Qamille has no phone build: this is how it would be.)
// Keys, where there is a keyboard: N writes, R replies, E archives, Z undoes, Ctrl K searches.
import * as React from 'react'
import { ChevronLeft, Plus } from 'lucide-react'
import {
  AppShell,
  Avatar,
  Badge,
  Button,
  ChipsInput,
  Count,
  Empty,
  FormField,
  Icon,
  Input,
  ItemList,
  ItemRow,
  Kbd,
  NavItem,
  Select,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Sidebar,
  SidebarGroup,
  Textarea,
  Toolbar,
  ToolbarBrand,
  ToolbarButton,
  ToolbarSearch,
  ToolbarSpacer,
  ToolbarTab,
  ToolbarTabs,
  cn,
  colorTheme,
  type IconName,
  type ThemeDef,
  type ToastItem,
} from '../src/index'
import { AppBar, Dot, Host, MenuButton, isAppKey, type AppProps } from './hosts'

/** Qamille's own theme: its indigo, and the dark column for the sidebar in both schemes. */
const THEME: ThemeDef = { ...colorTheme({ id: 'qamille', label: 'Qamille', color: '#4f46e5', spot: 'balanced' }), sidebar: 'scura' }

const ACCOUNTS = [
  { id: 'work', name: 'Work', address: 'alex@studio-example.com', color: '#297abc' },
  { id: 'personal', name: 'Personal', address: 'alex.home@example.org', color: '#ee6449' },
] as const
const FOLDERS: readonly { id: string; label: string; icon: IconName }[] = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox' },
  { id: 'todo', label: 'To do', icon: 'tasks' },
  { id: 'snoozed', label: 'Snoozed', icon: 'clock' },
  { id: 'drafts', label: 'Drafts', icon: 'rename' },
  { id: 'sent', label: 'Sent', icon: 'send' },
  { id: 'archive', label: 'Archive', icon: 'archive' },
  { id: 'trash', label: 'Trash', icon: 'delete' },
]
const LABELS: Readonly<Record<string, string>> = { Dev: '#4452c4', Finance: '#f5a623', Projects: '#a35fd0', Reading: '#2f9e6e', Team: '#e5659a', Travel: '#1fa3b4' }
const SECTIONS = [
  { id: 'priority', label: 'Priority' },
  { id: 'new', label: 'New' },
  { id: 'newsletters', label: 'Newsletters' },
  { id: 'seen', label: 'Seen' },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

type Mail = { id: string; from: string; address: string; account: 'work' | 'personal'; subject: string; snippet: string; body: readonly string[]; essentials: string; date: string; unread: boolean; section: SectionId; label?: string; file?: { name: string; size: string }; folder: string }
const MAIL: readonly Mail[] = [
  { id: 'q4', from: 'Maria Rossi', address: 'maria.rossi@studio-example.com', account: 'work', subject: 'Q4 proposal: can you review by Thursday?', snippet: 'I attached the draft. Two numbers on page 3 still need your eye.', body: ['Hi Alex,', 'I attached the draft of the Q4 proposal. Two numbers on page 3 still need your eye: the travel budget and the cost of the two new licences.', 'If you can send me your notes by Thursday, I will have Friday morning to fix it before it goes to the client.', 'Thank you, Maria'], essentials: 'Maria needs your notes on the Q4 proposal by Thursday. Check the travel budget and the licence cost on page 3.', date: '09:42', unread: true, section: 'priority', label: 'Projects', file: { name: 'Q4-proposal.pdf', size: '248 KB' }, folder: 'inbox' },
  { id: 'review', from: 'Luca Bianchi', address: 'luca.bianchi@studio-example.com', account: 'work', subject: 'Design review moved to 3 pm', snippet: 'The room was taken at two. Same link, one hour later.', body: ['The room was taken at two, so the design review moves to 3 pm. Same link, one hour later.', 'Bring the two versions of the onboarding: we choose one today.', 'Luca'], essentials: 'The design review is now at 3 pm, same link. Bring both versions of the onboarding.', date: '08:15', unread: true, section: 'new', label: 'Team', folder: 'inbox' },
  { id: 'dinner', from: 'Sofia', address: 'sofia@example.org', account: 'personal', subject: 'Dinner on Saturday?', snippet: 'Marco found a place near the river. Eight, if it suits you.', body: ['Marco found a place near the river that takes six people. Eight o\'clock, if it suits you.', 'Tell me by tomorrow and I will book.'], essentials: 'Sofia asks if you can come to dinner on Saturday at eight. She books tomorrow.', date: 'Sun', unread: true, section: 'new', folder: 'inbox' },
  { id: 'kickoff', from: 'Paolo Verdi', address: 'paolo.verdi@partner-example.com', account: 'work', subject: 'Invitation: Partnership kickoff, Tue 10:00', snippet: 'One hour, on a call. The agenda is in the invitation.', body: ['You are invited to the partnership kickoff on Tuesday at 10:00. One hour, on a call.', 'Agenda: who does what, the dates of the first release, the shared folder.'], essentials: 'Kickoff call on Tuesday at 10:00, one hour. No answer given yet.', date: 'Sun', unread: false, section: 'new', folder: 'inbox' },
  { id: 'invoice', from: 'Accounting', address: 'accounting@studio-example.com', account: 'work', subject: 'Invoice #2291 for October', snippet: 'Due on 30 November. The bank details are unchanged.', body: ['Please find invoice #2291 for October attached. It is due on 30 November; the bank details are unchanged.'], essentials: 'Invoice #2291 for October, due on 30 November.', date: 'Fri', unread: false, section: 'seen', label: 'Finance', file: { name: 'invoice-2291.pdf', size: '96 KB' }, folder: 'inbox' },
  { id: 'flight', from: 'Travel Desk', address: 'bookings@travel-example.com', account: 'work', subject: 'Your flight to Berlin is confirmed', snippet: 'Thu 3 Dec, 07:10. Check-in opens 24 hours before.', body: ['Your flight to Berlin on Thursday 3 December at 07:10 is confirmed.', 'Check-in opens 24 hours before departure. One cabin bag is included.'], essentials: 'Flight to Berlin confirmed for Thursday 3 December at 07:10.', date: 'Fri', unread: false, section: 'seen', label: 'Travel', folder: 'inbox' },
  { id: 'brief', from: 'The Weekly Brief', address: 'brief@newsletter-example.com', account: 'personal', subject: 'This week: 5 tools for focused work', snippet: 'A timer that hides the clock, and four more.', body: ['This week: five tools for focused work. A timer that hides the clock, a list that shows one thing, and three more.'], essentials: 'A newsletter: five tools for focused work.', date: 'Thu', unread: false, section: 'newsletters', label: 'Reading', folder: 'inbox' },
  { id: 'digest', from: 'Design Digest', address: 'digest@newsletter-example.com', account: 'personal', subject: 'Typography trends for 2027', snippet: 'Wider letters, fewer weights, and what it means for interfaces.', body: ['Wider letters, fewer weights, and what it means for interfaces: our yearly look at type.'], essentials: 'A newsletter: the type trends of the year.', date: 'Wed', unread: false, section: 'newsletters', folder: 'inbox' },
]
const PEOPLE: Readonly<Record<string, string>> = Object.fromEntries(MAIL.map((m) => [m.address, m.from]))

type Notice = { id: string; text: string; undo?: () => void }
type Draft = { to: string[]; subject: string; body: string; reply: boolean }

export function Qamille({ device, host, animated, density, look }: AppProps) {
  const phone = device === 'phone'
  const preview = host === 'web'
  const [mail, setMail] = React.useState<readonly Mail[]>(MAIL)
  const [account, setAccount] = React.useState<'all' | 'work' | 'personal'>('all')
  const [folder, setFolder] = React.useState('inbox')
  const [filter, setFilter] = React.useState('smart')
  const [openId, setOpenId] = React.useState<string | null>(phone ? null : 'q4')
  const [essentials, setEssentials] = React.useState<readonly string[]>([])
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [menu, setMenu] = React.useState(false)
  const [text, setText] = React.useState('')
  const [searching, setSearching] = React.useState(false)
  const [notices, setNotices] = React.useState<readonly Notice[]>([])
  const count = React.useRef(0)
  const id = React.useId()

  const word = text.trim().toLowerCase()
  const here = mail.filter((m) => m.folder === folder && (account === 'all' || m.account === account))
  const shown = here.filter((m) => (filter !== 'unread' || m.unread) && (word === '' || `${m.from} ${m.subject} ${m.snippet}`.toLowerCase().includes(word)))
  const opened = shown.find((m) => m.id === openId) ?? null
  const unread = (target: string) => mail.filter((m) => m.folder === target && m.unread && (account === 'all' || m.account === account)).length
  const folderLabel = FOLDERS.find((f) => f.id === folder)?.label ?? folder
  const toRead = unread('inbox')

  const dismiss = React.useCallback((notice: string) => setNotices((list) => list.filter((n) => n.id !== notice)), [])
  const say = (said: string, undo?: () => void) => setNotices((list) => [...list, { id: `n${(count.current += 1)}`, text: said, ...(undo ? { undo } : {}) }])
  const read = (target: string) => {
    setOpenId(target)
    setMail((list) => list.map((m) => (m.id === target ? { ...m, unread: false } : m)))
  }
  const go = (next: string) => {
    setFolder(next)
    setMenu(false)
    setOpenId(null)
  }
  /** Out of this folder at once, with the way back in the notice (R12). On a computer the next message is read. */
  const move = (target: Mail, to: string, said: string) => {
    const at = shown.findIndex((m) => m.id === target.id)
    const next = shown[at + 1] ?? shown[at - 1]
    setMail((list) => list.map((m) => (m.id === target.id ? { ...m, folder: to } : m)))
    setOpenId(phone || !next ? null : next.id)
    say(said, () => setMail((list) => list.map((m) => (m.id === target.id ? { ...m, folder: target.folder } : m))))
  }
  const reply = (target: Mail) => setDraft({ to: [target.address], subject: target.subject.startsWith('Re: ') ? target.subject : `Re: ${target.subject}`, body: '', reply: true })
  const send = () => {
    if (!draft || draft.to.length === 0) return
    const sent = draft
    setDraft(null)
    say(`Sent to ${PEOPLE[sent.to[0] ?? ''] ?? sent.to[0]}`, () => setDraft(sent))
  }
  const undo = () => {
    const last = [...notices].reverse().find((n) => n.undo)
    if (!last) return
    last.undo?.()
    dismiss(last.id)
  }
  const keys = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      setSearching(true)
      event.preventDefault()
      return
    }
    if (!isAppKey(event)) return
    const key = event.key.toLowerCase()
    if (key === 'z') undo()
    else if (key === 'n') setDraft({ to: [], subject: '', body: '', reply: false })
    else if (key === 'r' && opened) reply(opened)
    else if (key === 'e' && opened) move(opened, 'archive', 'Archived')
    else return
    event.preventDefault()
  }
  const toasts: ToastItem[] = notices.map((n) => ({ id: n.id, text: n.text, ...(n.undo ? { undo: { ...(phone ? {} : { hint: 'Z' }), onClick: () => { n.undo?.(); dismiss(n.id) } } } : {}) }))

  /* ———— The regions ———— */

  const sidebar = (
    <Sidebar
      aria-label="Accounts and folders"
      open={menu}
      onOpenChange={setMenu}
      animated={animated}
      // The account is not a place but what the folders show: it is chosen at the head, so the rows keep one selection (R1).
      header={<Select aria-label="Account" size="sm" value={account} onValueChange={(next) => setAccount(next === 'work' || next === 'personal' ? next : 'all')} options={[{ value: 'all', label: 'All accounts' }, ...ACCOUNTS.map((a) => ({ value: a.id, label: a.name }))]} animated={animated} />}
    >
      <SidebarGroup label="Folders" icon={<Icon name="inbox" />}>
        {FOLDERS.map((f) => (
          <NavItem key={f.id} current={folder === f.id} onClick={() => go(f.id)} icon={<Icon name={f.icon} />} end={<Count value={f.id === 'inbox' ? unread(f.id) : mail.filter((m) => m.folder === f.id).length} label={f.id === 'inbox' ? 'to read' : 'messages'} reserve />}>
            {f.label}
          </NavItem>
        ))}
      </SidebarGroup>
      <SidebarGroup label="Labels" icon={<Icon name="labels" />} collapsible>
        {Object.entries(LABELS).map(([name, color]) => (
          <NavItem key={name} icon={<Dot color={color} />} onClick={() => setText(name)}>
            {name}
          </NavItem>
        ))}
      </SidebarGroup>
    </Sidebar>
  )

  const compose = () => setDraft({ to: [], subject: '', body: '', reply: false })
  const bar = phone && opened ? (
    <>
      <ToolbarButton label={`Back to ${folderLabel}`} icon={<ChevronLeft aria-hidden="true" />} keepWord onClick={() => setOpenId(null)} animated={animated}>
        {folderLabel}
      </ToolbarButton>
      <ToolbarSpacer />
    </>
  ) : (
    <>
      <MenuButton onOpen={() => setMenu(true)} animated={animated} />
      <ToolbarBrand name="Qamille" page={folderLabel} />
      <ToolbarSpacer />
      <ToolbarSearch label="Search the mail" shortcut="Ctrl K" closed={phone ? 'icon' : 'field'} value={text} onValueChange={setText} open={searching} onOpenChange={setSearching} animated={animated} />
      {/* The web build of Qamille is a preview on sample mail: it says so in the bar, and sending is off. */}
      {preview && !phone ? <Badge variant="secondary">Preview</Badge> : null}
      {phone ? null : <ToolbarButton label="Sync mail" icon={<Icon name="refresh" />} onClick={() => say('Mail is up to date')} animated={animated} />}
      {/* On the list of a phone writing is the one solid action; on a computer the solid one is Reply, under the message. */}
      <ToolbarButton label="New message" shortcut="N" variant={phone ? 'default' : 'outline'} icon={<Plus aria-hidden="true" />} onClick={compose} animated={animated}>
        New message
      </ToolbarButton>
    </>
  )

  const row = (m: Mail) => (
    <ItemRow
      key={m.id}
      title={m.from}
      description={
        <>
          <span className="font-medium">{m.subject}</span> — {m.snippet}
        </>
      }
      meta={m.date}
      unread={m.unread}
      current={!phone && m.id === openId}
      end={m.file ? <span aria-label="With an attachment" className="inline-flex text-ink-mute [&_svg]:size-3.5"><Icon name="attach" /></span> : undefined}
      onClick={() => read(m.id)}
    />
  )
  const list =
    shown.length === 0 ? (
      <Empty className="h-full p-6" title={word ? 'Nothing has that word' : folder === 'inbox' ? 'You’re all caught up' : 'Nothing here'} description={word ? 'Try a person, a word or a date.' : undefined} />
    ) : folder === 'inbox' && filter === 'smart' ? (
      <div className="flex flex-col gap-3 p-2">
        {SECTIONS.map((section) => {
          const rows = shown.filter((m) => m.section === section.id)
          return rows.length === 0 ? null : (
            <section key={section.id} aria-label={section.label}>
              <h2 className="flex items-center gap-2 px-3 py-1 text-2xs font-medium text-ink-mute">
                {section.label}
                <span className="font-normal tabular-nums">{rows.length}</span>
              </h2>
              <ItemList aria-label={section.label}>{rows.map(row)}</ItemList>
            </section>
          )
        })}
      </div>
    ) : (
      <ItemList aria-label={folderLabel} className="p-2">
        {shown.map(row)}
      </ItemList>
    )

  const reader = opened ? (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6" data-slot="reader">
      <p className="flex items-center gap-2 text-2xs text-ink-mute">
        <Dot color={ACCOUNTS.find((a) => a.id === opened.account)?.color ?? '#6b7a8f'} />
        {ACCOUNTS.find((a) => a.id === opened.account)?.name} › {folderLabel}
        {opened.label ? (
          <span className="inline-flex items-center gap-1.5">
            <Dot color={LABELS[opened.label] ?? '#6b7a8f'} />
            {opened.label}
          </span>
        ) : null}
      </p>
      <h1 className="text-xl font-semibold text-ink">{opened.subject}</h1>
      <div className="flex items-center gap-3">
        <Avatar name={opened.from} size="sm" decorative />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-ink">{opened.from}</span>
          <span className="truncate text-xs text-ink-mute">{opened.address}, to you</span>
        </div>
        <span className="shrink-0 text-2xs text-ink-mute tabular-nums">{opened.date}</span>
      </div>
      <section aria-label="The essentials" className="flex flex-col gap-2 rounded-lg bg-paper-2 p-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
            <span aria-hidden="true" className="inline-flex text-ink-mute [&_svg]:size-4">
              <Icon name="ai" />
            </span>
            Get the essentials
          </h2>
          {essentials.includes(opened.id) ? null : (
            <Button variant="outline" size="sm" onClick={() => setEssentials((list) => [...list, opened.id])}>
              Summarize
            </Button>
          )}
        </div>
        {essentials.includes(opened.id) ? <p className="text-sm text-ink-soft">{opened.essentials}</p> : null}
      </section>
      <div data-selectable="" className="flex flex-col gap-3 text-sm text-ink-soft">
        {opened.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {opened.file ? (
        <div className="flex items-center gap-3 border-t border-line pt-3 text-sm">
          <span aria-hidden="true" className="inline-flex text-ink-mute [&_svg]:size-4">
            <Icon name="attach" />
          </span>
          <span className="min-w-0 flex-1 truncate text-ink">{opened.file.name}</span>
          <span className="text-2xs text-ink-mute tabular-nums">{opened.file.size}</span>
          <Button variant="ghost" size="sm" onClick={() => say(`Opened ${opened.file?.name}`)}>
            Preview
          </Button>
        </div>
      ) : null}
    </article>
  ) : (
    <Empty className="h-full p-6" title="A little more focus." description="Choose a message to read it here." />
  )

  const key = (letter: string) => (phone ? null : <Kbd>{letter}</Kbd>)
  const actions = opened ? (
    <>
      <Button variant="ghost" onClick={() => move(opened, 'trash', 'Moved to trash')}>
        {phone ? 'Trash' : 'Move to trash'}
      </Button>
      {phone ? null : (
        <Button variant="ghost" onClick={() => move(opened, 'snoozed', 'Snoozed until tomorrow')}>
          Snooze
        </Button>
      )}
      <Button variant="outline" onClick={() => move(opened, 'archive', 'Archived')}>
        Archive {key('E')}
      </Button>
      {phone ? null : (
        <Button variant="outline" onClick={() => setDraft({ to: [opened.address], subject: `Fwd: ${opened.subject}`, body: '', reply: false })}>
          Forward
        </Button>
      )}
      {/* One solid action on the screen (R3): while a message is being written it is Send, and Reply steps back. */}
      <Button variant={draft ? 'outline' : 'default'} onClick={() => reply(opened)}>
        Reply {key('R')}
      </Button>
    </>
  ) : undefined

  const tabs = folder === 'inbox' && !(phone && opened) ? (
    <Toolbar aria-label="Views of the inbox">
      <ToolbarTabs aria-label="Show" value={filter} onValueChange={setFilter}>
        <ToolbarTab value="smart">Smart</ToolbarTab>
        <ToolbarTab value="all">All</ToolbarTab>
        <ToolbarTab value="unread">Unread</ToolbarTab>
      </ToolbarTabs>
    </Toolbar>
  ) : undefined

  // Inside the bar, as every overlay of the frame: in a window of its own it then opens under the title bar.
  // Writing: a panel at the end on a computer, which leaves the mail readable; a sheet from the foot on a phone.
  const composer = (
    <Sheet open={draft !== null} onOpenChange={(next) => (next ? undefined : setDraft(null))} modal={phone} disablePointerDismissal={!phone}>
      <SheetContent side={phone ? 'bottom' : 'right'} animated={animated} className={cn(!phone && 'sm:max-w-md')}>
        <SheetHeader>
          <SheetTitle>{draft?.reply ? 'Reply' : 'New message'}</SheetTitle>
          <SheetDescription>From Alex, {ACCOUNTS[0].address}</SheetDescription>
        </SheetHeader>
        {draft ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
            <FormField label="To" id={`${id}-to`}>
              <ChipsInput id={`${id}-to`} value={draft.to} onChange={(to) => setDraft({ ...draft, to })} suggestions={Object.keys(PEOPLE)} display={(address) => PEOPLE[address] ?? address} invalid={(address) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)} separators={[',', ';', ' ']} placeholder="A name or an address" />
            </FormField>
            <FormField label="Subject">
              <Input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Add a subject" autoComplete="off" />
            </FormField>
            <FormField label="Message" help={preview ? 'This is the preview: sending is off.' : undefined}>
              <Textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className="min-h-32" />
            </FormField>
          </div>
        ) : null}
        <SheetFooter className={phone ? undefined : 'flex-row justify-end'}>
          {phone ? null : (
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Discard draft
            </Button>
          )}
          <Button disabled={preview || !draft || draft.to.length === 0} onClick={send}>
            Send
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )

  return (
    <Host device={device} host={host} animated={animated} theme={THEME} look={look} density={density} address={`qamille.app/${folder}`} notices={toasts} onDismiss={dismiss}>
      <div className="h-full" onKeyDown={keys}>
        <AppShell
          desktop={!phone && host === 'native'}
          contentLabel={phone && opened ? opened.subject : folderLabel}
          titleBar={
            <AppBar device={device} host={host} label="Qamille" overlays={composer}>
              {bar}
            </AppBar>
          }
          tabs={tabs}
          sidebar={sidebar}
          actions={actions}
          footer={
            phone ? undefined : (
              <>
                <span>{preview ? 'Preview: sample mail, sending is off' : 'Connected'}</span>
                <span className="tabular-nums">{toRead} to read</span>
                <span className="ms-auto inline-flex items-center gap-3">
                  {(['N write', 'R reply', 'E archive', 'Z undo'] as const).map((hint) => (
                    <span key={hint} className="inline-flex items-center gap-1">
                      <Kbd>{hint.slice(0, 1)}</Kbd> {hint.slice(2)}
                    </span>
                  ))}
                </span>
              </>
            )
          }
        >
          {phone ? (
            opened ? reader : list
          ) : (
            <div className="flex h-full min-h-0">
              <div data-slot="mail-column" className="w-90 shrink-0 overflow-y-auto border-e border-line">
                {list}
              </div>
              <div className="min-w-0 flex-1 overflow-y-auto">{reader}</div>
            </div>
          )}
        </AppShell>
      </div>
    </Host>
  )
}
