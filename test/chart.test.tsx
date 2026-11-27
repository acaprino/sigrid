// Statistical charts (`@acaprino/sigrid/chart`): series colour resolution from `hueScale`, tick selection helper,
// accessible figure/summary markup, empty states, zero gradients, and tooltip/legend rendering.
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
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

  test('chartSeriesColors uses --color-primary for first unnamed series and hueScale step 9 for hues', () => {
    const light = chartSeriesColors([{}, { hue: 'teal' }, {}], 'light', 'vivid')
    const dark = chartSeriesColors([{}, { hue: 'teal' }, {}], 'dark', 'vivid')
    expect(light[0]).toBe('var(--color-primary)')
    expect(light[1]).toBe(hueScale('teal', 'vivid', 'light').steps[8])
    expect(dark[1]).toBe(hueScale('teal', 'vivid', 'dark').steps[8])
    expect(light[1]).not.toBe(dark[1])
    expect(light[2]).toMatch(/^#[0-9a-f]{6}$/)
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

  test('BarChart, PieChart and RadialGauge render and show empty state when data is empty', () => {
    const { rerender, container } = render(
      <BarChart aria-label="Sales" data={MONTHS} xKey="month" series={[{ key: 'revenue', label: 'Revenue' }]} horizontal />,
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
        centerValue="78%"
        centerLabel="Target"
      />,
    )
    expect(screen.getByRole('figure', { name: 'Goals' })).toBeTruthy()
    expect(container.textContent).toContain('78%')
    expect(container.textContent).toContain('Target')

    rerender(
      <WordsProvider words={{ chart: { empty: 'Nessun dato' } }}>
        <LineChart aria-label="Empty" data={[]} xKey="month" series={[{ key: 'revenue', label: 'Revenue' }]} />
      </WordsProvider>,
    )
    expect(screen.getByText('Nessun dato')).toBeTruthy()
  })

  test('ChartTooltip and ChartLegend render formatted rows and R10 dots', () => {
    const { container } = render(
      <>
        <ChartTooltip
          active
          label="Jan"
          payload={[
            { name: 'Revenue', dataKey: 'revenue', value: 120, color: 'var(--color-primary)' },
            { name: 'Cost', dataKey: 'cost', value: 80, color: 'var(--color-success)' },
          ]}
          formatValue={(v) => `$${v}`}
        />
        <ChartLegend
          payload={[
            { value: 'Revenue', color: 'var(--color-primary)' },
            { value: 'Cost', color: 'var(--color-success)' },
          ]}
        />
      </>,
    )
    expect(screen.getByText('Jan')).toBeTruthy()
    expect(screen.getByText('$120')).toBeTruthy()
    expect(screen.getByText('$80')).toBeTruthy()
    expect(container.querySelectorAll('[data-slot="chart-legend"] li')).toHaveLength(2)
  })
})
