// F6 between the regions of the frame (`AppShell`): the title bar, the sidebar, the content and the inspector in turn,
// round again, Shift+F6 the other way; the focus lands on the place the user is in or the first thing that takes it,
// and a region that is closed is skipped. Nothing for the app to write.
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { AppShell, Inspector, NavItem, Sidebar, SidebarGroup, TitleBar, Toolbar, ToolbarButton } from '../src'

function Frame({ inspector = true }: { inspector?: boolean }) {
  return (
    <AppShell
      contentLabel="Messages"
      titleBar={
        <TitleBar>
          <Toolbar aria-label="Mail">
            <ToolbarButton label="New message">New</ToolbarButton>
          </Toolbar>
        </TitleBar>
      }
      sidebar={
        <Sidebar aria-label="Folders">
          <SidebarGroup>
            <NavItem>Drafts</NavItem>
            <NavItem current>Inbox</NavItem>
          </SidebarGroup>
        </Sidebar>
      }
      inspector={
        <Inspector title="Details" open={inspector}>
          <button type="button">Edit</button>
        </Inspector>
      }
    >
      <p>The list</p>
    </AppShell>
  )
}

const press = (shift = false) => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'F6', shiftKey: shift })
const focused = () => document.activeElement

test('F6 goes through the title bar, the sidebar (to the place the user is in), the content and the inspector, and round again', () => {
  render(<Frame />)
  press()
  expect(focused()).toBe(screen.getByRole('button', { name: 'New message' }))
  press()
  expect(focused()).toBe(screen.getByRole('button', { name: 'Inbox' }))
  press()
  expect(focused()).toBe(screen.getByRole('main', { name: 'Messages' }))
  press()
  expect(focused()).toBe(screen.getByRole('button', { name: 'Edit' }))
  press()
  expect(focused()).toBe(screen.getByRole('button', { name: 'New message' }))
})

test('Shift+F6 goes the other way, and a closed inspector is skipped', () => {
  const { rerender } = render(<Frame />)
  press()
  press(true)
  expect(focused()).toBe(screen.getByRole('button', { name: 'Edit' }))
  rerender(<Frame inspector={false} />)
  screen.getByRole('main', { name: 'Messages' }).focus()
  press()
  expect(focused()).toBe(screen.getByRole('button', { name: 'New message' }))
})
