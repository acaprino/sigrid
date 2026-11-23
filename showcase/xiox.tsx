// Xiox, a cleaner for Windows, as it would be made with the toolkit: the example of the sheet frame (`AppShell
// frame="sheet"`), drawn after Imago's capture of Xiox's window (examples/demo/captures/smooth-light-over-bright.png in the
// Imago repository). The title bar and the sidebar sit on the window's ground; the work area is one sheet with a corner:
// a status row, a panel (`Panel`) with its filter, its search and the list, the inspector, the actions and the footer of
// keys. The content is made up. Xiox is a Windows program, so there is one host, a Tauri window on a computer.
// Left out on purpose: the acrylic of the real window (Sigrid has no glass) and ONI MODE.
import * as React from 'react'
import {
  AppShell,
  Badge,
  Button,
  Checkbox,
  Icon,
  Inspector,
  Kbd,
  NavItem,
  Panel,
  SearchField,
  Sidebar,
  SidebarGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
  ToggleGroupItem,
  ToolbarBrand,
  ToolbarButton,
  ToolbarSpacer,
  ToolbarTab,
  ToolbarTabs,
  colorTheme,
  type IconName,
} from '../src/index'
import { AppBar, Host, type AppProps } from './hosts'

/** Xiox's own theme: its amber (picked by eye from the capture, not measured). */
const THEME = colorTheme({ id: 'xiox', label: 'Xiox', color: '#8a5a12', spot: 'balanced' })

const SECTIONS = ['Cleanup', 'Registry', 'Developers'] as const

const CATEGORIES: readonly { id: string; name: string; note: string; size: string; icon: IconName }[] = [
  { id: 'system', name: 'System', note: '6 items · 4 selected', size: '11.29 GB', icon: 'settings' },
  { id: 'explorer', name: 'Explorer', note: '1 item · 0 selected', size: '180.0 MB', icon: 'structure' },
  { id: 'windows', name: 'Windows', note: '8 items · 0 selected', size: '21.21 GB', icon: 'layout' },
  { id: 'browser', name: 'Browser', note: '5 items · 2 selected', size: '1.54 GB', icon: 'link' },
  { id: 'dev', name: 'Development & AI', note: '4 items · 0 selected', size: '19.85 GB', icon: 'ai' },
  { id: 'apps', name: 'Applications', note: '44 items · 2 selected', size: '4.16 GB', icon: 'all' },
]

