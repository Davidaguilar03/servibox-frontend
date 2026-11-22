import { formatCurrency, formatDate } from '../lib/format'
import { shortDate } from '../lib/period'
import { AGING_LABELS, type ReportChartSpec } from './liveReports'

interface ReportChartProps {
  spec: ReportChartSpec
  series: Array<{ label: string; value: number }>
}

function pointLabel(spec: ReportChartSpec, label: string): string {
  if (spec.labels === 'date') return shortDate(label)
  if (spec.labels === 'aging') return AGING_LABELS[label] ?? label
  return label
}

/**
 * Grafica de un reporte en vivo, en SVG y HTML propios (sin libreria): columnas para series
 * por dia o por rango y barras horizontales para los 10 mayores. Los importes completos estan
 * en la tabla; la grafica los resume.
 */
export function ReportChart({ spec, series }: ReportChartProps) {
  const max = Math.max(0, ...series.map((point) => point.value))
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-surface border border-border bg-surface p-4 sm:p-6" aria-labelledby="report-chart-title">
      <h2 id="report-chart-title" className="text-section text-text">{spec.title}</h2>
      {max === 0 ? (
        <p className="text-small text-text-muted">Sin valores para graficar.</p>
      ) : spec.kind === 'bars' ? (
        <Bars spec={spec} series={series} max={max} />
      ) : (
        <Columns spec={spec} series={series} max={max} />
      )}
    </section>
  )
}

function Bars({ spec, series, max }: ReportChartProps & { max: number }) {
  return (
    <ol className="flex flex-col gap-3" aria-label={spec.title}>
      {series.map((point, index) => (
        <li key={`${point.label}-${index}`} className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-baseline justify-between gap-3 text-small">
            <span className="min-w-0 text-text wrap-anywhere">{pointLabel(spec, point.label)}</span>
            <span className="monto shrink-0 text-text">{formatCurrency(point.value)}</span>
          </div>
          <div className="h-2 w-full rounded-pill bg-neutral-100" aria-hidden>
            <div className="h-2 rounded-pill bg-info" style={{ width: `${Math.max((point.value / max) * 100, 1)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function Columns({ spec, series, max }: ReportChartProps & { max: number }) {
  const step = 600 / Math.max(series.length, 1)
  const barWidth = Math.max(Math.min(spec.labels === 'aging' ? 64 : 16, step * 0.7), 1)
  const peak = series.reduce((best, point) => (point.value > best.value ? point : best), series[0]!)
  const description = spec.labels === 'aging'
    ? series.map((point) => `${pointLabel(spec, point.label)}: ${formatCurrency(point.value)}`).join('; ')
    : `Mayor valor el ${formatDate(peak.label)}: ${formatCurrency(peak.value)}`
  const ticks = spec.labels === 'aging'
    ? series
    : [series[0]!, ...(series.length > 2 ? [series[Math.floor(series.length / 2)]!] : []), ...(series.length > 1 ? [series[series.length - 1]!] : [])]

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
        <div className="flex h-40 flex-col justify-between text-right text-small text-text-muted" aria-hidden>
          <span className="monto">{formatCurrency(max)}</span>
          <span className="monto">{formatCurrency(max / 2)}</span>
          <span className="monto">{formatCurrency(0)}</span>
        </div>
        <div className="min-w-0">
          <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`${spec.title}. ${description}.`}>
            <line x1="0" x2="600" y1="0" y2="0" className="stroke-border" />
            <line x1="0" x2="600" y1="80" y2="80" className="stroke-border" />
            <line x1="0" x2="600" y1="159" y2="159" className="stroke-border-control" />
            {series.map((point, index) => {
              const height = (point.value / max) * 152
              return point.value > 0 ? (
                <rect key={`${point.label}-${index}`} x={index * step + (step - barWidth) / 2} y={159 - height} width={barWidth} height={height} className="fill-info">
                  <title>{`${pointLabel(spec, point.label)}: ${formatCurrency(point.value)}`}</title>
                </rect>
              ) : null
            })}
          </svg>
          <div className={`flex gap-2 text-small text-text-muted ${spec.labels === 'aging' ? 'justify-around text-center' : 'justify-between'}`} aria-hidden>
            {ticks.map((point, index) => <span key={`${point.label}-${index}`} className="whitespace-nowrap">{pointLabel(spec, point.label)}</span>)}
          </div>
        </div>
      </div>
      {spec.labels === 'date' && <p className="text-small text-text-muted">{description}.</p>}
    </div>
  )
}
