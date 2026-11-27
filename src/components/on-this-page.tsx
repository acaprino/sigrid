// The index of a reading page: the sections of an article, each a link to its heading, the one in view marked. It is
// given the sections (`markdownHeadings` reads them from the same Markdown an article is drawn from, or the app lists
// them), and watches their headings itself: the last one at or above the reading line is the current one, said with
// `aria-current` and the accent (R2: what is current). It sits in the inspector of an `AppShell`, or beside the text in
// a wide pane; on a phone the inspector folds and the index with it. The links are plain anchors: the browser brings
// the heading into view and the address keeps the place.
import * as React from 'react'
import { cn } from '../lib/utils'
import { useWords } from '../words'

export type OnThisPageItem = {
  /** The id of the heading it points to (`markdownHeadings`' `id`, or the `id` the app gave its heading). */
  id: string
  /** The words of the section, as the index says them. */
  title: string
  /** The depth of the section: 2 (the default) a section of the page, 3 a part inside one, drawn further in. */
  level?: 2 | 3 | undefined
}

export type OnThisPageProps = {
  /** The sections, in the order they are read. With none, nothing is drawn. */
  items: readonly OnThisPageItem[]
  /** The current section's id, when the app knows it; absent, the index watches the headings itself. */
  currentId?: string | undefined
  className?: string | undefined
}

/** The id of the last heading at or above the reading line, a quarter down the window. */
function readCurrent(ids: readonly string[]): string | undefined {
  let current: string | undefined
  const line = window.innerHeight / 4
  for (const id of ids) {
    const el = document.getElementById(id)
    if (!el) continue
    if (el.getBoundingClientRect().top <= line) current = id
    else break
  }
  return current ?? ids[0]
}

/** The index of a reading page: its sections as links, the one in view marked with the accent. */
export function OnThisPage({ items, currentId, className }: OnThisPageProps) {
  const words = useWords().onThisPage
  const ids = items.map((it) => it.id)
  const key = ids.join('\n')
  const [seen, setSeen] = React.useState<string | undefined>(undefined)
  React.useEffect(() => {
    if (currentId !== undefined || items.length === 0 || typeof IntersectionObserver === 'undefined') return
    const ids = key.split('\n')
    const read = () => setSeen(readCurrent(ids))
    read()
    // The headings sit in whatever scrolls (the page's body, a pane): watching them cross the reading line with an
    // observer whose margin is that line hears every one of those scrolls without naming the scroller.
    const watcher = new IntersectionObserver(read, { rootMargin: '0px 0px -75% 0px' })
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) watcher.observe(el)
    }
    return () => watcher.disconnect()
  }, [currentId, key, items.length])
  if (items.length === 0) return null
  const current = currentId ?? seen
  return (
    <nav data-slot="on-this-page" aria-label={words.label} className={cn('text-sm', className)}>
      <p data-slot="on-this-page-label" className="mb-2 text-2xs font-medium text-ink-mute">
        {words.label}
      </p>
      <ul className="border-s border-line">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              aria-current={current === it.id ? 'true' : undefined}
              className={cn(
                '-ms-px flex min-h-7 items-center border-s border-transparent pe-2 text-ink-soft hover:text-ink pointer-coarse:min-h-11',
                it.level === 3 ? 'ps-6' : 'ps-3',
                current === it.id && 'border-primary font-medium text-accent hover:text-accent',
              )}
            >
              <span className="min-w-0 truncate">{it.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
