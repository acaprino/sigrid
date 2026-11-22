// The three guide views of the showcase: the philosophy, the guidelines and the practices of the design system. They say
// in words what DESIGN.md (the rules, R1 to R13), the README and docs/patterns.md say, and show each point with the
// toolkit's own parts, so they follow the theme chosen in Look. Figures that live in code (densities, corner radii, the
// frame's steps) are read from the exports, never copied: a copy would fall behind. The wording of the rules and the
// recommendations follows those three files; when one changes, change it here too.
//
// The guide pages are themselves the «sidebar and page» pattern of Practices: one column of text no wider than 65
// characters (`max-w-prose`), with the examples allowed to be wider.
import * as React from 'react'
import {
  APP_SHELL_STEPS,
  Button,
  Checkbox,
  COLORS,
  Count,
  DEFAULT_SHAPE,
  DENSITIES,
  Icon,
  Input,
  Kbd,
  NavItem,
  NavList,
  SHAPE_RADII,
  Switch,
  THEME_SHAPES,
  TOUCH_TARGET,
  cn,
  markHueAttrs,
  type IconName,
} from '../src/index'
import { Code, Page, Section, See } from './parts'

/* ———— Small parts ———— */

/** A short point with its icon (R6), on a raised card: a shadow and no border (R4). */
function Card({ icon, title, refs, children }: { icon: IconName; title: string; refs?: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg bg-raised p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span aria-hidden="true" className="inline-flex text-ink-mute [&_svg]:size-4">
          <Icon name={icon} />
        </span>
        {title}
      </h3>
      <p className="text-sm text-ink-soft">{children}</p>
      {refs ? <p className="mt-auto pt-1 text-2xs text-ink-mute">{refs}</p> : null}
    </li>
  )
}

const CARDS = 'grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3'

/** A list of short sentences with no marker: the divider between them is the structure. */
function Lines({ items }: { items: readonly React.ReactNode[] }) {
  return (
    <ul role="list" className="flex max-w-prose flex-col">
      {items.map((item, i) => (
        <li key={i} className="border-t border-line py-2 text-sm text-ink-soft first:border-t-0">
          {item}
        </li>
      ))}
    </ul>
  )
}

/* ———— Philosophy ———— */

/** What the accent is for, as R2 lists it. */
const ACCENT_USES: readonly (readonly [string, string])[] = [
  ['Act here', 'The one solid action of the screen, and the buttons that add.'],
  ['This is on', 'A checked box, a radio, a switch, a slider.'],
  ['You are here', 'The chosen row, with its short bar, and the icons of the main views.'],
  ['Right now', 'Today, unread, and progress.'],
  ['The keyboard is here', 'The focus ring, on every control.'],
]

