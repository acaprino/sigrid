// A window opened while a menu is still open: when the menu goes, it must not take the window along. Ark's layers
// close every layer opened after the one that closes; a modal window is not a part of the menu and stays, while a
// window opened from another window still goes with it.
import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test } from 'vitest'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Sheet, SheetContent, SheetTitle } from '../src/primitives'
import { ConfirmDialog, Dialog } from '../src/components'
import { settle } from './helpers'

type Kind = 'dialog' | 'confirm' | 'sheet'

/** A window by its name, whatever its role, also when a window above it hides it from the tree. */
const win = (name: string) =>
  screen.queryByRole('dialog', { name, hidden: true }) ?? screen.queryByRole('alertdialog', { name, hidden: true })

let closeMenu: () => void = () => {}

function Screen({ kind }: { kind: Kind }) {
  const [menu, setMenu] = useState(true)
  const [open, setOpen] = useState(true)
  closeMenu = () => setMenu(false)
  return (
    <>
      <DropdownMenu open={menu} onOpenChange={setMenu}>
        <DropdownMenuTrigger>More</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {kind === 'dialog' && (
        <Dialog open={open} onOpenChange={setOpen} title="New thing">
          <input aria-label="Name" />
        </Dialog>
      )}
      {kind === 'confirm' && <ConfirmDialog open={open} onOpenChange={setOpen} title="Delete it?" confirmLabel="Delete" onConfirm={() => {}} />}
      {kind === 'sheet' && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right">
            <SheetTitle>Details</SheetTitle>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}

for (const [kind, name] of [['dialog', 'New thing'], ['confirm', 'Delete it?'], ['sheet', 'Details']] as const) {
  test(`a ${kind} opened while a menu is open stays when the menu closes`, async () => {
    render(<Screen kind={kind} />)
    await settle(50)
    expect(win(name)).not.toBeNull()
    act(() => closeMenu())
    await settle(100)
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')).toBeNull()
    expect(win(name)).not.toBeNull()
  })
}

function Nested() {
  const [outer, setOuter] = useState(true)
  const [inner, setInner] = useState(true)
  closeMenu = () => setOuter(false)
  return (
    <Dialog open={outer} onOpenChange={setOuter} title="Outer">
      <Dialog open={inner} onOpenChange={setInner} title="Inner">
        <p>Inside</p>
      </Dialog>
    </Dialog>
  )
}

test('a window opened from another window still closes with it', async () => {
  render(<Nested />)
  await settle(50)
  expect(win('Inner')).not.toBeNull()
  act(() => closeMenu())
  await settle(100)
  expect(win('Outer')).toBeNull()
  expect(win('Inner')).toBeNull()
})
