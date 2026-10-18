import { Skeleton } from './states'

interface IndicatorCardProps {
  label: string
  /** Valor ya formateado. Sin valor se muestra el skeleton de carga. */
  value?: string
}

/** Tarjeta de indicador: etiqueta y valor. La variacion contra el periodo anterior aun no existe. */
export function IndicatorCard({ label, value }: IndicatorCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-card">
      <p className="text-small text-text-muted">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-3 h-8 w-3/4" />
      ) : (
        <p className="tabular mt-2 font-display text-h2 font-bold text-text">{value}</p>
      )}
    </div>
  )
}
