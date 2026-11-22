import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { iconSm } from '../components/icons'

/**
 * Variacion contra el periodo anterior (la de la vista previa de la version 1.0.0): flecha, signo
 * y texto; el color nunca es el unico indicador. En costos y gastos subir es la mala noticia.
 */
export function Variation({ value, label, lowerIsBetter = false }: { value: number; label: string; lowerIsBetter?: boolean }) {
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus
  const good = lowerIsBetter ? value < 0 : value > 0
  const tone = value === 0 ? 'text-text-muted' : good ? 'text-success-ink' : 'text-error'
  const direction = value > 0 ? 'Subió' : value < 0 ? 'Bajó' : 'Sin cambio,'
  return (
    <span className="flex flex-wrap items-center gap-1 text-text-muted">
      <Icon {...iconSm} className={`shrink-0 ${tone}`} aria-hidden />
      <span className="sr-only">{direction} </span>
      <span className={`tabular font-semibold ${tone}`}>{value > 0 ? '+' : value < 0 ? '-' : ''}{Math.abs(value)} %</span>
      <span>vs. {label}</span>
    </span>
  )
}
