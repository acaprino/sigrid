// Statistical charts (`@acaprino/sigrid/chart`): series colour resolution from `hueScale`, tick selection helper,
// accessible figure/summary markup, empty states, zero gradients, polar tooltip payload resolution, null-value safety,
// and local `[data-scheme]` scheme detection.
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { WordsProvider, hueScale } from '../src'
import {
  BarChart,
  ChartLegend,
  ChartTooltip,
  LineChart,
  PieChart,
  RadialGauge,
  chartSeriesColors,
  selectEvenlySpacedItems,
} from '../src/chart'

const MONTHS = [
  { month: 'Jan', revenue: 120, cost: 80 },
  { month: 'Feb', revenue: 150, cost: 90 },
  { month: 'Mar', revenue: 180, cost: 95 },
  { month: 'Apr', revenue: 165, cost: 88 },
  { month: 'May', revenue: 210, cost: 105 },
  { month: 'Jun', revenue: 240, cost: 112 },
]

describe('chart helpers', () => {
  test('selectEvenlySpacedItems keeps first and last items and handles edge cases', () => {
    expect(selectEvenlySpacedItems([], 4)).toEqual([])
    expect(selectEvenlySpacedItems([1, 2], 0)).toEqual([])
    expect(selectEvenlySpacedItems([1, 2], 5)).toEqual([1, 2])
    expect(selectEvenlySpacedItems([10, 20, 30], 1)).toEqual([10])
    expect(selectEvenlySpacedItems([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4)).toEqual([0, 3, 6, 9])
  })

  test('chartSeriesColors uses --color-primary for first unnamed series, hueScale step 9 for hues and avoids collisions', () => {
    const light = chartSeriesColors([{}, { hue: 'teal' }, { hue: 'blue' }, {}], 'light', 'vivid')
    const dark = chartSeriesColors([{}, { hue: 'teal' }, { hue: 'blue' }, {}], 'dark', 'vivid')
    expect(light[0]).toBe('var(--color-primary)')
    expect(light[1]).toBe(hueScale('teal', 'vivid', 'light').steps[8])
    expect(dark[1]).toBe(hueScale('teal', 'vivid', 'dark').steps[8])
    expect(light[1]).not.toBe(dark[1])
    // Fourth unnamed series skips already-taken 'blue' and 'teal' and picks 'amber'.
    expect(light[3]).toBe(hueScale('amber', 'vivid', 'light').steps[8])
  })
})

describe('chart components', () => {
  test('LineChart renders figure, sr-only summary and flat area fill without gradients', () => {
    const { container } = render(
      <LineChart
        aria-label="Monthly revenue"
        data={MONTHS}
        xKey="month"
        series={[
          { key: 'revenue', label: 'Revenue' },
          { key: 'cost', label: 'Cost', hue: 'coral' },
        ]}
        xTickCount={3}
        area
      />,
    )
    expect(screen.getByRole('figure', { name: 'Monthly revenue' })).toBeTruthy()
    expect(container.textContent).toContain('2 series, 6 points')
    expect(container.querySelector('linearGradient')).toBeNull()
  })

  test('BarChart, PieChart and RadialGauge render, guard invalid max/xTickCount and show clean empty state', () => {
    const { rerender, container } = render(
      <BarChart aria-label="Sales" data={MONTHS} xKey="month" series={[{ key: 'revenue', label: 'Revenue' }]} xTickCount={-1} horizontal />,
    )
    expect(screen.getByRole('figure', { name: 'Sales' })).toBeTruthy()

    rerender(
      <PieChart
        aria-label="Share"
        data={[
          { name: 'Desktop', value: 64, hue: 'blue' },
          { name: 'Mobile', value: 36, hue: 'teal' },
        ]}
      />,
    )
    expect(screen.getByRole('figure', { name: 'Share' })).toBeTruthy()

    rerender(
      <RadialGauge
        aria-label="Goals"
        data={[{ name: 'Completion', value: 78, hue: 'emerald' }]}
        max={0}
        centerValue="78%"
        centerLabel="Target"
      />,
    )
    expect(screen.getByRole('figure', { name: 'Goals' })).toBeTruthy()
    expect(container.textContent).toContain('78%')
    expect(container.textContent).toContain('Target')
    expect(container.querySelector('[data-slot="chart-legend"]')?.textContent).toContain('Completion')

    rerender(
      <WordsProvider words={{ chart: { empty: 'Nessun dato' } }}>
        <LineChart aria-label="Empty" data={[]} xKey="month" series={[{ key: 'revenue', label: 'Revenue' }]} />
      </WordsProvider>,
    )
    expect(screen.getByText('Nessun dato')).toBeTruthy()
    expect(container.querySelector('figcaption')).toBeNull()
  })

  test('ChartTooltip resolves polar payload names, passes them to formatValue and does not coerce null to 0', () => {
    const formatValue = vi.fn((v: number, name: string) => `${name}:${v}%`)
    render(
      <ChartTooltip
        active
        nameFromPayload
        payload={[
          { name: 'value', dataKey: 'value', value: 78, color: 'var(--color-primary)', payload: { name: 'Completion' } },
          { name: 'value', dataKey: 'value', value: null, color: 'var(--color-success)', payload: { name: 'Missing' } },
        ]}
        formatValue={formatValue}
      />,
    )
    expect(screen.getByText('Completion')).toBeTruthy()
    expect(screen.getByText('Completion:78%')).toBeTruthy()
    expect(screen.getByText('Missing')).toBeTruthy()
    expect(screen.getByText('—')).toBeTruthy()
    expect(formatValue).toHaveBeenCalledTimes(1)
    expect(formatValue).toHaveBeenCalledWith(78, 'Completion')
  })

  test('ChartLegend renders R10 dots and respects alignment', () => {
    const { container } = render(
      <ChartLegend
        align="left"
        payload={[
          { value: 'Revenue', color: 'var(--color-primary)' },
          { value: 'Cost', color: 'var(--color-success)' },
        ]}
      />,
    )
    expect(container.querySelectorAll('[data-slot="chart-legend"] li')).toHaveLength(2)
    expect(container.querySelector('[data-slot="chart-legend"]')?.className).toContain('justify-start')
  })

  test('follows a local [data-scheme] ancestor for hueScale colours', () => {
    const { container } = render(
      <div data-scheme="dark">
        <RadialGauge aria-label="Dark preview" data={[{ name: 'Ring', value: 50, hue: 'teal' }]} />
      </div>,
    )
    const dot = container.querySelector<HTMLElement>('[data-slot="chart-legend"] span[aria-hidden="true"]')!
    const darkHex = hueScale('teal', 'vivid', 'dark').steps[8]!
    const rgb = [1, 3, 5].map((i) => parseInt(darkHex.slice(i, i + 2), 16)).join(', ')
    expect(dot.style.backgroundColor).toBe(`rgb(${rgb})`)
  })
})
