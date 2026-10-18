import { TriangleAlert } from 'lucide-react'
import { Button } from './Button'
import { Skeleton } from './states'

interface IndicatorCardProps {
  label: string
  /** Valor ya formateado. Sin valor se muestra el skeleton de carga. */
  value?: string
  /** Texto secundario bajo el valor. */
  detail?: string
  /** Con error, la tarjeta lo dice y ofrece reintentar solo este indicador. */
  error?: boolean
  onRetry?: () => void
}

/** Tarjeta de indicador: etiqueta y valor. La variacion contra el periodo anterior aun no existe. */
export function IndicatorCard({ label, value, detail, error, onRetry }: IndicatorCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-card">
      <p className="text-small text-text-muted">{label}</p>
      {error ? (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2">
          <TriangleAlert size={16} strokeWidth={1.5} className="text-error" aria-hidden />
          <span className="text-small text-text">No pudimos cargar este dato.</span>
          {onRetry && (
            <Button variant="text" className="px-2" onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </div>
      ) : value === undefined ? (
        <Skeleton className="mt-3 h-8 w-3/4" />
      ) : (
        <>
          <p className="tabular mt-2 font-display text-h2 font-bold text-text">{value}</p>
          {detail && <p className="mt-1 text-small text-text-muted">{detail}</p>}
        </>
      )}
    </div>
  )
}
