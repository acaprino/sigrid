// Statistical charts built on Recharts, behind the `./chart` entry so apps without charts load none of Recharts.
// Every chart follows DESIGN.md: series colours come from the theme's accent and 12-step `hueScale` (src/hues.ts),
// grids use `--line-subtle`, areas use flat translucent fills (no gradients), tooltips use raised surfaces with
// `shadow-md` (R4) and tabular figures (R5), legends use 8px dots (R10), and animations stay off (`isAnimationActive={false}`).
import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { hueScale, type HueName } from '../hues'
import { watchLook } from '../internal/look'
import { cn } from '../lib/utils'
import type { ThemeScheme, TonePreset } from '../theme-engine'
import { useWords } from '../words'

/** Default series hue order when a series omits `hue` (beyond series 0, which follows `--color-primary`). */
export const DEFAULT_CHART_HUES: readonly HueName[] = ['blue', 'teal', 'amber', 'violet', 'coral', 'emerald', 'indigo', 'magenta']

/** One plotted data series of a `LineChart` or `BarChart`. */
export type ChartSeries = {
  /** Key in each row of `data`. */
  key: string
  /** Visible name in the legend and tooltip. */
  label: string
  /** Optional named hue from Sigrid's 18-hue scale (`hueScale`). Absent: series 0 uses `--color-primary`, further series cycle `DEFAULT_CHART_HUES`. */
  hue?: HueName | undefined
}

/**
 * Picks `count` evenly spaced items from `items`, always including the first and last when `count >= 2`.
 * Useful for capping x-axis ticks on dense time series without clipping the range ends.
 */
export function selectEvenlySpacedItems<T>(items: readonly T[], count: number): T[] {
  if (items.length === 0 || count <= 0) return []
  if (items.length <= count) return [...items]
  if (count === 1) return [items[0]!]
  const out: T[] = []
  for (let i = 0; i < count; i++) {
    const index = Math.round((i * (items.length - 1)) / (count - 1))
    out.push(items[Math.max(0, Math.min(index, items.length - 1))]!)
  }
  return out
}

/** Resolves each series to a concrete CSS colour from the active theme scheme and tone (`hueScale` step 9, or `--color-primary` for the first unnamed series). */
export function chartSeriesColors(series: readonly Pick<ChartSeries, 'hue'>[], scheme: ThemeScheme = 'light', tone: TonePreset = 'vivid'): string[] {
  return series.map((item, index) => {
    if (item.hue) return hueScale(item.hue, tone, scheme).steps[8]!
    if (index === 0) return 'var(--color-primary)'
    const fallback = DEFAULT_CHART_HUES[index % DEFAULT_CHART_HUES.length]!
    return hueScale(fallback, tone, scheme).steps[8]!
  })
}

