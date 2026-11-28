// The canvas of the editor, on Puck (`@puckeditor/core`, MIT, a development dependency): the library gives the dragging
// between places, the selection, the outline and the history; what is dragged, where it may land and what it draws
// are the toolkit's and come from the catalogue (catalog.ts). Three things are made here:
// - the configuration of the library from the catalogue: each component with its fields as controls, each slot with
//   the list of what it takes, and the root, whose slots are the regions of `AppShell`;
// - what the canvas draws: the same `Frame` the run page uses (render.tsx), with a place to drop into where each
//   region is, and each component drawn from its description with the state it starts in. A place to drop into that is
//   inside a part of the toolkit (a `Column`, a `Cluster`, a `Card`) is a box of the library's that takes the layout of
//   that part (`INHERIT`), so what is dropped in is laid out as the run page lays it out;
// - the document of the canvas (an iframe, so the width of a phone is a real width for the stylesheet): the look of the
//   app is put on its root, and what a component opens mounts inside it.
import * as React from 'react'
import type { ComponentData, Config, Data, Field } from '@puckeditor/core'
import { MotionProvider, PortalContainerProvider, applyDensity, cn } from '../../src/index'
import { Column, Icon, Input, Page, Select, Textarea, ToggleGroup, ToggleGroupItem, type IconName } from '../../src/primitives'
import { FormField } from '../../src/components'
import { APP_SHELL_STEPS, Toolbar, appShellLayout } from '../../src/layout'
import { touchDensity } from '../phone'
import { BOX, CATALOG, GROUPS, ICON_OPTIONS, KINDS, defOf, docTitles, openDocs, takenBy, type BuildCtx, type FieldSpec, type Kind, type Props } from './catalog'
import { equals, flag, h, type Child, type Expr } from './ir'
import { applyLook } from './look'
import { hasRegion, type AppModel, type Node, type Screen } from './model'
import { DETAILS_PROPS, FRAME_OWN, bodyProps, isUnified, shownWhen, visible } from './plan'
import { Frame, draw, type HostKind } from './render'

/* ———— What the canvas is told by the editor around it ———— */

export type EditEnv = {
  app: AppModel
  screen: Screen
  host: HostKind
  /** The width of the frame on the canvas, in px. */
  width: number
  /** The frame is drawn with the sizes a finger gets. */
  touch: boolean
  /** On a narrow frame: the drawer and the panel of the details, shown over the content to be worked on. */
  menu: boolean
  details: boolean
  /**
   * In the sheet frame's one top row over a whole sidebar: the sidebar shrunk to its rail, and the row's button, which
   * works on the canvas so its place can be tried in both forms.
   */
  collapsed: boolean
  onCollapsed: (collapsed: boolean) => void
}
export const EditEnvContext = React.createContext<EditEnv | null>(null)
const useEnv = (): EditEnv => {
  const env = React.useContext(EditEnvContext)
  if (!env) throw new Error('The canvas is drawn outside the editor')
  return env
}

/* ———— From the app to the library's data, and back ———— */

/**
 * The slots of the root, each with the region whose components it takes: the regions every screen shares and the
 * three of the screen in sight. Their names are the words the outline shows, and they are listed from the foot of the
 * frame to its head, because the outline lists them the other way round.
 */
const ROOT_SLOTS = { Bottom: 'bottom', Footer: 'footer', Actions: 'actions', Details: 'content', Content: 'content', Status: 'status', Sidebar: 'sidebar', Tabs: 'tabs', Bar: 'bar' } as const
export type RootSlot = keyof typeof ROOT_SLOTS

/**
 * The slots of the root that the app and the screen have: a region the app does not have (a sidebar, the tabs) is
 * neither drawn nor listed in the outline. What it held stays in the app, for when it comes back.
 */
export function rootSlots(app: AppModel, screen: Screen): RootSlot[] {
  const has: Record<RootSlot, boolean> = {
    Bar: true,
    Tabs: hasRegion(app.settings, 'tabs'),
    Sidebar: hasRegion(app.settings, 'nav'),
    Status: screen.statusOn,
    Content: true,
    Details: screen.details === 'on',
    Actions: screen.actionsOn,
    Footer: hasRegion(app.settings, 'foot'),
    Bottom: hasRegion(app.settings, 'bottom'),
  }
  return (Object.keys(ROOT_SLOTS) as RootSlot[]).filter((slot) => has[slot])
}

