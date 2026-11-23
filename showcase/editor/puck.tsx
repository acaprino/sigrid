// The canvas of the editor, on Puck (`@puckeditor/core`, MIT, a development dependency): the library gives the dragging
// between places, the selection, the outline and the history; what is dragged, where it may land and what it draws
// are the toolkit's and come from the catalogue (catalog.ts). Three things are made here:
// - the configuration of the library from the catalogue: each component with its fields as controls, each slot with
//   the list of what it takes, and the root, whose slots are the regions of `AppShell`;
// - what the canvas draws: the same `Frame` the run page uses (render.tsx), with a place to drop into where each
//   region is, and each component drawn from its description with the state it starts in;
// - the document of the canvas (an iframe, so the width of a phone is a real width for the stylesheet): the look of the
//   app is put on its root, and what a component opens mounts inside it.
import * as React from 'react'
import type { ComponentData, Config, Data, Field } from '@puckeditor/core'
import { APP_SHELL_STEPS, FormField, Icon, IconPackProvider, Input, MotionProvider, PortalContainerProvider, Select, Textarea, ToggleGroup, ToggleGroupItem, appShellLayout, applyDensity, cn, type IconName } from '../../src/index'
import { touchDensity } from '../phone'
import { BOX, CATALOG, GROUPS, ICON_OPTIONS, KINDS, defOf, takenBy, type BuildCtx, type FieldSpec, type Kind, type Props } from './catalog'
import { equals, type Child, type Expr } from './ir'
import { applyLook } from './look'
import type { AppModel, Node, Screen } from './model'
import { DETAILS_CLASS, contentClass, shownWhen, visible } from './plan'
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
const ROOT_SLOTS = { Bottom: 'bottom', Footer: 'footer', Actions: 'actions', Details: 'content', Content: 'content', Sidebar: 'sidebar', Tabs: 'tabs', Bar: 'bar' } as const

export function toData(app: AppModel, screen: Screen): Data {
  const props: Record<keyof typeof ROOT_SLOTS, Node[]> = { Bar: app.shared.bar, Tabs: app.shared.tabs, Sidebar: app.shared.nav, Footer: app.shared.foot, Bottom: app.shared.bottom, Content: screen.content, Details: screen.detailsItems, Actions: screen.actions }
  return { root: { props: structuredClone(props) }, content: [], zones: {} } as unknown as Data
}

const plain = (value: unknown): Node[] => (Array.isArray(value) ? (value as ComponentData[]).map((item) => ({ type: item.type, props: Object.fromEntries(Object.entries(item.props).map(([key, v]) => [key, Array.isArray(v) && v.every((x) => typeof x === 'object' && x !== null && 'type' in x && 'props' in x) ? plain(v) : v])) })) : [])

