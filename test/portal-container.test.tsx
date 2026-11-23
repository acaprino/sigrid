import { render, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Dialog } from '../src/components/Dialog'
import { PortalContainerProvider } from '../src/internal/portal-container'

// Part of an app drawn into another document (a popup window, an iframe): its overlays belong to that document.

it('a dialog inside a subtree drawn in another document opens in that document', async () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const other = frame.contentDocument!.body
  try {
    const view = render(<PortalContainerProvider container={other}><Dialog open onOpenChange={() => {}} title="Delete?">Content</Dialog></PortalContainerProvider>)
    await waitFor(() => expect(other.querySelector('[role="dialog"]')?.textContent).toContain('Delete?'))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    view.unmount()
  } finally {
    frame.remove()
  }
})

it('without a provider the dialog opens in the page', async () => {
  const view = render(<Dialog open onOpenChange={() => {}} title="Delete?">Content</Dialog>)
  await waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Delete?'))
  view.unmount()
})
