// The Examples view of the showcase: four apps of the suite as they would be made with the toolkit, two of them in each of
// their four hosts (a computer or a phone, a browser tab or a native app in Tauri), the other two as a native app on a
// computer. They are sketches with made-up content, close to the real apps and not copies of them: what they show is
// which parts make a whole app (`AppShell` and its regions, the bar, the lists, what opens), and what changes with the
// host and what does not. The apps are in ethel.tsx, qamille.tsx, shinatama.tsx and xiox.tsx, the hosts in hosts.tsx;
// nothing here is part of the package, and the toolkit itself still knows no app.
// `?device=phone&host=native` opens both examples in that host.
import * as React from 'react'
import { type DensityId } from '../src/index'
import { ToggleGroup, ToggleGroupItem } from '../src/primitives'
import { Ethel } from './ethel'
import { HOSTS, type AppProps, type Device, type HostKind, type Look } from './hosts'
import { Code, Page, Section } from './parts'
import { Qamille } from './qamille'
import { Shinatama } from './shinatama'
import { Xiox } from './xiox'

const params = new URLSearchParams(location.search)
const initialDevice: Device = params.get('device') === 'phone' ? 'phone' : 'desktop'
const initialHost: HostKind = params.get('host') === 'native' ? 'native' : 'web'

/** One app with the two pickers above it: on what, and in what. */
function Example({ name, animated, density, look, caveat, app: App }: { name: string; animated: boolean; density: DensityId; look: Look; caveat?: Partial<Record<Device, string>>; app: React.ComponentType<AppProps> }) {
  const [device, setDevice] = React.useState<Device>(initialDevice)
  const [host, setHost] = React.useState<HostKind>(initialHost)
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup aria-label={`${name}: device`} value={device} onValueChange={setDevice} animated={animated}>
          <ToggleGroupItem value="desktop">Computer</ToggleGroupItem>
          <ToggleGroupItem value="phone">Phone</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup aria-label={`${name}: host`} value={host} onValueChange={setHost} animated={animated}>
          <ToggleGroupItem value="web">Web</ToggleGroupItem>
          <ToggleGroupItem value="native">Native (Tauri)</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <p data-sample="host-advice" className="max-w-3xl text-sm text-ink-soft">
        {HOSTS[device][host]}
        {caveat?.[device] ? <> {caveat[device]}</> : null}
      </p>
      <div className="max-w-full overflow-x-auto p-1 pb-6">
        {/* A new host is a new run of the app: its state starts over, as it would. */}
        <App key={`${device}-${host}`} device={device} host={host} animated={animated} density={density} look={look} />
      </div>
    </>
  )
}

/** What the host changes, part by part: the same words as the README («Toolbar and title bar») and docs/patterns.md. */
const HOST_ROWS: readonly (readonly [string, React.ReactNode, React.ReactNode])[] = [
  ['The frame', <Code>{'<AppShell>'}</Code>, <><Code>{'<AppShell desktop>'}</Code> on a computer: chrome that is not selectable, the arrow cursor</>],
  ['The bar at the head', "The app's top bar and nothing more", <>It is the window's bar: <Code>dragProps</Code> for the host's drag mark, <Code>WindowControls</Code> at its end</>],
  ['What opens', 'Over the whole page', 'Under the title bar, so the window can still be moved and closed'],
  ["The browser's keys and menu", 'Left to the browser: reload, find, back', <>Taken away with <Code>useDesktopGuard()</Code>; a field keeps its own menu</>],
  ['The edges of a phone', 'The browser keeps the page clear of them', <>The frame keeps clear of them by itself (<Code>viewport-fit=cover</Code>, the device&apos;s insets, the foot at its maximum)</>],
  ['The height of a phone', <>What the browser&apos;s bars and the keyboard leave: the frame measures it (<Code>--app-height</Code>)</>, 'The whole screen, measured the same way'],
  ['What only the host can do', 'Nothing more than a page does', 'The place and size of the window between runs, an icon in the tray that keeps the app running, notices of the system, opening at sign-in'],
]