/** A small to-do screen: the accent shows up in a few places only, and all the rest is neutral. */
function AccentDemo() {
  const [place, setPlace] = React.useState('today')
  const places = [
    { id: 'today', icon: 'now', label: 'Today', count: 3 },
    { id: 'upcoming', icon: 'date', label: 'Upcoming', count: 8 },
    { id: 'all', icon: 'all', label: 'All', count: 24 },
  ] as const
  return (
    <div className="@container">
      <div data-sample="accent" className="grid gap-4 rounded-lg bg-raised p-4 shadow-xs @md:grid-cols-[13rem_minmax(0,1fr)]">
        <NavList aria-label="Sample views">
          {places.map((p) => (
            <NavItem key={p.id} current={place === p.id} onClick={() => setPlace(p.id)} icon={<Icon name={p.icon} />} end={<Count value={p.count} label="items" reserve />}>
              {p.label}
            </NavItem>
          ))}
        </NavList>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-base font-semibold text-ink">Today</p>
          <ul role="list" className="flex flex-col gap-2 text-sm">
            <li className="flex items-center gap-3">
              <Checkbox aria-label="Pay the waste tax" defaultChecked />
              <span className="min-w-0 flex-1 truncate text-ink">Pay the waste tax</span>
              <span className="text-accent">Today</span>
            </li>
            <li className="flex items-center gap-3">
              <Checkbox aria-label="Call the plumber" />
              <span className="min-w-0 flex-1 truncate text-ink">Call the plumber</span>
              <span className="text-ink-mute">Tomorrow</span>
            </li>
            <li className="flex items-center gap-3">
              <Checkbox aria-label="Renew the identity card" />
              <span className="min-w-0 flex-1 truncate text-ink">Renew the identity card</span>
              <span className="text-ink-mute">28 Nov</span>
            </li>
          </ul>
          <Switch defaultChecked>Remind me at 9:00</Switch>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button>Add task</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const PRINCIPLES: readonly { icon: IconName; title: string; refs: string; text: string }[] = [
  { icon: 'now', title: 'Show what matters first', refs: 'R2, R3', text: 'One solid primary action on each screen, and a solid red one only to delete. The other actions are outline or text buttons, so the eye has one place to land.' },
  { icon: 'tasks', title: 'Keep state in sight', refs: 'R1, R5', text: 'The chosen row has a tint, stronger text and a short accent bar. What is on shows in the accent. Counts are tabular numbers, so they do not jump.' },
  { icon: 'tag', title: 'Draw anchors, not decoration', refs: 'R6', text: 'Every navigation item, section heading, menu entry and settings group has an icon from the pack the user chose. Sparkles, bolts and info icons as decoration are out.' },
  { icon: 'animations', title: 'Move calmly, only on a gesture', refs: 'Motion', text: 'Short tweens of 100 to 200 ms: entering decelerates, leaving accelerates. No springs, no loops except loading skeletons. The app switches motion on, and everything works with it off.' },
  { icon: 'settings', title: 'Offer few choices first', refs: 'R11, R13', text: 'Each settings section shows its essential choices and keeps the rest under an Advanced fold, closed by default. Calm, Balanced and Vivid move all the accents at once.' },
  { icon: 'check', title: 'Stay readable and reachable', refs: 'R8, R9, R12', text: 'Text keeps 4.5:1 and borders and rings 3:1 in every theme. The focus ring is 2px in the accent. With a finger every control is at least 44px. Z undoes the newest action.' },
]

/** The four layers of the README, each with where to see it. */
const LAYERS: readonly { name: string; text: string; id: string; see: string }[] = [
  { name: 'Behaviour', text: 'Base UI carries the basic controls and the surfaces that open: dialog, sheet, select, popover, menu, tooltip. Ark UI carries the richer parts Base UI lacks: date picker, tags input, file upload, combobox, slider, tabs.', id: 'select', see: 'Select' },
  { name: 'Form', text: "Park UI's recipes, translated by hand to Tailwind classes: the sizes, variants, corner levels and elevation of every primitive.", id: 'button', see: 'Button' },
  { name: 'Motion', text: "Short tweens on Fluent 2's durations and curves. They run only in answer to a gesture, and only where the app enables them.", id: 'motion-pieces', see: 'Motion pieces' },
  { name: 'Colours', text: 'The theme engine computes every colour from the chosen theme and scheme and writes it as tokens on the root. An app passes its own themes, and a user can make one from a base colour.', id: 'theme-gallery', see: 'Theme gallery' },
]

export function PhilosophyView() {
  return (
    <Page title="Philosophy" lead="Sigrid is the design system shared by a suite of apps for to-do lists, mail and more, made ADHD first: calm surfaces, one accent that shows where to look and what to click, and one clear action at a time.">
      <Section id="philosophy-idea" icon="colors" title="Calm surfaces, one accent" note="Neutral surfaces carry the content. The accent means one of two things: act here, or this is on. Everything else stays neutral, so the accent keeps its pull (R2). The gray baseline has no hue, so there the accent is the ink: pick a coloured theme in Look to see the screen below follow it.">
        <div className="@container">
          <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
            <AccentDemo />
            <div>
              <h3 className="text-sm font-semibold text-ink">Where the accent shows</h3>
              <dl className="mt-3 flex flex-col">
                {ACCENT_USES.map(([term, text]) => (
                  <div key={term} className="border-t border-line py-2 first:border-t-0">
                    <dt className="text-sm font-medium text-ink">{term}</dt>
                    <dd className="text-sm text-ink-soft">{text}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-ink-soft">Red is kept for danger: a solid red button deletes, red text says what is wrong.</p>
            </div>
          </div>
        </div>
      </Section>
      <Section id="philosophy-principles" icon="check" title="Six principles" note="What every choice in the system comes back to. Each one is a rule in the guidelines, with its number.">
        <div className="@container">
          <ul role="list" className={CARDS}>
            {PRINCIPLES.map((p) => (
              <Card key={p.title} icon={p.icon} title={p.title} refs={p.refs}>
                {p.text}
              </Card>
            ))}
          </ul>
        </div>
      </Section>
      <Section id="philosophy-layers" icon="structure" title="Four layers, each from its best source" note="Nothing is invented twice: behaviour, form, motion and colour each come from the place that does it best.">
        <ol role="list" className="@container flex flex-col">
          {LAYERS.map((layer, i) => (
            <li key={layer.name} className="grid gap-1 border-t border-line py-4 first:border-t-0 @2xl:grid-cols-[2rem_8rem_minmax(0,1fr)] @2xl:gap-4">
              <span className="text-sm text-ink-mute tabular-nums">{i + 1}</span>
              <h3 className="text-sm font-semibold text-ink">{layer.name}</h3>
              <div className="min-w-0">
                <p className="max-w-prose text-sm text-ink-soft">{layer.text}</p>
                <See view="components" id={layer.id}>
                  See {layer.see}
                </See>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </Page>
  )
}

/* ———— Guidelines ———— */

/** One rule: its number and name, its words, and a live example of it when a small one says it better than words. */
function Rule({ id, title, example, see, children }: { id: string; title: string; example?: React.ReactNode; see?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li id={`guidelines-${id.toLowerCase()}`} className="grid gap-3 border-t border-line py-4 first:border-t-0 @3xl:grid-cols-[2.5rem_minmax(0,1fr)_17rem] @3xl:gap-4">
      <span className="text-sm font-semibold text-ink-mute tabular-nums">{id}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1 max-w-prose text-sm text-ink-soft">{children}</p>
        {see}
      </div>
      {example ? <div className="flex min-w-0 flex-wrap items-center gap-3 self-start rounded-lg bg-paper-2 p-3">{example}</div> : null}
    </li>
  )
}

const Rules = ({ children }: { children: React.ReactNode }) => (
  <ol role="list" className="@container flex flex-col">
    {children}
  </ol>
)

const DOTS: readonly (readonly [string, string])[] = [
  ['Travel', COLORS[10] as string],
  ['Contracts', COLORS[4] as string],
  ['Reports', COLORS[7] as string],
]

const DO = [
  'Keep one solid primary action on each screen.',
  'Give navigation items and headings an icon.',
  'Show data colours as dots.',
  'Write key hints as plain text.',
  "Take every colour from the theme engine.",
]
const NEVER_DRAW = [
  'Side rails or accent bars on cards or fields.',
  'A border and a shadow on the same element.',
  'Key hints drawn as boxes.',
  'Gradients, glass or blur.',
  'Data colours as filled blocks.',
]
const NEVER_ADD = [
  'Sparkles, bolts or info icons as decoration.',
  'Emoji in the interface, except the Emoji icon pack when the user picks it.',
  'Looping animation, except loading skeletons.',
  'A colour value outside the theme engine.',
]

function DoList({ icon, title, items }: { icon: IconName; title: string; items: readonly string[] }) {
  return (
    <div className="rounded-lg bg-raised p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span aria-hidden="true" className="inline-flex text-ink-mute [&_svg]:size-4">
          <Icon name={icon} />
        </span>
        {title}
      </h3>
      <ul role="list" className="mt-2 flex flex-col">
        {items.map((item) => (
          <li key={item} className="border-t border-line py-2 text-sm text-ink-soft first:border-t-0">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The checks that keep the rules, with what each one reads. */
const CHECKS: readonly (readonly [string, string])[] = [
  ['npm run design:lint', 'DESIGN.md is a valid design file.'],
  ['npm run design:check', 'The code in src uses no colour value, palette class, arbitrary size, font or effect that DESIGN.md does not permit.'],
  ['npm test', 'design-rules checks the scale classes (text sizes, radii, shadows, weights, icons, a border with a shadow, boxed key hints, loops and effects); the contrast tests check every theme.'],
]

export function GuidelinesView() {
  return (
    <Page title="Guidelines" lead="The rules of the design file, R1 to R13. Unlike the practices, these are rules: the code checks the ones it can read, and the tests check the contrast of every theme.">
      <Section id="guidelines-accent" icon="now" title="Where the eye goes" note="The accent, the one solid action and the tone: what the eye finds first on a screen.">
        <Rules>
          <Rule
            id="R1"
            title="Selection"
            example={
              <NavList aria-label="Sample selection" className="w-full">
                <NavItem current icon={<Icon name="inbox" />}>
                  Inbox
                </NavItem>
                <NavItem icon={<Icon name="archive" />}>Archive</NavItem>
              </NavList>
            }
          >
            The chosen row of a list or of the navigation has the selection tint, stronger text and a short accent bar. One selection tint for each view.
          </Rule>
          <Rule
            id="R2"
            title="One accent"
            example={
              <>
                <Checkbox aria-label="Done" defaultChecked />
                <Switch aria-label="On" defaultChecked />
                <span className="text-sm text-accent">Today</span>
                <span className="text-sm text-ink-mute">2 days</span>
              </>
            }
          >
            The accent tells the eye where to look and what to click: the primary action, add actions, the current selection, what is on (checkbox, radio, switch, slider), the icons of the main views, progress, today and unread state, and focus. Everything else stays neutral, so the accent keeps its pull.
          </Rule>
          <Rule
            id="R3"
            title="One solid action"
            example={
              <>
                <Button size="sm">Save</Button>
                <Button size="sm" variant="outline">
                  Skip
                </Button>
                <Button size="sm" variant="ghost">
                  Cancel
                </Button>
              </>
            }
          >
            One solid primary button on each screen, and a solid red one to delete. Other actions are outline or text buttons.
          </Rule>
          <Rule id="R11" title="Tone" see={<See view="components" id="palettes">See the three tones</See>}>
            The default tone is Vivid: accent fills, selection and data colours more saturated. The settings offer Calm, Balanced and Vivid; each moves the accents, the selection, the data colours and the tint of the sidebar and lanes, so the three read apart at a glance.
          </Rule>
        </Rules>
      </Section>
      <Section id="guidelines-form" icon="layout" title="How things are drawn" note="Borders and shadows, counts and keys, icons, the scale and the data colours.">
        <Rules>
          <Rule
            id="R4"
            title="Border or shadow"
            example={
              <>
                <Input aria-label="Sample field" placeholder="Search by name" className="w-full" />
                <span className="rounded-lg bg-raised px-3 py-2 text-sm text-ink shadow-xs">A raised card</span>
              </>
            }
          >
            Inputs and outline buttons use a border; raised surfaces use a shadow. Never both on one element.
          </Rule>
          <Rule
            id="R5"
            title="Counts and keys"
            example={
              <>
                <NavList aria-label="Sample count" className="w-full">
                  <NavItem icon={<Icon name="notifications" />} end={<Count value={12} label="unread" />}>
                    Notifications
                  </NavItem>
                </NavList>
                <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
                  Commands <Kbd>Ctrl K</Kbd>
                </span>
              </>
            }
          >
            Counts are tabular numbers, pills on a navigation row (accent on the chosen one). Key hints are plain 12px text, hidden at phone widths.
          </Rule>
          <Rule id="R6" title="Icons are anchors" see={<See view="components" id="nav-list">See NavList</See>}>
            Every navigation item, section heading, menu entry and settings group has an icon from the icon pack the user chose in Settings. An empty slot keeps the alignment.
          </Rule>
          <Rule id="R7" title="One scale" see={<See view="components" id="tokens">See the tokens</See>}>
            Radii 4, 6 and 10px, or a theme's sharp 2/4/6 or round 6/10/14. Round shapes only for avatars, dots and switches. A 4px spacing grid, heights 36, 32 and 28px at normal density, icons 16 or 14px, weights 400, 500 and 600, text sizes from the tokens.
          </Rule>
          <Rule
            id="R10"
            title="Data colours are dots"
            example={DOTS.map(([name, color]) => (
              <span key={name} className="inline-flex items-center gap-1.5 text-sm text-ink">
                <span {...markHueAttrs(color)} data-mark-dot="" className="size-2 rounded-full bg-(--mark-dot)" />
                {name}
              </span>
            ))}
          >
            What the user colours (labels, events) appears as 8px dots, never as filled blocks. The colour picker is the one approved exception: there the colour is the content.
          </Rule>
        </Rules>
      </Section>
      <Section id="guidelines-access" icon="check" title="Readable, reachable, reversible" note="Focus, contrast, undo and the folds that keep a settings page short.">
        <Rules>
          <Rule
            id="R8"
            title="Focus ring"
            example={
              <Button size="sm" variant="outline" data-force="focus">
                Focused
              </Button>
            }
          >
            2px in the accent text colour with a 2px offset, at least 3:1 in every theme, on every control.
          </Rule>
          <Rule id="R9" title="Accent text">
            Accent text keeps 4.5:1 on both page surfaces in every theme.
          </Rule>
          <Rule id="R12" title="Undo" see={<See view="components" id="toasts">See Toasts</See>}>
            Toasts stack up to ten. Z, outside a text field, undoes the newest action still undoable, and each further Z undoes the one before, in time order.
          </Rule>
          <Rule id="R13" title="Advanced fold" see={<See view="practices" id="patterns">See the layout patterns</See>}>
            Every settings section shows only its essential choices; the rest sits under its own Advanced fold, closed by default.
          </Rule>
        </Rules>
      </Section>
      <Section id="guidelines-dos" icon="pin" title="Do and don't" note="The short version, to read before drawing anything new.">
        <div className="@container">
          <div className="grid gap-4 @3xl:grid-cols-3">
            <DoList icon="check" title="Do" items={DO} />
            <DoList icon="close" title="Never draw" items={NEVER_DRAW} />
            <DoList icon="close" title="Never add" items={NEVER_ADD} />
          </div>
        </div>
      </Section>
      <Section id="guidelines-numbers" icon="data" title="The numbers" note="Read from the code, so they are the ones in force: the densities, the corner shapes and the steps of the frame.">
        <div className="overflow-x-auto">
          <table className="w-full max-w-3xl text-sm">
            <caption className="sr-only">The measures of each density, in px</caption>
            <thead>
              <tr className="text-2xs text-ink-mute">
                <th scope="col" className="py-2 pe-4 text-start font-medium">Density</th>
                <th scope="col" className="py-2 pe-4 text-start font-medium">Controls (md / sm / xs)</th>
                <th scope="col" className="py-2 pe-4 text-start font-medium">Side padding</th>
                <th scope="col" className="py-2 pe-4 text-start font-medium">Row</th>
                <th scope="col" className="py-2 text-start font-medium">Row padding</th>
              </tr>
            </thead>
            <tbody>
              {DENSITIES.map((d) => (
                <tr key={d.id} className="border-t border-line text-ink-soft">
                  <th scope="row" className="py-2 pe-4 text-start font-medium text-ink">{d.label}</th>
                  <td className="py-2 pe-4 tabular-nums">{d.control.md} / {d.control.sm} / {d.control.xs}</td>
                  <td className="py-2 pe-4 tabular-nums">{d.pad.md} / {d.pad.sm} / {d.pad.xs}</td>
                  <td className="py-2 pe-4 tabular-nums">{d.row.height}</td>
                  <td className="py-2 tabular-nums">{d.row.pad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="@container">
          <dl className="grid gap-x-8 @xl:grid-cols-2">
            {(
              [
                ['Text', '12 to 16px in controls; 18, 20 and 24px for an app\'s titles; weights 400, 500 and 600.'],
                ['Corners', THEME_SHAPES.map((s) => `${s} ${SHAPE_RADII[s].join('/')}${s === DEFAULT_SHAPE ? ' (default)' : ''}`).join(', ') + '.'],
                ['Icons', '16px in controls, 14px in dense rows; data dots 8px.'],
                ['Contrast', 'Text 4.5:1; control borders and rings 3:1; in every theme.'],
                ['Focus ring', '2px wide, 2px offset, in the accent text colour.'],
                ['Touch', `With a coarse pointer every control and row is at least ${TOUCH_TARGET}px.`],
                ['Motion', '100 to 200 ms, never a spring; the tooltip waits 500 ms.'],
                ['Frame', `Inspector docked from ${APP_SHELL_STEPS.inspector}px, sidebar whole from ${APP_SHELL_STEPS.sidebar}px, a rail from ${APP_SHELL_STEPS.rail}px, a drawer under it.`],
              ] as const
            ).map(([term, text]) => (
              <div key={term} className="border-t border-line py-2">
                <dt className="text-sm font-medium text-ink">{term}</dt>
                <dd className="text-sm text-ink-soft">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>
      <Section id="guidelines-checks" icon="service" title="How the rules are kept" note="These run in CI on every push, beside the typecheck. An exception needs a comment above the line: design-check-ignore-next-line <rule>: <cause>.">
        <dl className="@container flex max-w-3xl flex-col">
          {CHECKS.map(([command, text]) => (
            <div key={command} className="grid gap-1 border-t border-line py-3 first:border-t-0 @2xl:grid-cols-[13rem_minmax(0,1fr)] @2xl:gap-4">
              <dt>
                <Code>{command}</Code>
              </dt>
              <dd className="text-sm text-ink-soft">{text}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </Page>
  )
}

/* ———— Practices ———— */

/** The seven regions of the frame, with when each one belongs there (docs/patterns.md). */
const REGIONS: readonly (readonly [string, string, string])[] = [
  ['titleBar', "The name of the place, the toolbar, the window's buttons", 'Never: it is where the user finds where they are'],
  ['status', 'The last result, one line', 'The app has notices for it (Toasts)'],
  ['sidebar', 'The places of the app, as rows with an icon', 'The app has one place, or three or four views (use tabs in the bar)'],
  ['content', 'What the app is for', 'Never'],
  ['inspector', 'The details or the form of the one thing selected', 'Nothing is ever selected'],
  ['actions', 'What can be done to the content, the main action last', 'The actions fit in the toolbar'],
  ['footer', 'The state of the service, counts, the keys that work now', 'There is nothing to say'],
]

/** The frame drawn as a diagram: its regions as quiet boxes, in the order they sit. */
function Anatomy() {
  const box = 'flex items-center justify-center text-2xs text-ink-mute'
  return (
    <div role="img" aria-label="The frame: a title bar on top, a sidebar at the start, the content with an inspector at its end, and the actions, then the footer, under it" data-sample="frame" className="flex h-64 w-full max-w-xl flex-col overflow-hidden rounded-lg border border-line bg-paper">
      <div className={cn(box, 'h-9 shrink-0 border-b border-line')}>titleBar</div>
      <div className="flex min-h-0 flex-1">
        <div className={cn(box, 'w-24 shrink-0 bg-sidebar-paper')}>sidebar</div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className={cn(box, 'h-6 shrink-0 border-b border-line')}>status</div>
          <div className="flex min-h-0 flex-1">
            <div className={cn(box, 'min-w-0 flex-1')}>content</div>
            <div className={cn(box, 'w-24 shrink-0 border-s border-line')}>inspector</div>
          </div>
          <div className={cn(box, 'h-7 shrink-0 border-t border-line')}>actions</div>
          <div className={cn(box, 'h-6 shrink-0 border-t border-line')}>footer</div>
        </div>
      </div>
    </div>
  )
}

/** A table of three columns, quiet: the head is small text, the rows are divided by lines. */
function Table({ caption, head, rows }: { caption: string; head: readonly [string, string, string]; rows: readonly (readonly [React.ReactNode, React.ReactNode, React.ReactNode])[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full max-w-4xl text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-2xs text-ink-mute">
            {head.map((h) => (
              <th key={h} scope="col" className="py-2 pe-4 text-start font-medium last:pe-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line align-top text-ink-soft">
              <th scope="row" className="py-2 pe-4 text-start font-medium text-ink">
                {row[0]}
              </th>
              <td className="py-2 pe-4">{row[1]}</td>
              <td className="py-2">{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const BAR_ADVICE = [
  <>Start the bar with the app (<Code>ToolbarBrand</Code>): a square in the accent with the initial of its name, and the name. It is how a user tells one window of the suite from another at a glance.</>,
  <>Say where the user is right after the app's name, with a chevron between them: «Mail › Settings» (<Code>ToolbarBrand page</Code>).</>,
  'Order: the app and the place, then room that moves the window, then find, then switches of the view, then actions, the solid one last.',
  'An action used many times a day is an icon alone with its name as a hint and its key. An action used rarely, or one whose icon nobody would guess, keeps its word, or goes in a menu.',
  'Two actions in one bar never share an icon. The magnifier is the search; the button that opens the command palette has another drawing (a prompt), or its word alone.',
  'A switch that is on says so with the selection tint. Do not use the solid variant for a switch.',
  'At most seven items in sight. More than that, group them or move the rare ones to a menu.',
]

const NARROW_ADVICE = [
  'Do not design a second app. The same regions give way in order: the inspector becomes a panel, the sidebar a rail and then a drawer, the words beside icons go (under 448px of toolbar), the title last.',
  "What the user needs to act never gives way: the solid action and the window's buttons stay at every width.",
  'With a finger every control is at least 44px (the toolkit does it); leave the key hints out on a phone.',
]

const AVOID = [
  'Two toolbars on one screen, or actions both in the toolbar and in an action bar.',
  'A modal inspector: the user loses the list they were choosing from.',
  'A sidebar that mixes places and actions. Rows are places; actions are buttons.',
  'Empty regions kept for symmetry. A frame with three regions is a good frame.',
]

/** The practices, with the layout gallery (`gallery`) where docs/patterns.md puts the four screens to start from. */
export function PracticesView({ gallery }: { gallery: React.ReactNode }) {
  return (
    <Page title="Practices" lead="How to put the parts together into a whole screen. These are recommendations, drawn from what works in the suite's apps: nothing here is checked by a program, and an app that has a reason does otherwise. The four screens to start from are shown live, at the widths where the frame changes.">
      <Section id="practices-frame" icon="layout" title="Start from the one frame" note="Use AppShell for the window of an app and fill in only the regions it needs. This showcase is built with it.">
        <Anatomy />
        <Table caption="The regions of the frame" head={['Region', 'Put there', 'Leave out when']} rows={REGIONS} />
        <Lines
          items={[
            "Let the frame measure itself. Its steps follow the window, so a window half-snapped on a wide screen is laid out as a narrow one. Pass steps only when a region of the app has another width.",
            'Keep one solid action in the window (R3). Where there is an action bar it is there, last; otherwise it is in the toolbar, last before the window\'s buttons.',
            <>Show the button that opens the sidebar only where the sidebar is a drawer (<Code>useAppShell().sidebar === 'drawer'</Code>).</>,
          ]}
        />
      </Section>
      <Section id="practices-bar" icon="settings" title="The title bar and its toolbar" note="The bar above this page follows them: the app, the four views as tabs, room, then two switches. On a narrow window the tabs move to the foot, as the practices below say.">
        <Lines items={BAR_ADVICE} />
      </Section>
      <Section id="practices-navigation" icon="structure" title="Navigation: which form" note="Every row has an icon (R6) so the rail needs no second design; the rows used most are the first group; a count is a pill at the end of the row (R5).">
        <Table
          caption="Forms of navigation"
          head={['Form', 'Fits', 'Built with']}
          rows={[
            ['Whole sidebar', 'Five places or more, or places with counts', 'Sidebar, SidebarGroup, NavItem'],
            ['Rail of icons', 'The same places, when the content needs the width', `Sidebar collapsed; the frame does it by itself from ${APP_SHELL_STEPS.rail}px to ${APP_SHELL_STEPS.sidebar}px`],
            ['Drawer', 'A narrow window or a phone', `Sidebar with open; the frame does it under ${APP_SHELL_STEPS.rail}px`],
            ['Tabs', 'Up to five views of the same weight', 'ToolbarTabs: in the bar, under it, or at the foot'],
          ]}
        />
      </Section>
      {gallery}
      <Section id="practices-narrow" icon="sidebarClose" title="Narrow windows and phones" note="The same app, not a second one.">
        <Lines items={NARROW_ADVICE} />
      </Section>
      <Section id="practices-avoid" icon="alert" title="What to avoid">
        <Lines items={AVOID} />
      </Section>
    </Page>
  )
}
