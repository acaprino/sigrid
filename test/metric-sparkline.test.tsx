// `Sparkline` and `Metric` (`@acaprino/sigrid/components`): zero-dependency trend lines and KPI cards.
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Button } from '../src/primitives'
import { Metric, Sparkline } from '../src/components'

describe('Sparkline', () => {
  test('renders an accessible SVG trend line with optional flat area and last-point dot', () => {
    const { container } = render(<Sparkline values={[10, 14, 12, 18, 22]} label="Daily signups" area highlightLast />)
    const svg = screen.getByRole('img', { name: 'Daily signups' })
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(container.querySelectorAll('path')).toHaveLength(2)
    expect(container.querySelector('circle')).toBeTruthy()
    expect(container.querySelector('linearGradient')).toBeNull()
  })

  test('returns null with fewer than two finite values and handles flat series without NaN', () => {
    const { container, rerender } = render(<Sparkline values={[42]} label="Single" />)
    expect(container.firstChild).toBeNull()

    rerender(<Sparkline values={[5, 5, 5]} label="Flat" />)
    const d = container.querySelector('path')?.getAttribute('d') ?? ''
    expect(d).not.toContain('NaN')
    expect(d).toContain('M')
  })
})

describe('Metric', () => {
  test('renders label, tabular zero value, icon+text delta, caption, sparkline and footer', () => {
    const { container } = render(
      <Metric
        label="Open incidents"
        value={0}
        delta={{ value: '-100%', direction: 'down', tone: 'success' }}
        caption="vs last 7 days"
        sparkline={[4, 3, 2, 1, 0]}
        footer={<Button variant="link" size="inline">View report</Button>}
      />,
    )
    expect(screen.getByRole('region', { name: 'Open incidents' })).toBeTruthy()
    expect(container.querySelector('[data-slot="count"]')?.textContent).toBe('0')
    const delta = container.querySelector('[data-slot="metric-delta"]')!
    expect(delta.textContent).toContain('-100%')
    expect(delta.querySelector('svg')).toBeTruthy()
    expect(screen.getByText('vs last 7 days')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Open incidents' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'View report' })).toBeTruthy()
  })

  test('supports quiet surface without shadow', () => {
    const { container } = render(<Metric label="Requests" value="12,480" variant="quiet" />)
    const card = container.querySelector('[data-slot="metric"]')!
    expect(card.getAttribute('data-variant')).toBe('quiet')
    expect(card.className).toContain('bg-paper-2')
    expect(card.className).not.toContain('shadow-')
  })
})
