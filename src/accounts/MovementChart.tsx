import { formatCurrency } from '../lib/format'
import { shortDate } from '../lib/period'
import { movementTimeline, timelineBucketLabel, type TimelinePeak } from './movementTimeline'
import type { TreasuryMovement } from './accountsApi'

function peakText(label: string, peak: TimelinePeak | null) {
  if (!peak) return `No hubo ${label.toLowerCase()} en el período.`
  const dates = peak.dates.slice(0, 3).map(shortDate).join(', ')
  const more = peak.dates.length > 3 ? ` y ${peak.dates.length - 3} fechas más` : ''
  return `Mayor ${label.toLowerCase()}: ${peak.dates.length > 1 ? `empate en ${peak.dates.length} días (${dates}${more})` : dates} · ${formatCurrency(peak.amount)}`
}

export function MovementChart({ movements, desde, hasta }: { movements: TreasuryMovement[]; desde: string; hasta: string }) {
  const timeline = movementTimeline(movements, desde, hasta)
  const { buckets, unit, emptyDays, peakIncome, peakExpense } = timeline
  const max = Math.max(0, ...buckets.flatMap((bucket) => [bucket.income, bucket.expense]))
  const step = 600 / Math.max(buckets.length, 1)
  const barWidth = Math.min(12, step * 0.3)
  const unitLabel = unit === 'dia' ? 'día' : unit === 'semana' ? 'semana' : 'mes'

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-section text-text">Ingresos y egresos por {unitLabel}</h3>
        <p className="flex items-center gap-4 text-small text-text-muted">
          <span className="flex items-center gap-2"><span className="size-3 rounded-pill bg-success" aria-hidden />Ingresos</span>
          <span className="flex items-center gap-2"><span className="size-3 rounded-pill bg-error" aria-hidden />Egresos</span>
        </p>
      </div>
      {movements.length === 0 ? (
        <p className="mt-4 text-small text-text-muted">No hubo movimientos en este período.</p>
      ) : (
        <div className="mt-4 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
          <div className="flex h-40 flex-col justify-between text-right text-small text-text-muted" aria-hidden>
            <span>{formatCurrency(max)}</span>
            <span>{formatCurrency(max / 2)}</span>
            <span>{formatCurrency(0)}</span>
          </div>
          <div className="min-w-0">
            <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`Gráfico de ingresos y egresos por ${unitLabel}. Los importes completos están en Ver importes por fecha.`}>
              <line x1="0" x2="600" y1="0" y2="0" className="stroke-border" />
              <line x1="0" x2="600" y1="80" y2="80" className="stroke-border" />
              <line x1="0" x2="600" y1="159" y2="159" className="stroke-border-control" />
              {buckets.map((bucket, index) => {
                const center = index * step + step / 2
                const incomeHeight = max ? bucket.income / max * 152 : 0
                const expenseHeight = max ? bucket.expense / max * 152 : 0
                return (
                  <g key={bucket.start}>
                    {bucket.income > 0 && <rect x={center - barWidth - 1} y={159 - incomeHeight} width={barWidth} height={incomeHeight} className="fill-success" />}
                    {bucket.expense > 0 && <rect x={center + 1} y={159 - expenseHeight} width={barWidth} height={expenseHeight} className="fill-error" />}
                  </g>
                )
              })}
            </svg>
            <div className="flex justify-between gap-2 text-small text-text-muted" aria-hidden>
              <span>{buckets[0] && timelineBucketLabel(buckets[0], unit)}</span>
              {buckets.length > 2 && <span>{timelineBucketLabel(buckets[Math.floor(buckets.length / 2)]!, unit)}</span>}
              {buckets.length > 1 && <span>{timelineBucketLabel(buckets[buckets.length - 1]!, unit)}</span>}
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-small text-text-muted" role="status">
        <p>{peakText('Ingreso', peakIncome)}</p>
        <p>{peakText('Egreso', peakExpense)}</p>
        <p>{emptyDays} {emptyDays === 1 ? 'día' : 'días'} sin movimientos.</p>
      </div>
      {movements.length > 0 && <details className="mt-3 text-small text-text">
        <summary className="flex min-h-touch w-fit cursor-pointer items-center rounded-control font-semibold text-brand-ink focus-ring">Ver importes por fecha</summary>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label={`Importes por ${unitLabel}`}>
          {buckets.map((bucket) => <li key={bucket.start} className="rounded-control border border-border p-3">
            <span className="font-semibold">{timelineBucketLabel(bucket, unit)}</span>
            <span className="mt-1 block">Ingresos: <span className="monto">{formatCurrency(bucket.income)}</span></span>
            <span className="block">Egresos: <span className="monto">{formatCurrency(bucket.expense)}</span></span>
          </li>)}
        </ul>
      </details>}
    </div>
  )
}