const SAME = [
  'The components, the theme, the density, the icons and the words: one tree of React for the four hosts.',
  'The layout: the frame measures itself, so a narrow window on a computer and a phone are laid out alike.',
  'The sizes of a finger: 44px with a coarse pointer, in a browser and in a native app.',
  "The keys of the app (Z to undo, R to reply, B for the Stack): they are the app's in every host that has a keyboard.",
]

export function ExamplesView({ animated, density, look }: { animated: boolean; density: DensityId; look: Look }) {
  return (
    <Page
      title="Examples"
      lead="Four apps of the suite as they would be made with the toolkit: Ethel, a to-do list, Qamille, a mail client, Shinatama, a workspace for terminal agents, and Xiox, a cleaner. Ethel and Qamille on a computer and on a phone, in a browser tab and as a native app in Tauri; Shinatama and Xiox only as a native app on a computer. They are sketches with made-up content, close to the real apps and not copies of them: they show which parts make a whole app, and what changes with the host."
    >
      <Section id="examples-ethel" icon="tasks" title="Ethel, a to-do list" note="One list to get through, one task at a time. On a computer the lists are the sidebar and the task chosen is in the inspector; on a phone the views are tabs at the foot, a task is a page, and adding is a sheet from the foot.">
        <Example name="Ethel" animated={animated} density={density} look={look} app={Ethel} caveat={{ phone: 'Ethel today is a Windows program and an installable web app: the phone in Tauri is drawn as it would be.' }} />
      </Section>
      <Section id="examples-qamille" icon="mail" title="Qamille, a mail client" note="Mail to read and to answer. On a computer the folders are the sidebar, the messages a column, and the one chosen is read beside it; on a phone the list is the screen, a message is a page, and writing is a sheet.">
        <Example name="Qamille" animated={animated} density={density} look={look} app={Qamille} caveat={{ phone: 'Qamille today is a Windows program with a preview on the web: the phone is drawn as it would be.' }} />
      </Section>
      <Section id="examples-shinatama" icon="threads" title="Shinatama, a workspace for terminal agents" note="A trial: what a desktop app with no UI code of its own needs from the toolkit. The bar, the sidebar, the inspector, the notice and the counts are the toolkit's; the terminal panes and their tiling are not in it. The places where the toolkit falls short are marked GAP in showcase/shinatama.tsx. It is drawn in the sheet frame, as the app is; the button beside the name opens and closes the Sessions panel, and the tabs of the pane switch between the files and the terminals.">
        <div className="max-w-full overflow-x-auto p-1 pb-6">
          <Shinatama animated={animated} density={density} look={look} />
        </div>
      </Section>
      <Section id="examples-xiox" icon="layout" title="Xiox, a cleaner: the sheet frame" note="The frame in its second form (AppShell frame=&quot;sheet&quot;): the title bar and the sidebar on the window's ground, the work area one sheet with a corner. The sections are tabs in the bar, the list is a Panel with its filter and its search, the details are the inspector, the actions and the keys are at the foot. The other examples use the default form, with lines.">
        <div className="max-w-full overflow-x-auto p-1 pb-6">
          <Xiox animated={animated} density={density} look={look} />
        </div>
      </Section>
      <Section id="examples-hosts"icon="layout" title="Web and native: what changes" note="The app is the same page in the four hosts. What changes is around it, and it is a few switches; the toolkit imports no shell, so the host is passed in from outside.">
        <div className="overflow-x-auto">
          <table className="w-full max-w-4xl text-sm">
            <caption className="sr-only">What the host changes</caption>
            <thead>
              <tr className="text-2xs text-ink-mute">
                {['', 'In a browser', 'Native, in Tauri'].map((h) => (
                  <th key={h} scope="col" className="py-2 pe-4 text-start font-medium last:pe-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOST_ROWS.map(([what, web, native]) => (
                <tr key={what} className="border-t border-line align-top text-ink-soft">
                  <th scope="row" className="py-2 pe-4 text-start font-medium text-ink">
                    {what}
                  </th>
                  <td className="py-2 pe-4">{web}</td>
                  <td className="py-2">{native}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">What stays the same</h3>
          <ul role="list" className="mt-2 flex max-w-prose flex-col">
            {SAME.map((line) => (
              <li key={line} className="border-t border-line py-2 text-sm text-ink-soft first:border-t-0">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </Page>
  )
}
