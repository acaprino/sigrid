// A KPI card showing one key figure with its label, optional change indicator, supporting caption, sparkline and
// footer action. Follows DESIGN.md: raised surface with `shadow-xs` or quiet fill with no border (R4), tabular figures
// (`Count`, R5), and a change indicator that always pairs a direction icon with its text (never colour alone).
import type * as React from "react"
import { Count } from "../primitives/count"
import { Separator } from "../primitives/separator"
import { Icon, type IconName } from "../icons"
import { cn } from "../lib/utils"
import { Sparkline, type SparklineTone } from "./sparkline"

export type MetricDeltaDirection = "up" | "down" | "flat"
export type MetricDeltaTone = "success" | "danger" | "neutral"

/** A change against a prior period: always rendered with a direction icon and its formatted value. */
export type MetricDelta = {
  /** Formatted change («+12%», «-3.4%», «0%»). */
  value: string
  /** Direction of the change: `up`, `down` or `flat`. */
  direction: MetricDeltaDirection
  /** Status tone. Absent: `success` for `up`, `danger` for `down`, `neutral` for `flat`. */
  tone?: MetricDeltaTone | undefined
}

export type MetricProps = {
  /** What the figure measures («Active users», «Latency p95»). */
  label: string
  /** The figure itself, rendered in tabular figures (`2xl` semibold). Zero is always displayed. */
  value: number | string
  /** Optional period-over-period change, always paired with a direction icon. */
  delta?: MetricDelta | undefined
  /** Short context beside the delta or under the value («vs last 30 days»). */
  caption?: string | undefined
  /** Roll the value in from below when it updates from live events (`Count rolling`). */
  rolling?: boolean | undefined
  /** Motion for `rolling` only, over `MotionProvider`. */
  animated?: boolean | undefined
  /** Optional trend line: a numeric series (drawn with `Sparkline`) or a custom chart node. */
  sparkline?: readonly number[] | React.ReactNode
  /** Trailing action in the header (a ghost button or overflow menu). */
  action?: React.ReactNode
  /** Footer row separated by a hairline (typically a link or secondary action). */
  footer?: React.ReactNode
  /** Card surface: `raised` (`shadow-xs`, default) or `quiet` (`bg-paper-2`, no shadow). Never a border (R4). */
  variant?: "raised" | "quiet" | undefined
  className?: string | undefined
}

const SURFACE = {
  raised: "bg-raised shadow-xs",
  quiet: "bg-paper-2",
} as const

const DELTA_ICON: Record<MetricDeltaDirection, IconName> = {
  up: "moveUp",
  down: "moveDown",
  flat: "minus",
}

const DELTA_TONE_COLOR: Record<MetricDeltaTone, string> = {
  success: "text-success",
  danger: "text-destructive",
  neutral: "text-ink-soft",
}

function defaultTone(direction: MetricDeltaDirection): MetricDeltaTone {
  return direction === "up" ? "success" : direction === "down" ? "danger" : "neutral"
}

function isNumberSeries(value: readonly number[] | React.ReactNode): value is readonly number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number")
}

/** A KPI card: label, tabular figure, optional delta (icon + text), optional sparkline and optional footer. */
export function Metric({
  label,
  value,
  delta,
  caption,
  rolling = false,
  animated,
  sparkline,
  action,
  footer,
  variant = "raised",
  className,
}: MetricProps) {
  const deltaTone = delta ? (delta.tone ?? defaultTone(delta.direction)) : undefined
  const sparkTone: SparklineTone = deltaTone === "success" ? "success" : deltaTone === "danger" ? "danger" : "accent"
  // Stringify numbers so `0` is rendered as a valid metric figure instead of hidden by `Count`'s empty-badge rule.
  const display = typeof value === "number" ? String(value) : value

  return (
    <section
      aria-label={label}
      data-slot="metric"
      data-variant={variant}
      className={cn("flex min-w-0 flex-col gap-3 rounded-lg p-4", SURFACE[variant], className)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-ink-soft">{label}</p>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Count
            value={display}
            rolling={rolling}
            animated={animated}
            className="text-2xl font-semibold text-ink"
          />
          {delta || caption ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {delta && deltaTone ? (
                <span data-slot="metric-delta" className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", DELTA_TONE_COLOR[deltaTone])}>
                  <Icon name={DELTA_ICON[delta.direction]} className="size-3.5 shrink-0" />
                  <span>{delta.value}</span>
                </span>
              ) : null}
              {caption ? <span className="text-ink-mute">{caption}</span> : null}
            </div>
          ) : null}
        </div>

        {sparkline !== undefined && sparkline !== null ? (
          <div className="w-24 shrink-0">
            {isNumberSeries(sparkline) ? (
              <Sparkline values={sparkline} label={label} tone={sparkTone} area highlightLast height={32} />
            ) : (
              sparkline
            )}
          </div>
        ) : null}
      </div>

      {footer ? (
        <>
          <Separator decorative />
          <div className="flex items-center justify-end gap-2">{footer}</div>
        </>
      ) : null}
    </section>
  )
}