export function toData(app: AppModel, screen: Screen): Data {
  const all: Record<RootSlot, Node[]> = { Bar: app.shared.bar, Tabs: app.shared.tabs, Sidebar: app.shared.nav, Footer: app.shared.foot, Bottom: app.shared.bottom, Content: screen.content, Status: screen.statusItems, Details: screen.detailsItems, Actions: screen.actions }
  const props = Object.fromEntries(rootSlots(app, screen).map((slot) => [slot, all[slot]]))
  return { root: { props: structuredClone(props) }, content: [], zones: {} } as unknown as Data
}

const plain = (value: unknown): Node[] => (Array.isArray(value) ? (value as ComponentData[]).map((item) => ({ type: item.type, props: Object.fromEntries(Object.entries(item.props).map(([key, v]) => [key, Array.isArray(v) && v.every((x) => typeof x === 'object' && x !== null && 'type' in x && 'props' in x) ? plain(v) : v])) })) : [])

/** The app with what the canvas holds now: the shared regions, and the regions of one screen. */
export function fromData(app: AppModel, screenId: string, data: Data): AppModel {
  const props = ((data.root as { props?: Record<string, unknown> }).props ?? {}) as Record<string, unknown>
  // A slot the canvas does not have keeps what the app holds there.
  const read = (slot: RootSlot, kept: Node[]): Node[] => (slot in props ? plain(props[slot]) : kept)
  return {
    ...app,
    shared: { bar: read('Bar', app.shared.bar), tabs: read('Tabs', app.shared.tabs), nav: read('Sidebar', app.shared.nav), foot: read('Footer', app.shared.foot), bottom: read('Bottom', app.shared.bottom) },
    screens: app.screens.map((s) => (s.id === screenId ? { ...s, content: read('Content', s.content), statusItems: read('Status', s.statusItems), detailsItems: read('Details', s.detailsItems), actions: read('Actions', s.actions) } : s)),
  }
}

/* ———— The fields of a component, as the library's controls ———— */

const YES_NO = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
]
const SHOW: Field = { type: 'radio', label: 'Shown', options: [{ label: 'Always', value: 'always' }, { label: 'Narrow only', value: 'narrow' }, { label: 'Wide only', value: 'wide' }] }

function fieldOf(spec: FieldSpec, screens: AppModel['screens']): Field {
  switch (spec.kind) {
    case 'text':
      return { type: 'text', label: spec.label, ...(spec.placeholder ? { placeholder: spec.placeholder } : {}) }
    case 'area':
      return { type: 'textarea', label: spec.label }
    case 'number':
      return { type: 'number', label: spec.label, ...(spec.min !== undefined ? { min: spec.min } : {}), ...(spec.max !== undefined ? { max: spec.max } : {}) }
    case 'choice':
      return { type: 'radio', label: spec.label, options: spec.options.map(([value, label]) => ({ value, label })) }
    case 'select':
      return { type: 'select', label: spec.label, options: spec.options.map(([value, label]) => ({ value, label })) }
    case 'toggle':
      return { type: 'radio', label: spec.label, options: YES_NO }
    case 'icon':
      return { type: 'custom', label: spec.label, render: IconField }
    case 'action':
      return {
        type: 'select',
        label: spec.label,
        options: [{ value: 'none', label: 'Nothing' }, ...screens.map((s) => ({ value: `go:${s.id}`, label: `Go to «${s.name}»` })), { value: 'menu', label: 'Open the menu' }, { value: 'show', label: 'Show the details' }, { value: 'details', label: 'Show or hide the details' }, { value: 'say', label: 'Show a notice' }, { value: 'job', label: 'Run the job' }],
      }
    case 'rows':
      return {
        type: 'array',
        label: spec.label,
        arrayFields: Object.fromEntries(Object.entries(spec.of).map(([key, of]) => [key, fieldOf(of, screens)])),
        defaultItemProps: { ...spec.fresh },
        getItemSummary: (item: Record<string, unknown>, index?: number) => (typeof item[spec.named] === 'string' && item[spec.named] ? (item[spec.named] as string) : `${spec.label} ${(index ?? 0) + 1}`),
      }
    case 'slot':
      return { type: 'slot', label: spec.label, allow: takenBy(spec.takes) }
  }
}

