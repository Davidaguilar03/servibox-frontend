import { formatCurrency, formatDate, formatInteger } from '../lib/format'
import { shortDate } from '../lib/period'
import { AGING_LABELS, type ChartPoint, type ChartSeries, type ReportChartSpec } from './liveReports'

interface ReportChartProps {
  spec: ReportChartSpec
  points: ChartPoint[]
}

const FILL: Record<ChartSeries['tone'], string> = { info: 'fill-info', warning: 'fill-warning', success: 'fill-success' }
const SWATCH: Record<ChartSeries['tone'], string> = { info: 'bg-info', warning: 'bg-warning', success: 'bg-success' }

function pointLabel(spec: ReportChartSpec, label: string): string {
  if (spec.labels === 'date') return shortDate(label)
  if (spec.labels === 'aging') return AGING_LABELS[label] ?? label
  // Mes (`2026-09`) o dia (`2026-09-05`).
  if (spec.labels === 'period') return label.length === 7 ? shortDate(`${label}-01`).replace(/^1 /, '') : shortDate(label)
  return label
}

const seriesOf = (spec: ReportChartSpec): ChartSeries[] => spec.series ?? [{ key: 'value', label: spec.title, tone: 'info' }]
const numberAt = (point: ChartPoint, key: string) => Number(point[key]) || 0

/**
 * Grafica de un reporte en vivo, en SVG y HTML propios (sin libreria): columnas para series
 * por dia, mes o rango (una o varias series, con valores negativos bajo el eje) y barras
 * horizontales para los 10 mayores. Los importes completos estan en la tabla.
 */
export function ReportChart({ spec, points }: ReportChartProps) {
  const series = seriesOf(spec)
  const values = points.flatMap((point) => series.map((item) => numberAt(point, item.key)))
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const format = spec.valueFormat === 'integer' ? formatInteger : formatCurrency
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-surface border border-border bg-surface p-4 sm:p-6" aria-labelledby="report-chart-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="report-chart-title" className="text-section text-text">{spec.title}</h2>
        {series.length > 1 && (
          <ul className="flex flex-wrap items-center gap-4 text-small text-text-muted" aria-label="Leyenda">
            {series.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <span className={`size-3 rounded-pill ${SWATCH[item.tone]}`} aria-hidden />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {max === 0 && min === 0 ? (
        <p className="text-small text-text-muted">Sin valores para graficar.</p>
      ) : spec.kind === 'bars' ? (
        <Bars spec={spec} points={points} max={max} format={format} />
      ) : (
        <Columns spec={spec} points={points} max={max} min={min} format={format} />
      )}
    </section>
  )
}

type Format = (value: number) => string

function Bars({ spec, points, max, format }: ReportChartProps & { max: number; format: Format }) {
  const key = seriesOf(spec)[0]!.key
  return (
    <ol className="flex flex-col gap-3" aria-label={spec.title}>
      {points.map((point, index) => (
        <li key={`${point.label}-${index}`} className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-baseline justify-between gap-3 text-small">
            <span className="min-w-0 text-text wrap-anywhere">{pointLabel(spec, point.label)}</span>
            <span className="monto shrink-0 text-text">{format(numberAt(point, key))}</span>
          </div>
          <div className="h-2 w-full rounded-pill bg-neutral-100" aria-hidden>
            <div className="h-2 rounded-pill bg-info" style={{ width: `${Math.max((numberAt(point, key) / max) * 100, 1)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function describe(spec: ReportChartSpec, points: ChartPoint[], series: ChartSeries[], format: Format): string {
  const text = (point: ChartPoint) => series.length > 1
    ? `${pointLabel(spec, point.label)}: ${series.map((item) => `${item.label.toLowerCase()} ${format(numberAt(point, item.key))}`).join(', ')}`
    : `${pointLabel(spec, point.label)}: ${format(numberAt(point, 'value'))}`
  if (spec.labels !== 'date') return points.length <= 12 ? points.map(text).join('; ') : `${points.length} puntos`
  const high = points.reduce((best, point) => (numberAt(point, 'value') > numberAt(best, 'value') ? point : best), points[0]!)
  const low = points.reduce((best, point) => (numberAt(point, 'value') < numberAt(best, 'value') ? point : best), points[0]!)
  const parts = [`Mayor valor el ${formatDate(high.label)}: ${format(numberAt(high, 'value'))}`]
  if (numberAt(low, 'value') < 0) parts.push(`menor valor el ${formatDate(low.label)}: ${format(numberAt(low, 'value'))}`)
  return parts.join('; ')
}

function Columns({ spec, points, max, min, format }: ReportChartProps & { max: number; min: number; format: Format }) {
  const series = seriesOf(spec)
  const range = max - min
  const top = 4
  const height = 152
  const zero = top + (max / range) * height
  const step = 600 / Math.max(points.length, 1)
  const groupWidth = Math.max(Math.min(spec.labels === 'date' ? 16 : 64 * series.length, step * 0.7), 1)
  const barWidth = groupWidth / series.length
  const description = describe(spec, points, series, format)
  const allTicks = spec.labels !== 'date' && points.length <= 12
  const ticks = allTicks
    ? points
    : [points[0]!, ...(points.length > 2 ? [points[Math.floor(points.length / 2)]!] : []), ...(points.length > 1 ? [points[points.length - 1]!] : [])]

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
        <div className="flex h-40 flex-col justify-between text-right text-small text-text-muted" aria-hidden>
          <span className="monto">{format(max)}</span>
          <span className="monto">{format((max + min) / 2)}</span>
          <span className="monto">{format(min)}</span>
        </div>
        <div className="min-w-0">
          <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`${spec.title}. ${description}.`}>
            <line x1="0" x2="600" y1="0" y2="0" className="stroke-border" />
            <line x1="0" x2="600" y1="80" y2="80" className="stroke-border" />
            <line x1="0" x2="600" y1="159" y2="159" className="stroke-border" />
            <line x1="0" x2="600" y1={zero} y2={zero} className="stroke-border-control" />
            {points.map((point, index) => (
              <g key={`${point.label}-${index}`}>
                {series.map((item, position) => {
                  const value = numberAt(point, item.key)
                  if (value === 0) return null
                  const size = (Math.abs(value) / range) * height
                  // Una sola serie: lo negativo va en rojo; con varias, cada serie conserva su color.
                  const fill = series.length === 1 && value < 0 ? 'fill-error' : FILL[item.tone]
                  return (
                    <rect
                      key={item.key}
                      x={index * step + (step - groupWidth) / 2 + position * barWidth}
                      y={value > 0 ? zero - size : zero}
                      width={barWidth}
                      height={size}
                      className={fill}
                      data-series={item.key}
                    >
                      <title>{`${pointLabel(spec, point.label)}${series.length > 1 ? `, ${item.label}` : ''}: ${format(value)}`}</title>
                    </rect>
                  )
                })}
              </g>
            ))}
          </svg>
          <div className={`flex gap-2 text-small text-text-muted ${allTicks ? 'justify-around text-center' : 'justify-between'}`} aria-hidden>
            {ticks.map((point, index) => <span key={`${point.label}-${index}`} className={allTicks ? 'min-w-0 wrap-anywhere' : 'whitespace-nowrap'}>{pointLabel(spec, point.label)}</span>)}
          </div>
        </div>
      </div>
      {spec.labels === 'date' && <p className="text-small text-text-muted">{description}.</p>}
    </div>
  )
}
