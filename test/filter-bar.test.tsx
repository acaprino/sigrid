// `FilterBar` and `FilterPopover` (`@acaprino/sigrid/components`): search, quick slot, structured rules,
// two-bound `between` inputs, focus recovery on rule removal, clear-all and `WordsProvider` localization.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { Button } from '../src/primitives'
import { FilterBar, FilterPopover, type FilterField, type FilterRule } from '../src/components'

const FIELDS: FilterField[] = [
  { id: 'status', label: 'Status', kind: 'select', options: [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }] },
  { id: 'title', label: 'Title', kind: 'text' },
  { id: 'amount', label: 'Amount', kind: 'number' },
]

describe('FilterBar', () => {
  test('renders search, quick, filters, actions and shows Clear filters only when active', () => {
    const onSearch = vi.fn()
    const onClearAll = vi.fn()
    const { rerender } = render(
      <FilterBar
        search={{ value: '', onChange: onSearch, label: 'Search orders' }}
        quick={<Button variant="outline">Last 7 days</Button>}
        actions={<Button variant="outline">Export</Button>}
        appliedCount={0}
        onClearAll={onClearAll}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search orders' }), { target: { value: 'acme' } })
    expect(onSearch).toHaveBeenCalledWith('acme')

    rerender(
      <FilterBar
        search={{ value: 'acme', onChange: onSearch, label: 'Search orders' }}
        appliedCount={2}
        onClearAll={onClearAll}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearAll).toHaveBeenCalledTimes(1)
  })
})

describe('FilterPopover', () => {
  test('adds, edits, removes (preserving focus) and applies filter rules, obeying WordsProvider', async () => {
    const onApply = vi.fn()
    const initial: FilterRule[] = [{ id: 'r1', field: 'title', operator: 'contains', value: 'bug' }]

    render(
      <WordsProvider words={{ filters: { label: 'Filtri', add: 'Aggiungi filtro', apply: 'Applica', clearAll: 'Azzera' } }}>
        <FilterPopover fields={FIELDS} rules={initial} onApply={onApply} />
      </WordsProvider>,
    )

    const trigger = screen.getByRole('button', { name: /Filtri/ })
    expect(trigger.textContent).toContain('1')
    fireEvent.click(trigger)

    await waitFor(() => expect(screen.getByDisplayValue('bug')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi filtro' }))
    expect(document.querySelectorAll('[data-slot="filter-rule"]')).toHaveLength(2)

    // Removing the second rule returns focus to the remaining rule's remove button rather than document.body.
    const removes = screen.getAllByRole('button', { name: 'Remove filter' })
    fireEvent.click(removes[1]!)
    expect(document.querySelectorAll('[data-slot="filter-rule"]')).toHaveLength(1)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove filter' }))

    fireEvent.change(screen.getByDisplayValue('bug'), { target: { value: 'urgent' } })
    const applyBtn = screen.getByRole('button', { name: 'Applica' })
    // Apply stays secondary so the non-modal popover never introduces a second solid primary button (R3).
    expect(applyBtn.getAttribute('data-variant')).toBe('secondary')
    fireEvent.click(applyBtn)

    expect(onApply).toHaveBeenCalledTimes(1)
    const applied = onApply.mock.calls[0]![0] as FilterRule[]
    expect(applied).toHaveLength(1)
    expect(applied[0]!.value).toBe('urgent')
  })

  test('renders both lower and upper bound inputs for the between operator on number fields', async () => {
    const onApply = vi.fn()
    const initial: FilterRule[] = [{ id: 'r1', field: 'amount', operator: 'between', value: '10', valueEnd: '50' }]
    render(<FilterPopover fields={FIELDS} rules={initial} onApply={onApply} />)

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    const from = (await screen.findByLabelText('From')) as HTMLInputElement
    const to = screen.getByLabelText('To') as HTMLInputElement
    expect(from.value).toBe('10')
    expect(to.value).toBe('50')

    fireEvent.change(from, { target: { value: '20' } })
    fireEvent.change(to, { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith([{ id: 'r1', field: 'amount', operator: 'between', value: '20', valueEnd: '80' }])
  })
})
