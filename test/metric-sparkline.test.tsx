// `Sparkline` and `Metric` (`@acaprino/sigrid/components`): zero-dependency trend lines and KPI cards.
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Button } from '../src/primitives'
import { Metric, Sparkline } from '../src/components'

describe('Sparkline', () => {
  test('renders an accessible SVG trend line with optional flat area, non-distorted dot and fixed width', () => {
    const { container } = render(<Sparkline values={[10, 14, 12, 18, 22]} label="Daily signups" area highlightLast width={96} />)
    const svg = screen.getByRole('img', { name: 'Daily signups' })
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.getAttribute('width')).toBe('96')
    expect(container.querySelectorAll('path')).toHaveLength(3)
    const dot = container.querySelector('[data-slot="sparkline-dot"]')!
    expect(dot.getAttribute('vector-effect')).toBe('non-scaling-stroke')
    expect(container.querySelector('linearGradient')).toBeNull()
  })

  test('returns null with fewer than two finite values and handles flat, negative, NaN and extreme values safely', () => {
    const { container, rerender } = render(<Sparkline values={[42, Number.NaN, Number.POSITIVE_INFINITY]} label="Single" />)
    expect(container.firstChild).toBeNull()

    rerender(<Sparkline values={[5, 5, 5]} label="Flat" height={Number.NaN} />)
    const flatD = container.querySelector('path')?.getAttribute('d') ?? ''
    expect(flatD).not.toContain('NaN')
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 120 32')

    rerender(<Sparkline values={[-1e308, 0, 1e308]} label="Extreme" />)
    const extremeD = container.querySelector('path')?.getAttribute('d') ?? ''
    expect(extremeD).not.toContain('NaN')
    expect(extremeD).not.toContain('Infinity')
  })
})

describe('Metric', () => {
  test('renders label, tabular zero value, accessible delta direction, caption, distinct sparkline label and footer', () => {
    const { container } = render(
      <Metric
        label="Open incidents"
        value={0}
        delta={{ value: '100%', direction: 'down', tone: 'success' }}
        caption="vs last 7 days"
        sparkline={[4, 3, 2, 1, 0]}
        footer={<Button variant="link" size="inline">View report</Button>}
      />,
    )
    expect(screen.getByRole('region', { name: 'Open incidents' })).toBeTruthy()
    expect(container.querySelector('[data-slot="count"]')?.textContent).toBe('0')
    const delta = container.querySelector('[data-slot="metric-delta"]')!
    expect(delta.textContent).toContain('Down')
    expect(delta.textContent).toContain('100%')
    expect(delta.querySelector('svg')).toBeTruthy()
    expect(screen.getByText('vs last 7 days')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Open incidents trend' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'View report' })).toBeTruthy()
  })

  test('does not mount empty sparkline container for empty or falsy sparkline', () => {
    const { container, rerender } = render(<Metric label="Requests" value="12,480" variant="quiet" sparkline={[]} />)
    const card = container.querySelector('[data-slot="metric"]')!
    expect(card.getAttribute('data-variant')).toBe('quiet')
    expect(card.className).toContain('bg-paper-2')
    expect(card.className).not.toContain('shadow-')
    expect(container.querySelector('[data-slot="metric-sparkline"]')).toBeNull()

    rerender(<Metric label="Requests" value="12,480" sparkline={false} />)
    expect(container.querySelector('[data-slot="metric-sparkline"]')).toBeNull()
  })
})
