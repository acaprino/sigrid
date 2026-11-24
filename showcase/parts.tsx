// The showcase's layout parts, shared by the guide pages (guide.tsx) and the component gallery (main.tsx): the page
// header, the section and its rows, and how a page asks the frame to show another view.
import * as React from 'react'
import { ArrowRight } from 'lucide-react'
import { Button, Icon, type IconName } from '../src/primitives'

/** The five views of the showcase: the idea, the rules, the way to put the parts together, the parts themselves, and whole apps made of them. */
export const VIEWS = [
  { id: 'philosophy', label: 'Philosophy', icon: 'all' },
  { id: 'guidelines', label: 'Guidelines', icon: 'tasks' },
  { id: 'practices', label: 'Practices', icon: 'layout' },
  // `short`: its name in the bar at the foot of a window too narrow for five whole names (under 360px).
  { id: 'components', label: 'Components', short: 'Parts', icon: 'structure' },
  { id: 'examples', label: 'Examples', icon: 'inbox' },
] as const satisfies readonly { id: string; label: string; short?: string; icon: IconName }[]
export type ViewId = (typeof VIEWS)[number]['id']
export const isViewId = (value: unknown): value is ViewId => VIEWS.some((v) => v.id === value)

/**
 * The view a section id belongs to: a guide page prefixes its ids with its view, the layout gallery sits in Practices,
 * and everything else is a component.
 */
export function viewOfId(id: string): ViewId {
  const prefix = id.split('-', 1)[0]
  if (prefix === 'philosophy' || prefix === 'guidelines' || prefix === 'practices' || prefix === 'examples') return prefix
  return id === 'patterns' ? 'practices' : 'components'
}

/** A word of code in a sentence. */
export const Code = ({ children }: { children: React.ReactNode }) => <code className="font-mono text-xs text-ink">{children}</code>

/** Takes the page to a view, and to one of its sections. The frame provides it. */
export const Go = React.createContext<(view: ViewId, id?: string) => void>(() => {})

/** An in-page link to a section of another view: a real link, so it also opens in a new tab with the look as it is. */
export function See({ view, id, children }: { view: ViewId; id: string; children: React.ReactNode }) {
  const go = React.useContext(Go)
  const next = new URLSearchParams(location.search)
  next.set('view', view)
  return (
    <Button variant="link" size="xs" asChild className="-ms-(--pad-xs)">
      <a
        href={`?${next.toString()}#${id}`}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          go(view, id)
        }}
      >
        {children}
        <ArrowRight aria-hidden="true" />
      </a>
    </Button>
  )
}

/** The head of a view: its name, and what it is for in one sentence. */
export function Page({ title, lead, children }: { title: string; lead: React.ReactNode; children: React.ReactNode }) {
  return (
    <div data-showcase-page={title.toLowerCase()}>
      <header className="py-8">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 max-w-prose text-base text-ink-soft">{lead}</p>
      </header>
      {children}
    </div>
  )
}

/**
 * One section of a view. The index at the side is read from these (`data-showcase`, and `data-icon` for the row's icon),
 * so it cannot fall behind the page. A section with an `icon` shows it before the title (R6).
 */
export function Section({ id, title, note, icon, children }: { id: string; title: string; note?: React.ReactNode; icon?: IconName; children: React.ReactNode }) {
  return (
    <section id={id} data-showcase={id} data-icon={icon} aria-labelledby={`${id}-title`} className="scroll-mt-4 border-t border-line py-8">
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-xl font-semibold text-ink">
        {icon ? (
          <span aria-hidden="true" className="inline-flex text-ink-mute [&_svg]:size-5">
            <Icon name={icon} />
          </span>
        ) : null}
        {title}
      </h2>
      {note ? <p className="mt-2 max-w-prose text-sm text-ink-soft">{note}</p> : null}
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  )
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-[8rem_1fr] md:gap-4">
      <div className="text-2xs font-medium text-ink-mute md:pt-2">{label}</div>
      <div className="flex min-w-0 flex-wrap items-start gap-4">{children}</div>
    </div>
  )
}

export function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div data-cell={label} className="flex max-w-full min-w-0 flex-col items-start gap-2">
      {children}
      <span className="text-2xs text-ink-mute">{label}</span>
    </div>
  )
}