function readScheme(doc: Document): ThemeScheme {
  const attr = doc.documentElement.getAttribute('data-scheme')
  if (attr === 'dark' || attr === 'light') return attr
  return typeof doc.defaultView?.matchMedia === 'function' && doc.defaultView.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Tracks the document's active light/dark scheme so `hueScale` series colours update when the theme switches. */
function useChartScheme(): ThemeScheme {
  const [scheme, setScheme] = React.useState<ThemeScheme>(() => (typeof document === 'undefined' ? 'light' : readScheme(document)))
  React.useEffect(() => {
    if (typeof document === 'undefined') return
    const sync = () => setScheme(readScheme(document))
    sync()
    return watchLook(document, sync)
  }, [])
  return scheme
}

type TooltipEntry = {
  name?: string | number | undefined
  value?: string | number | readonly (string | number)[] | undefined
  color?: string | undefined
  dataKey?: string | number | undefined
  payload?: Record<string, unknown> | undefined
}

export type ChartTooltipProps = {
  active?: boolean | undefined
  payload?: readonly TooltipEntry[] | undefined
  label?: string | number | undefined
  formatLabel?: ((label: unknown) => string) | undefined
  formatValue?: ((value: number, seriesKey: string) => string) | undefined
}

/** Raised tooltip card (`shadow-md`, R4) with 8px series dots (R10) and tabular figures (R5). */
export function ChartTooltip({ active, payload, label, formatLabel, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const heading = label !== undefined && label !== null && label !== '' ? (formatLabel ? formatLabel(label) : String(label)) : null
  return (
    <div data-slot="chart-tooltip" className="flex flex-col gap-1 rounded-lg bg-raised px-3 py-2 text-xs text-ink shadow-md tabular-nums">
      {heading ? <p className="font-medium text-ink-soft">{heading}</p> : null}
      <div className="flex flex-col gap-0.5">
        {payload.map((entry, index) => {
          const key = String(entry.dataKey ?? entry.name ?? index)
          const raw = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0)
          const formatted = Number.isFinite(raw) && formatValue ? formatValue(raw, key) : String(entry.value ?? '')
          return (
            <div key={`${key}-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-ink-soft">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full ring-1 ring-ink/10 ring-inset" style={{ backgroundColor: entry.color }} />
                <span>{String(entry.name ?? key)}</span>
              </span>
              <span className="font-medium text-ink">{formatted}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type LegendEntry = {
  value?: string | undefined
  color?: string | undefined
}

export type ChartLegendProps = {
  payload?: readonly LegendEntry[] | undefined
  layout?: 'horizontal' | 'vertical' | undefined
  align?: 'left' | 'center' | 'right' | undefined
  reversed?: boolean | undefined
  className?: string | undefined
}

/** Legend list with 8px dots (R10) and logical spacing. */
export function ChartLegend({ payload, layout = 'horizontal', align = 'left', reversed = false, className }: ChartLegendProps) {
  if (!payload || payload.length === 0) return null
  const items = reversed ? [...payload].reverse() : payload
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
  return (
    <ul
      data-slot="chart-legend"
      className={cn(
        'flex text-xs text-ink-soft',
        layout === 'vertical' ? 'flex-col gap-1.5 ps-4' : cn('flex-row flex-wrap gap-3 pt-2', justify),
        className,
      )}
    >
      {items.map((entry, index) => (
        <li key={`${entry.value ?? ''}-${index}`} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full ring-1 ring-ink/10 ring-inset" style={{ backgroundColor: entry.color }} />
          <span>{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

function ChartFrame({
  label,
  seriesCount,
  pointCount,
  height,
  empty,
  className,
  children,
}: {
  label: string
  seriesCount: number
  pointCount: number
  height: number
  empty: boolean
  className?: string | undefined
  children: React.ReactNode
}) {
  const words = useWords()
  return (
    <figure role="figure" aria-label={label} data-slot="chart" className={cn('m-0 w-full min-w-0', className)}>
      <figcaption className="sr-only">
        {label}: {words.chart.seriesSummary(seriesCount, pointCount)}
      </figcaption>
      {empty ? (
        <div style={{ height }} className="flex w-full items-center justify-center rounded-lg bg-paper-2 text-sm text-ink-mute">
          {words.chart.empty}
        </div>
      ) : (
        <div style={{ height }} className="w-full min-w-0">
          {children}
        </div>
      )}
    </figure>
  )
}

const AXIS_TICK = { fill: 'var(--color-ink-mute)', fontSize: 12 } as const

type CartesianBaseProps<Row extends Record<string, unknown>> = {
  /** Accessible name of the chart («Monthly revenue»). */
  'aria-label': string
  /** Flat array of data rows, one per x-axis point. */
  data: readonly Row[]
  /** Row property drawn along the category/time axis. */
  xKey: keyof Row & string
  /** Series plotted from each row. */
  series: readonly ChartSeries[]
  /** Cap the number of x-axis tick labels with `selectEvenlySpacedItems`. */
  xTickCount?: number | undefined
  /** Format x-axis ticks and tooltip heading. */
  formatX?: ((value: unknown) => string) | undefined
  /** Format y-axis ticks and tooltip values. */
  formatValue?: ((value: number, seriesKey: string) => string) | undefined
  /** Tone preset for `hueScale` series colours. Default `vivid` (R11). */
  tone?: TonePreset | undefined
  /** Show the legend below the chart. Default true when more than one series. */
  showLegend?: boolean | undefined
  /** Height in pixels. Default 240. */
  height?: number | undefined
  className?: string | undefined
}

export type LineChartProps<Row extends Record<string, unknown>> = CartesianBaseProps<Row> & {
  /** Fill under the lines with a flat translucent tint (`fillOpacity: 0.12`, no gradient). Default false. */
  area?: boolean | undefined
  /** Stack areas when `area` is true. Default false. */
  stacked?: boolean | undefined
}

/** A responsive line (or flat-filled area) chart with theme-driven colours, subtle horizontal grid and raised tooltip. */
export function LineChart<Row extends Record<string, unknown>>({
  'aria-label': ariaLabel,
  data,
  xKey,
  series,
  xTickCount,
  formatX,
  formatValue,
  tone = 'vivid',
  area = false,
  stacked = false,
  showLegend,
  height = 240,
  className,
}: LineChartProps<Row>) {
  const scheme = useChartScheme()
  const colors = chartSeriesColors(series, scheme, tone)
  const legendOn = showLegend ?? series.length > 1
  const ticks = xTickCount && data.length > xTickCount ? selectEvenlySpacedItems(data, xTickCount).map((row) => row[xKey] as string | number) : undefined
  const rows = data as Row[]

  return (
    <ChartFrame label={ariaLabel} seriesCount={series.length} pointCount={data.length} height={height} empty={data.length === 0 || series.length === 0} className={className}>
      <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>
        {area ? (
          <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line-subtle)" />
            <XAxis dataKey={xKey as string} ticks={ticks} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={formatX ? (v) => formatX(v) : undefined} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={formatValue ? (v) => formatValue(Number(v), '') : undefined} />
            <Tooltip content={<ChartTooltip formatLabel={formatX} formatValue={formatValue} />} />
            {legendOn ? <Legend content={<ChartLegend />} /> : null}
            {series.map((s, i) => {
              const color = colors[i]!
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stackId={stacked ? 'stack' : undefined}
                  stroke={color}
                  strokeWidth={2}
                  fill={color}
                  fillOpacity={0.12}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--color-raised)', stroke: color, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )
            })}
          </AreaChart>
        ) : (
          <RechartsLineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line-subtle)" />
            <XAxis dataKey={xKey as string} ticks={ticks} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={formatX ? (v) => formatX(v) : undefined} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={formatValue ? (v) => formatValue(Number(v), '') : undefined} />
            <Tooltip content={<ChartTooltip formatLabel={formatX} formatValue={formatValue} />} />
            {legendOn ? <Legend content={<ChartLegend />} /> : null}
            {series.map((s, i) => {
              const color = colors[i]!
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--color-raised)', stroke: color, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )
            })}
          </RechartsLineChart>
        )}
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export type BarChartProps<Row extends Record<string, unknown>> = CartesianBaseProps<Row> & {
  /** Stack series bars on top of one another. Default false. */
  stacked?: boolean | undefined
  /** Horizontal bars (`layout="vertical"` in Recharts). Default false. */
  horizontal?: boolean | undefined
}

/** A responsive vertical or horizontal bar chart styled with Sigrid's theme tokens and 12-step hues. */
export function BarChart<Row extends Record<string, unknown>>({
  'aria-label': ariaLabel,
  data,
  xKey,
  series,
  xTickCount,
  formatX,
  formatValue,
  tone = 'vivid',
  stacked = false,
  horizontal = false,
  showLegend,
  height = 240,
  className,
}: BarChartProps<Row>) {
  const scheme = useChartScheme()
  const colors = chartSeriesColors(series, scheme, tone)
  const legendOn = showLegend ?? series.length > 1
  const ticks = !horizontal && xTickCount && data.length > xTickCount ? selectEvenlySpacedItems(data, xTickCount).map((row) => row[xKey] as string | number) : undefined
  const rows = data as Row[]

  return (
    <ChartFrame label={ariaLabel} seriesCount={series.length} pointCount={data.length} height={height} empty={data.length === 0 || series.length === 0} className={className}>
      <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>
        <RechartsBarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke="var(--line-subtle)" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={formatValue ? (v) => formatValue(Number(v), '') : undefined} />
              <YAxis type="category" dataKey={xKey as string} tick={AXIS_TICK} tickLine={false} axisLine={false} width={88} tickFormatter={formatX ? (v) => formatX(v) : undefined} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey as string} ticks={ticks} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={formatX ? (v) => formatX(v) : undefined} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={formatValue ? (v) => formatValue(Number(v), '') : undefined} />
            </>
          )}
          <Tooltip content={<ChartTooltip formatLabel={formatX} formatValue={formatValue} />} cursor={{ fill: 'var(--line-subtle)' }} />
          {legendOn ? <Legend content={<ChartLegend />} /> : null}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? 'stack' : undefined}
              fill={colors[i]!}
              radius={stacked ? [0, 0, 0, 0] : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={32}
              isAnimationActive={false}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/** One slice of a `PieChart`. */
export type PieSlice = {
  name: string
  value: number
  hue?: HueName | undefined
}

export type PieChartProps = {
  'aria-label': string
  data: readonly PieSlice[]
  /** Render as a ring with an open centre. Default true. */
  donut?: boolean | undefined
  formatValue?: ((value: number, name: string) => string) | undefined
  tone?: TonePreset | undefined
  showLegend?: boolean | undefined
  height?: number | undefined
  className?: string | undefined
}

/** A pie or donut chart with `hueScale` slice colours, raised tooltip and R10 dot legend. */
export function PieChart({ 'aria-label': ariaLabel, data, donut = true, formatValue, tone = 'vivid', showLegend = true, height = 240, className }: PieChartProps) {
  const scheme = useChartScheme()
  const colors = chartSeriesColors(data, scheme, tone)
  const slices = data as PieSlice[]

  return (
    <ChartFrame label={ariaLabel} seriesCount={1} pointCount={data.length} height={height} empty={data.length === 0} className={className}>
      <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 320, height }}>
        <RechartsPieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius={donut ? '58%' : 0}
            outerRadius="82%"
            paddingAngle={donut ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice, index) => (
              <Cell key={`${slice.name}-${index}`} fill={colors[index]!} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
          {showLegend ? <Legend content={<ChartLegend align="center" />} /> : null}
        </RechartsPieChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/** One concentric ring of a `RadialGauge`. */
export type RadialGaugeItem = {
  name: string
  value: number
  hue?: HueName | undefined
}

export type RadialGaugeProps = {
  'aria-label': string
  data: readonly RadialGaugeItem[]
  /** Upper bound of the radial scale. Default 100. */
  max?: number | undefined
  /** Primary figure drawn in the middle of the rings. */
  centerValue?: string | number | undefined
  /** Supporting label under `centerValue`. */
  centerLabel?: string | undefined
  formatValue?: ((value: number, name: string) => string) | undefined
  tone?: TonePreset | undefined
  showLegend?: boolean | undefined
  height?: number | undefined
  className?: string | undefined
}

/** Concentric activity gauge rings on a shared scale (`0..max`), with optional centre KPI and R10 dot legend. */
export function RadialGauge({
  'aria-label': ariaLabel,
  data,
  max = 100,
  centerValue,
  centerLabel,
  formatValue,
  tone = 'vivid',
  showLegend = true,
  height = 240,
  className,
}: RadialGaugeProps) {
  const scheme = useChartScheme()
  const colors = chartSeriesColors(data, scheme, tone)
  const items = data.map((item, index) => ({ ...item, fill: colors[index]! }))

  return (
    <ChartFrame label={ariaLabel} seriesCount={data.length} pointCount={data.length} height={height} empty={data.length === 0} className={className}>
      <div className="relative size-full">
        <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 280, height }}>
          <RadialBarChart data={items} innerRadius="48%" outerRadius="88%" startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'var(--line-subtle)' }} isAnimationActive={false} />
            <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
            {showLegend ? <Legend content={<ChartLegend align="center" />} /> : null}
          </RadialBarChart>
        </ResponsiveContainer>
        {centerValue !== undefined || centerLabel !== undefined ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue !== undefined ? <span className="text-xl font-semibold text-ink tabular-nums">{centerValue}</span> : null}
            {centerLabel !== undefined ? <span className="text-2xs text-ink-mute">{centerLabel}</span> : null}
          </div>
        ) : null}
      </div>
    </ChartFrame>
  )
}