/** The icon of a component: its drawing, and the list of every icon Sigrid draws. */
function IconField({ value, onChange, field }: { value: unknown; onChange: (value: string) => void; field: { label?: string } }) {
  const chosen = typeof value === 'string' ? value : 'none'
  return (
    <FormField label={field.label ?? 'Icon'}>
      <IconSelect value={chosen} onValueChange={onChange} />
    </FormField>
  )
}

function IconSelect({ value, onValueChange, ...props }: { value: string; onValueChange: (value: string) => void; id?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="flex size-(--control-md) shrink-0 items-center justify-center rounded-md bg-ink/6 text-ink [&_svg]:size-4">
        {value === 'none' ? null : <Icon name={value as IconName} />}
      </span>
      <Select {...props} options={ICON_OPTIONS.map(([v, label]) => ({ value: v, label }))} value={value} onValueChange={onValueChange} className="min-w-0 flex-1" />
    </div>
  )
}

/* ———— The library's own controls, replaced by the toolkit's: the editor is made of the parts it edits ———— */

type Options = readonly { label: string; value: unknown }[]
type ControlProps = { field: { label?: string; placeholder?: string; options?: Options; min?: number; max?: number }; value: unknown; onChange: (value: never) => void; id?: string; readOnly?: boolean }
const set = (onChange: ControlProps['onChange'], value: unknown) => (onChange as (value: unknown) => void)(value)