/** The app with what the canvas holds now: the shared regions, and the regions of one screen. */
export function fromData(app: AppModel, screenId: string, data: Data): AppModel {
  const props = ((data.root as { props?: Record<string, unknown> }).props ?? {}) as Record<string, unknown>
  return {
    ...app,
    shared: { bar: plain(props['Bar']), tabs: plain(props['Tabs']), nav: plain(props['Sidebar']), foot: plain(props['Footer']), bottom: plain(props['Bottom']) },
    screens: app.screens.map((s) => (s.id === screenId ? { ...s, content: plain(props['Content']), detailsItems: plain(props['Details']), actions: plain(props['Actions']) } : s)),
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
        options: [{ value: 'none', label: 'Nothing' }, ...screens.map((s) => ({ value: `go:${s.id}`, label: `Go to «${s.name}»` })), { value: 'menu', label: 'Open the menu' }, { value: 'show', label: 'Show the details' }, { value: 'details', label: 'Show or hide the details' }, { value: 'say', label: 'Show a notice' }],
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

/** The icon of a component: its drawing, and the list of every icon the packs draw. */
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

/** One component on the canvas: drawn from its description as it starts, in a box the library drags it by. */
function Part({ kind, puck, ...props }: Props & { kind: Kind; puck: { dragRef: ((element: Element | null) => void) | null } }) {
  const env = useEnv()
  const def = defOf(kind)
  const narrow = env.width < APP_SHELL_STEPS.rail
  const ctx: BuildCtx = {
    appName: env.app.name,
    screens: env.app.screens,
    screenName: fixed(env.screen.name),
    // On the canvas nothing runs: a value is what it starts as, and a press selects the component.
    state: (hint, initial) => ({ value: fixed(initial), set: NOTHING, name: hint, setter: hint }),
    box: (slot, tag, own) => ({ $slot: props[slot] as SlotComponent, props: { as: tag, ...own, minEmptyHeight: 48 } }),
    spread: (slot, as) => [{ $slot: props[slot] as SlotComponent, props: { className: as, minEmptyHeight: 40 } }],
    act: () => undefined,
    current: (action) => (typeof action === 'string' && action.startsWith('go:') ? equals('screen', action.slice(3)) : undefined),
  }
  const drawn: Child = def.build(props, ctx)
  const when = shownWhen(props['show'])
  const scope = { screen: env.screen.id, narrow, details: env.details }
  // A component that this width hides stays on the canvas, faint, so it can still be chosen and set.
  const hidden = when !== null && !when.run(scope)
  return (
    <div ref={puck.dragRef} data-part={kind} data-hidden-here={hidden ? '' : undefined} className={cn(def.box ? def.box(props) : BOX, hidden && 'opacity-40')}>
      {draw(drawn, scope)}
    </div>
  )
}

type RootProps = Record<keyof typeof ROOT_SLOTS, SlotComponent>

/** The frame of the app on the canvas: every region that is there at this width is a place to drop into. */
function Root({ Bar, Tabs, Sidebar: Nav, Footer: Foot, Bottom, Content, Details, Actions }: RootProps) {
  const env = useEnv()
  const { app, screen } = env
  const layout = appShellLayout(env.width)
  const narrow = env.width < APP_SHELL_STEPS.rail
  const row = 'flex min-w-0 flex-1 items-center self-stretch'
  return (
    <div data-canvas-frame="" className="h-dvh bg-paper text-ink">
      <Frame
        edit={layout}
        name={app.name}
        settings={app.settings}
        screen={screen}
        host={env.host}
        narrow={narrow}
        bar={<Bar className={cn(row, 'gap-1')} minEmptyHeight={32} />}
        tabs={visible(app.settings.tabs, narrow) ? <Tabs className={cn(row, 'gap-1')} minEmptyHeight={32} /> : null}
        nav={visible(app.settings.sidebar, narrow) ? <Nav className="flex flex-col" minEmptyHeight={64} /> : null}
        foot={visible(app.settings.foot, narrow) ? <Foot className={cn(row, 'gap-3')} minEmptyHeight={20} /> : null}
        bottom={visible(app.settings.bottom, narrow) ? <Bottom className={cn(row, 'gap-1')} minEmptyHeight={40} /> : null}
        content={<Content className={contentClass(screen)} minEmptyHeight={160} />}
        details={screen.details === 'on' ? <Details className={DETAILS_CLASS} minEmptyHeight={120} /> : null}
        actions={screen.actionsOn ? <Actions className={cn(row, 'justify-end gap-2')} minEmptyHeight={36} /> : null}
        menu={env.menu}
        onMenu={() => {}}
        detailsOpen={layout.inspector === 'docked' || env.details}
        onDetails={() => {}}
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

/** The library's configuration: the catalogue, with the screens of this app as the places an action can go to. */
export function configOf(screens: AppModel['screens']): Config {
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
      fields: Object.fromEntries(Object.entries(ROOT_SLOTS).map(([slot, region]) => [slot, { type: 'slot', allow: takenBy(region) }])),
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
      <IconPackProvider pack={look.icons}>
        <PortalContainerProvider container={layer}>{children}</PortalContainerProvider>
      </IconPackProvider>
    </MotionProvider>
  )
}
