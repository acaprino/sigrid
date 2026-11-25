// The panel (`Panel`): a header with a title, a line under it and tools at its end, a row of tools, a body that
// scrolls and a foot, as the content and the inspector of Imago's frame are laid out.
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Panel } from '../src/layout'

test('a panel is a region named by its title, with its parts in order', () => {
  render(
    <Panel title="Cleanup" subtitle="70 items · 8 selected" actions={<button type="button">All</button>} tools={<input aria-label="Search this view" />} footer={<button type="button">Clean</button>}>
      <p>The list</p>
    </Panel>,
  )
  const panel = screen.getByRole('region', { name: 'Cleanup' })
  expect(screen.getByRole('heading', { level: 2, name: 'Cleanup' })).toBeTruthy()
  const order = [...panel.querySelectorAll('[data-slot^="panel-"]')].map((part) => part.getAttribute('data-slot'))
  expect(order).toEqual(['panel-header', 'panel-title', 'panel-subtitle', 'panel-actions', 'panel-tools', 'panel-body', 'panel-footer'])
  expect(panel.querySelector('[data-slot="panel-body"]')?.textContent).toBe('The list')
})

test('the header and the foot stay out of the part that scrolls', () => {
  render(<Panel title="Item" footer={<button type="button">Clean</button>}>Body</Panel>)
  const body = document.querySelector('[data-slot="panel-body"]')!
  expect(body.contains(screen.getByRole('heading', { name: 'Item' }))).toBe(false)
  expect(body.contains(screen.getByRole('button', { name: 'Clean' }))).toBe(false)
})

test('a panel draws only the parts it is given, and its heading level can be lower', () => {
  render(<Panel title="Item" level={3}>Body</Panel>)
  expect(screen.getByRole('heading', { level: 3, name: 'Item' })).toBeTruthy()
  for (const slot of ['subtitle', 'actions', 'tools', 'footer']) expect(document.querySelector(`[data-slot="panel-${slot}"]`)).toBeNull()
})

test('the row of tools keeps 8px from the tools at the end of the header, which may be as tall as its row; without them it is as it was', () => {
  const tools = () => document.querySelector('[data-slot="panel-tools"]')!.className.split(' ')
  const { unmount } = render(<Panel title="Graph" actions={<button type="button">Gaps</button>} tools={<input aria-label="Search this view" />}>Body</Panel>)
  expect(tools()).toContain('pt-2')
  unmount()
  render(<Panel title="Graph" subtitle="6 nodes" tools={<input aria-label="Search this view" />}>Body</Panel>)
  expect(tools()).not.toContain('pt-2')
  expect(tools()).toContain('pb-2')
})