// The library types a control by the kind of its field; here one loose shape serves the five kinds replaced.
export const FIELD_CONTROLS: Record<string, React.FunctionComponent<any>> = {
  text: ({ field, value, onChange, readOnly }: ControlProps) => (
    <FormField label={field.label ?? ''}>
      <Input value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} readOnly={readOnly} autoComplete="off" onChange={(event) => set(onChange, event.target.value)} />
    </FormField>
  ),
  textarea: ({ field, value, onChange, readOnly }: ControlProps) => (
    <FormField label={field.label ?? ''}>
      <Textarea value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} readOnly={readOnly} onChange={(event) => set(onChange, event.target.value)} />
    </FormField>
  ),
  number: ({ field, value, onChange, readOnly }: ControlProps) => (
    <FormField label={field.label ?? ''}>
      <Input type="number" value={typeof value === 'number' ? value : ''} min={field.min} max={field.max} readOnly={readOnly} onChange={(event) => set(onChange, event.target.value === '' ? 0 : Number(event.target.value))} />
    </FormField>
  ),
  select: ({ field, value, onChange }: ControlProps) => {
    const options = field.options ?? []
    const at = options.findIndex((option) => option.value === value)
    return (
      <FormField label={field.label ?? ''}>
        <Select options={options.map((option, index) => ({ value: String(index), label: option.label }))} value={String(Math.max(at, 0))} onValueChange={(index) => set(onChange, options[Number(index)]?.value)} />
      </FormField>
    )
  },
  radio: ({ field, value, onChange }: ControlProps) => {
    const options = field.options ?? []
    const at = options.findIndex((option) => option.value === value)
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{field.label}</span>
        <ToggleGroup aria-label={field.label ?? 'Choice'} value={String(at)} onValueChange={(index) => set(onChange, options[Number(index)]?.value)} className="w-full flex-wrap">
          {options.map((option, index) => (
            <ToggleGroupItem key={option.label} value={String(index)} className="min-w-0 flex-1 px-2">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    )
  },
}

/* ———— What the canvas draws ———— */

const fixed = (value: unknown): Expr => ({ $expr: '', run: () => value })
const NOTHING: Expr = { $expr: '', run: () => () => {} }

type SlotComponent = React.ComponentType<Record<string, unknown>>

/**
 * The box of a place to drop into, inside a part of the toolkit: it takes the part's own layout (a pile, a row that
 * wraps, a grid and its columns, the gap), as wide as the part, so the components dropped in sit as in the app.
 */
const INHERIT = 'col-span-full w-full min-w-0 [display:inherit] [flex-direction:inherit] [flex-wrap:inherit] [align-items:inherit] [justify-content:inherit] [grid-template-columns:inherit] [gap:inherit]'

/** One component on the canvas: drawn from its description as it starts, in a box the library drags it by. */
function Part({ kind, puck, ...props }: Props & { kind: Kind; puck: { dragRef: ((element: Element | null) => void) | null } }) {
  const env = useEnv()
  const def = defOf(kind)
  const narrow = env.width < APP_SHELL_STEPS.rail
  const ctx: BuildCtx = {
    appName: env.app.name,
    details: env.app.screens.some((screen) => screen.details === 'on'),
    job: env.app.screens.some((screen) => screen.statusOn && screen.statusItems.some((node) => node.type === 'Job')),
    noDetails: env.app.screens.some((screen) => screen.details !== 'on') ? fixed(env.screen.details !== 'on') : undefined,
    screens: env.app.screens,
    screenName: fixed(env.screen.name),
    // On the canvas nothing runs: a value is what it starts as, and a press selects the component.
    state: (hint, initial) => ({ value: fixed(initial), set: NOTHING, name: hint, setter: hint }),
    box: (slot, tag, own) => h(tag, own, { $slot: props[slot] as SlotComponent, props: { className: INHERIT, minEmptyHeight: 48 } }),
    spread: (slot, as) => [{ $slot: props[slot] as SlotComponent, props: { className: as, minEmptyHeight: 40 } }],
    act: () => undefined,
    current: (action) => (typeof action === 'string' && action.startsWith('go:') ? equals('screen', action.slice(3)) : undefined),
  }
  const drawn: Child = def.build(props, ctx)
  const when = shownWhen(props['show'])
  // A job runs only in the app; a Job can be shown running here, at an even 40%.
  const running = flag(props['preview'])
  // Document tabs show the documents they open with, the first one chosen; pressing them changes nothing here.
  const docs = kind === 'DocTabs' ? openDocs(docTitles(props)) : []
  const scope = { screen: env.screen.id, narrow, details: env.details, busy: running, job: running ? 40 : null, docs, activeDoc: docs[0]?.id ?? null, setActiveDoc: () => {}, addDoc: () => {}, closeDoc: () => {} }
  // A component that this width hides stays on the canvas, faint, so it can still be chosen and set; so does a part of
  // the bar that the one top row draws itself (the app is its head, the drawer's button its own).
  const hidden = (when !== null && !when.run(scope)) || (isUnified(env.app.settings) && FRAME_OWN.includes(kind))
  return (
    <div ref={puck.dragRef} data-part={kind} data-hidden-here={hidden ? '' : undefined} className={cn(def.box ? def.box(props) : BOX, hidden && 'opacity-40')}>
      {draw(drawn, scope)}
    </div>
  )
}

type RootProps = Partial<Record<RootSlot, SlotComponent>>

/** The frame of the app on the canvas: every region that is there at this width is a place to drop into. */
function Root({ Bar, Tabs, Sidebar: Nav, Footer: Foot, Bottom, Content, Status, Details, Actions }: RootProps) {
  const env = useEnv()
  const { app, screen } = env
  const layout = appShellLayout(env.width)
  const narrow = env.width < APP_SHELL_STEPS.rail
  const row = 'flex min-w-0 flex-1 items-center self-stretch'
  // The tabs are one place to drop into: in a toolbar of views, as the app has them, unless it holds document tabs,
  // which are a tablist of their own and never in a toolbar.
  const docTabs = app.shared.tabs.some((node) => node.type === 'DocTabs')
  // In the one top row the tabs and the tools at its end are as wide as what they hold: empty, they keep some room to
  // drop into.
  const roomy = isUnified(app.settings) ? 'min-w-16' : undefined
  const tabs = Tabs && visible(app.settings.tabs, narrow) ? <Tabs className={cn(row, 'gap-1', roomy)} minEmptyHeight={32} /> : null
  // A screen that fits is the toolkit's `Page fit` here too: the place to drop into is its body, which gives way.
  return (
    <div data-canvas-frame="" className="h-dvh bg-paper text-ink">
      <Frame
        edit={layout}
        name={app.name}
        settings={app.settings}
        screen={screen}
        host={env.host}
        narrow={narrow}
        bar={Bar ? <Bar className={cn(row, 'gap-1', roomy)} minEmptyHeight={32} /> : null}
        tabs={tabs && !docTabs ? <Toolbar aria-label="Views">{tabs}</Toolbar> : tabs}
        status={Status && screen.statusOn ? <Status className={cn(row, 'gap-3')} minEmptyHeight={24} /> : null}
        nav={Nav && visible(app.settings.sidebar, narrow) ? <Nav className="flex flex-col" minEmptyHeight={64} /> : null}
        foot={Foot && visible(app.settings.foot, narrow) ? <Foot className={cn(row, 'gap-3')} minEmptyHeight={20} /> : null}
        bottom={Bottom && visible(app.settings.bottom, narrow) ? <Bottom className={cn(row, 'gap-1')} minEmptyHeight={40} /> : null}
        content={
          Content ? (
            screen.fit ? (
              <Page fit>
                <Content className={INHERIT} minEmptyHeight={160} />
              </Page>
            ) : (
              <Column {...bodyProps(screen)}>
                <Content className={INHERIT} minEmptyHeight={160} />
              </Column>
            )
          ) : null
        }
        details={
          Details && screen.details === 'on' ? (
            <Column {...DETAILS_PROPS}>
              <Details className={INHERIT} minEmptyHeight={120} />
            </Column>
          ) : null
        }
        actions={Actions && screen.actionsOn ? <Actions className={cn(row, 'justify-end gap-2')} minEmptyHeight={36} /> : null}
        menu={env.menu}
        onMenu={() => {}}
        detailsOpen={layout.inspector === 'docked' || env.details}
        onDetails={() => {}}
        collapsed={env.collapsed}
        onCollapsed={env.onCollapsed}
      />
    </div>
  )
}

/**
 * The list of components, in its groups: every component, or with a word to find only those whose name or sentence
 * holds it. A group with nothing left is not listed.
 */
export function paletteOf(find: string): Record<string, { title: string; components: Kind[]; visible: boolean; expanded: boolean }> {
  const word = find.trim().toLowerCase()
  const found = (kind: Kind) => word === '' || `${CATALOG[kind].label} ${CATALOG[kind].about}`.toLowerCase().includes(word)
  return Object.fromEntries(
    GROUPS.map((group) => {
      const kinds = KINDS.filter((kind) => CATALOG[kind].group === group && found(kind))
      return [group, { title: group, components: kinds, visible: kinds.length > 0, expanded: true }]
    }),
  )
}

/**
 * The library's configuration: the catalogue, with the screens of this app as the places an action can go to, and the
 * regions the app and the screen in sight have as the slots of the root.
 */
export function configOf(screens: AppModel['screens'], slots: readonly RootSlot[]): Config {
  const components = Object.fromEntries(
    KINDS.map((kind) => {
      const def = defOf(kind)
      const fields: Record<string, Field> = { ...Object.fromEntries(Object.entries(def.fields).map(([key, spec]) => [key, fieldOf(spec, screens)])), show: SHOW }
      return [
        kind,
        {
          label: def.label,
          inline: true,
          fields,
          // A field that the others make pointless is not offered: the words of a notice, where a press shows none.
          resolveFields: (item: { props: Props }) => Object.fromEntries(Object.entries(fields).filter(([key]) => def.fields[key]?.only?.(item.props) ?? true)),
          defaultProps: { ...structuredClone(def.fresh), show: 'always' },
          render: (props: Record<string, unknown>) => <Part {...(props as Props & { puck: { dragRef: null } })} kind={kind} />,
        },
      ]
    }),
  )
  const categories = { ...paletteOf(''), other: { visible: false } }
  return {
    components,
    categories,
    root: {
      fields: Object.fromEntries(slots.map((slot) => [slot, { type: 'slot', allow: takenBy(ROOT_SLOTS[slot]) }])),
      render: (props: Record<string, unknown>) => <Root {...(props as unknown as RootProps)} />,
    },
  } as unknown as Config
}

/* ———— The document of the canvas ———— */

/**
 * Around everything the canvas draws, with the canvas's own document: the look of the app goes on its body (and, for
 * a phone, the sizes a finger gets), and what a component opens mounts in a layer of that document.
 */
export function CanvasDocument({ children, document: doc }: { children: React.ReactNode; document?: Document }) {
  const env = useEnv()
  const [layer, setLayer] = React.useState<HTMLElement | null>(null)
  const look = env.app.look
  React.useLayoutEffect(() => {
    if (!doc) return
    // On the body, not on the root: the library copies the attributes of the editor's own root onto the root of the
    // canvas as they change, and the editor has another theme (the gray baseline) than the app.
    applyLook(doc.body, look)
    if (env.touch) applyDensity(doc.body, touchDensity(look.density))
  }, [doc, look, env.touch])
  React.useLayoutEffect(() => {
    if (!doc) return
    const el = doc.createElement('div')
    el.setAttribute('data-canvas-layer', '')
    doc.body.appendChild(el)
    setLayer(el)
    return () => el.remove()
  }, [doc])
  return (
    <MotionProvider animated={false}>
      <PortalContainerProvider container={layer}>{children}</PortalContainerProvider>
    </MotionProvider>
  )
}