type Level = 'Recommended' | 'Caution' | 'Optional'
type Item = { id: string; name: string; note: string; level: Level; files: string; size: string; on: boolean; blocked?: string; path: string }
const ITEMS: readonly Item[] = [
  { id: 'ff', name: 'Mozilla Firefox – Cache', note: 'Pages and images Firefox saved to load faster', level: 'Recommended', files: '5,300', size: '1.50 GB', on: true, path: '%LOCALAPPDATA%\\Mozilla\\Firefox\\Profiles\\*\\cache2' },
  { id: 'cookies', name: 'Cookies', note: 'Sites in your keep list stay signed in', level: 'Caution', files: '6,410', size: '40.0 MB', on: true, path: '%APPDATA%\\Mozilla\\Firefox\\Profiles\\*\\cookies.sqlite' },
  { id: 'chrome', name: 'Google Chrome – Cache', note: 'Close Google Chrome to clean', level: 'Recommended', files: '—', size: '—', on: false, blocked: 'Close Google Chrome to clean', path: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\*\\Cache' },
  { id: 'hf', name: 'Hugging Face – Model cache', note: 'Models downloaded for local AI tools', level: 'Caution', files: '64', size: '14.00 GB', on: false, path: '%USERPROFILE%\\.cache\\huggingface' },
  { id: 'cargo', name: 'Cargo – Registry cache', note: 'Crates Cargo downloaded', level: 'Optional', files: '9,120', size: '3.25 GB', on: false, path: '%USERPROFILE%\\.cargo\\registry\\cache' },
  { id: 'npm', name: 'npm – Cache', note: 'Packages npm downloaded', level: 'Recommended', files: '18,340', size: '2.10 GB', on: false, path: '%LOCALAPPDATA%\\npm-cache' },
  { id: 'dns', name: 'DNS cache', note: 'Addresses of websites Windows remembers', level: 'Optional', files: '—', size: '0 B', on: false, path: 'ipconfig /flushdns' },
]

const LEVEL: Record<Level, 'secondary' | 'outline'> = { Recommended: 'secondary', Caution: 'secondary', Optional: 'outline' }

export function Xiox({ animated, density, look }: Pick<AppProps, 'animated' | 'density' | 'look'>) {
  const [section, setSection] = React.useState<string>('Cleanup')
  const [category, setCategory] = React.useState('windows')
  const [filter, setFilter] = React.useState('all')
  const [search, setSearch] = React.useState('')
  const [chosen, setChosen] = React.useState('chrome')
  const [details, setDetails] = React.useState(true)
  const [ticked, setTicked] = React.useState(() => new Set(ITEMS.filter((i) => i.on).map((i) => i.id)))
  const toggle = (id: string) =>
    setTicked((now) => {
      const next = new Set(now)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const shown = ITEMS.filter((i) => (filter === 'selected' ? ticked.has(i.id) : filter === 'caution' ? i.level === 'Caution' : true)).filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
  const item = ITEMS.find((i) => i.id === chosen)!

  const bar = (
    <>
      <ToolbarBrand name="Xiox" />
      <ToolbarTabs aria-label="Sections" value={section} onValueChange={setSection}>
        {SECTIONS.map((s) => (
          <ToolbarTab key={s} value={s}>{s}</ToolbarTab>
        ))}
      </ToolbarTabs>
      <ToolbarSpacer />
      <ToolbarButton label="Commands" variant="outline" icon={<Icon name="search" />} shortcut="Ctrl K" animated={animated}>
        Commands
      </ToolbarButton>
    </>
  )

  const sidebar = (
    <Sidebar aria-label="Categories">
      <SidebarGroup label="Categories" icon={<Icon name="labels" />}>
        {CATEGORIES.map((c) => (
          <NavItem key={c.id} icon={<Icon name={c.icon} />} current={category === c.id} description={c.note} end={<span className="text-2xs tabular-nums">{c.size}</span>} onClick={() => setCategory(c.id)}>
            {c.name}
          </NavItem>
        ))}
      </SidebarGroup>
    </Sidebar>
  )

  return (
    <Host device="desktop" host="native" animated={animated} theme={THEME} look={look} density={density} address="xiox" className="h-190 w-full max-w-300">
      <div className="h-full">
        <AppShell
          desktop
          frame="sheet"
          contentLabel={section}
          titleBar={<AppBar device="desktop" host="native" label="Xiox">{bar}</AppBar>}
          sidebar={sidebar}
          status={
            <>
              <Badge variant="secondary">Analysis done</Badge>
              <span className="text-ink-soft">13.48 GB to delete · 46,999 files</span>
              <span className="ms-auto">administrator · RAM 32 GB</span>
            </>
          }
          inspector={
            <Inspector title="Item" open={details} onOpenChange={setDetails} animated={animated} footer={<><Button variant="ghost" size="sm">Skip</Button><Button variant="outline" size="sm" disabled={Boolean(item.blocked)}>Clean</Button></>}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-ink-mute">Name</dt>
                <dd>{item.name}</dd>
                <dt className="text-ink-mute">Level</dt>
                <dd>{item.level}</dd>
                <dt className="text-ink-mute">Mode</dt>
                <dd>Permanently</dd>
                {item.blocked ? (
                  <>
                    <dt className="text-ink-mute">Blocked</dt>
                    <dd>{item.blocked}</dd>
                  </>
                ) : null}
                <dt className="text-ink-mute">Path</dt>
                <dd className="font-mono text-xs break-all">{item.path}</dd>
              </dl>
            </Inspector>
          }
          actions={
            <>
              <Button variant="outline" size="sm"><Icon name="refresh" />Analyze <Kbd>A</Kbd></Button>
              <Button size="sm">Clean {ticked.size} items <Kbd>↵</Kbd></Button>
            </>
          }
          footer={
            <>
              <span>Winapp2 260915 loaded · {ITEMS.length} items</span>
              <span className="ms-auto inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Kbd>↑↓</Kbd> move</span>
                <span className="inline-flex items-center gap-1"><Kbd>Space</Kbd> toggle</span>
                <span className="inline-flex items-center gap-1"><Kbd>↵</Kbd> clean</span>
              </span>
            </>
          }
        >
          <Panel
            title={section}
            subtitle={`${ITEMS.length} items · ${ticked.size} selected`}
            actions={
              <ToggleGroup aria-label="Show" value={filter} onValueChange={setFilter} animated={animated}>
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem value="selected">Selected</ToggleGroupItem>
                <ToggleGroupItem value="caution">Caution</ToggleGroupItem>
              </ToggleGroup>
            }
            tools={<SearchField value={search} onValueChange={setSearch} aria-label="Search this view" placeholder="Search this view" className="flex-1" />}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><span className="sr-only">Selected</span></TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead align="end">Files</TableHead>
                  <TableHead align="end">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((i) => (
                  <TableRow key={i.id} current={chosen === i.id} onClick={() => { setChosen(i.id); setDetails(true) }}>
                    <TableCell>
                      <Checkbox aria-label={`Clean «${i.name}»`} checked={ticked.has(i.id)} disabled={Boolean(i.blocked)} onCheckedChange={() => toggle(i.id)} />
                    </TableCell>
                    <TableCell>
                      <span className="block font-medium text-ink">{i.name}</span>
                      <span className="block text-2xs text-ink-mute">{i.note}</span>
                    </TableCell>
                    <TableCell><Badge variant={LEVEL[i.level]}>{i.level}</Badge></TableCell>
                    <TableCell align="end" className="whitespace-nowrap">{i.files}</TableCell>
                    <TableCell align="end" className="whitespace-nowrap">{i.size}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </AppShell>
      </div>
    </Host>
  )
}
