// The sections of the gallery for the tiling area and the menu on a thing: a workspace of panes and tabs whose content
// keeps its own state when a tab is moved (each tab counts up on its own, so a restart would show), and a list whose
// rows have a menu with the right button or the Menu key.
import * as React from 'react'
import { Workspace, addWorkspaceTab, type WorkspaceNode, type WorkspaceTab } from '../src/assemblies'
import { Button, Column, Cluster, Text } from '../src/primitives'
import { ContextMenu, ItemList, ItemRow, type ContextMenuEntry } from '../src/components'
import { Code, Row, Section } from './parts'

/** A tab with a life of its own: it counts the seconds it has been mounted, and a button that counts presses. */
function Session({ title }: { title: string }) {
  const [seconds, setSeconds] = React.useState(0)
  const [presses, setPresses] = React.useState(0)
  React.useEffect(() => {
    const timer = setInterval(() => setSeconds((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <Column gap="sm" pad="md">
      <Text as="p">{title}</Text>
      <Text as="p" variant="soft">
        Mounted for {seconds} s. A tab that is moved, or a pane divided around it, does not start again.
      </Text>
      <Cluster>
        <Button variant="outline" size="sm" onClick={() => setPresses((n) => n + 1)}>
          Pressed {presses}
        </Button>
      </Cluster>
    </Column>
  )
}

const START: WorkspaceNode = {
  kind: 'split',
  direction: 'horizontal',
  weights: [3, 2],
  children: [
    {
      kind: 'tabs',
      id: 'main',
      activeId: 'build',
      tabs: [
        { id: 'build', title: 'Build', icon: 'terminal' },
        { id: 'tests', title: 'Tests', icon: 'terminal' },
        { id: 'notes', title: 'Notes', icon: 'file', closable: false },
      ],
    },
    {
      kind: 'split',
      direction: 'vertical',
      weights: [1, 1],
      children: [
        { kind: 'tabs', id: 'logs', activeId: 'server', tabs: [{ id: 'server', title: 'Server log', icon: 'code' }] },
        { kind: 'tabs', id: 'shell', activeId: 'shell-1', tabs: [{ id: 'shell-1', title: 'Shell', icon: 'terminal' }] },
      ],
    },
  ],
}

export function Workspaces({ animated }: { animated: boolean }) {
  const [tree, setTree] = React.useState<WorkspaceNode>(START)
  const [maximized, setMaximized] = React.useState<string | null>(null)
  const [closing, setClosing] = React.useState<string | null>(null)
  const count = React.useRef(1)
  const [last, setLast] = React.useState('nothing yet')
  return (
    <Section
      id="workspace"
      title="Workspace and ContextMenu"
      note={
        <>
          A tiling area: panes in a split tree, each a group of tabs. The app keeps the tree (plain data, <Code>WorkspaceNode</Code>) and the area tells it each change; the content of a tab is drawn once, so moving it never restarts it. Drag a tab
          by its title: onto the strip of a pane to put it in order, onto the middle of a pane to join it, onto a side of a pane to divide it there; Escape drops it. Without a pointer: Shift+Arrow puts a tab earlier or later, Alt+Shift+Arrow
          divides its pane that way, Delete closes it, and the right button or the Menu key opens its menu. The dividers take the pointer and the arrow keys. A menu on a thing, <Code>ContextMenu</Code>, is on every row of the list below.
        </>
      }
    >
      <Row label="panes and tabs">
        <div data-sample="workspace" className="h-96 w-full max-w-5xl overflow-hidden rounded-lg border border-line">
          <Workspace
            tree={tree}
            onChange={setTree}
            label="Sessions"
            animated={animated}
            maximizedId={maximized}
            onMaximizedChange={setMaximized}
            onAddTab={(groupId) => {
              count.current += 1
              setTree((now) => addWorkspaceTab(now, groupId, { id: `shell-${count.current}`, title: `Shell ${count.current}`, icon: 'terminal' }))
            }}
            renderTab={(tab: WorkspaceTab) => <Session title={tab.title} />}
            tabMenu={(tab) => [{ label: `Mark ${tab.title}`, icon: 'pin', onSelect: () => setClosing(tab.title) }]}
          />
        </div>
        <Text as="p" variant="soft">
          {closing ? `Last menu action: Mark ${closing}.` : 'The first entries of a tab’s menu are the app’s.'}
        </Text>
      </Row>
      <Row label="a menu on a thing">
        <div data-sample="context-menu" className="w-full max-w-md">
          {/* One menu around the whole list: the row is read from the element pressed. */}
          <ContextMenu animated={animated} label="Actions for the session" items={(target) => rowMenu(target.closest('li')?.textContent ?? 'the session', setLast)}>
            <ItemList aria-label="Sessions with a menu">
              {['Plan the release', 'Review the diff', 'Write the notes'].map((title) => (
                <ItemRow key={title} title={title} onClick={() => setLast(`opened ${title}`)} />
              ))}
            </ItemList>
          </ContextMenu>
          <Text as="p" variant="soft">
            Right button or Menu key on a row; last action: {last}.
          </Text>
        </div>
      </Row>
    </Section>
  )
}

function rowMenu(title: string, say: (text: string) => void): ContextMenuEntry[] {
  return [
    { label: 'Open', icon: 'folderOpen', onSelect: () => say(`open ${title}`) },
    { label: 'Rename', icon: 'rename', shortcut: 'F2', onSelect: () => say(`rename ${title}`) },
    { label: 'Move to', icon: 'move', items: [{ label: 'Inbox', icon: 'inbox', onSelect: () => say(`${title} to the inbox`) }, { label: 'Archive', icon: 'archive', onSelect: () => say(`${title} to the archive`) }] },
    'separator',
    { label: 'Delete', icon: 'delete', destructive: true, shortcut: 'Del', onSelect: () => say(`delete ${title}`) },
  ]
}
