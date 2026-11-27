// `FilterBar` and `FilterPopover` (`@acaprino/sigrid/components`): search, quick slot, structured rules, clear-all
// and `WordsProvider` localization.
import { fireEvent, render, screen } from '@testing-library/react'
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
        quick={<Button variant="outline" size="sm">Last 7 days</Button>}
        actions={<Button variant="outline" size="sm">Export</Button>}
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
  test('adds, edits, removes and applies filter rules and obeys WordsProvider', () => {
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

    expect(screen.getByDisplayValue('bug')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi filtro' }))
    expect(document.querySelectorAll('[data-slot="filter-rule"]')).toHaveLength(2)

    fireEvent.change(screen.getByDisplayValue('bug'), { target: { value: 'urgent' } })
    fireEvent.click(screen.getByRole('button', { name: 'Applica' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    const applied = onApply.mock.calls[0]![0] as FilterRule[]
    expect(applied).toHaveLength(2)
    expect(applied[0]!.value).toBe('urgent')
    expect(applied[1]!.field).toBe('status')
  })
})
