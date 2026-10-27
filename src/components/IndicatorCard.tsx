import type { ReactNode } from 'react'
import { TriangleAlert, type LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { Skeleton } from './states'
import { iconLg, iconSm } from './icons'

interface IndicatorCardProps {
  label: string
  /** Valor ya formateado. Sin valor se muestra el skeleton de carga. */
  value?: string
  /** Valor negativo: la cifra va en el tono de error. */
  negative?: boolean
  /** Dato pegado al valor, como el margen bruto. */
  note?: string
  /** Texto secundario bajo el valor. */
  detail?: string
  /** Variacion contra el periodo anterior, bajo el valor. */
  trend?: ReactNode
  /** Con error, la tarjeta lo dice y ofrece reintentar solo este indicador. */
  error?: boolean
  onRetry?: () => void
  /** El acento identifica el contexto; no cambia el significado ni el signo del valor. */
  accent?: 'brand' | 'brand-strong' | 'success' | 'warning' | 'info'
  icon?: LucideIcon
  /** Variante de Productos: icono a la izquierda y texto alineado en un bloque. */
  compact?: boolean
  /** Menor relleno vertical, usado solo por los cuatro KPI de Inicio. */
  dense?: boolean
}

const accents = {
  brand: { border: 'border-t-border-accent', icon: 'bg-error-bg text-brand-ink' },
  'brand-strong': { border: 'border-t-brand', icon: 'bg-error-bg text-brand-ink' },
  success: { border: 'border-t-success', icon: 'bg-success-bg text-success-ink' },
  warning: { border: 'border-t-warning', icon: 'bg-warning-bg text-warning-ink' },
  info: { border: 'border-t-info', icon: 'bg-info-bg text-info-ink' },
}

/** Tarjeta de indicador: etiqueta, valor y, si la hay, la variacion contra el periodo anterior. */
export function IndicatorCard({ label, value, negative, note, detail, trend, error, onRetry, accent = 'brand', icon: Icon, compact, dense }: IndicatorCardProps) {
  const body = error ? (
    <div role="alert" className="mt-2 flex flex-wrap items-center gap-2">
      <TriangleAlert {...iconSm} className="text-error" aria-hidden />
      <span className="text-small text-text">No pudimos cargar este dato.</span>
      {onRetry && (
        <Button variant="text" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  ) : value === undefined ? (
    <Skeleton className="mt-3 h-8 w-3/4" />
  ) : (
    <>
      <p className={`monto wrap-anywhere ${compact ? 'text-kpi mt-1' : 'text-figure mt-2'} ${negative ? 'text-error' : 'text-text'}`}>{value.replace('$ ', '$\u00a0')}</p>
      {note && <p className="text-small text-text">{note}</p>}
      {detail && <p className={`text-small text-text-muted ${compact ? '' : 'mt-1'}`}>{detail}</p>}
      {trend && <div className="mt-1 text-small">{trend}</div>}
    </>
  )

  return (
    <div className={`min-w-0 rounded-surface border border-t-2 border-border bg-surface ${compact ? 'flex items-center p-4' : dense ? 'px-6 py-4' : 'p-6'} ${accents[accent].border}`}>
      {compact ? (
        <div className="flex w-full items-center gap-3">
          {Icon && <span className={`flex size-12 shrink-0 items-center justify-center rounded-control ${accents[accent].icon}`} aria-hidden><Icon {...iconLg} /></span>}
          <div className="min-w-0 flex-1 text-left">
            <p className="text-small text-text-muted">{label}</p>
            {body}
          </div>
        </div>
      ) : (
        <>
          <p className="flex items-center gap-3 text-small text-text-muted">
            {Icon && <span className={`flex size-8 shrink-0 items-center justify-center rounded-control ${accents[accent].icon}`} aria-hidden><Icon {...iconSm} /></span>}
            {label}
          </p>
          {body}
        </>
      )}
    </div>
  )
}
