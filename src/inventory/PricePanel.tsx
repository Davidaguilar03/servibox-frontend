import { EMPTY_VALUE, formatCurrency } from '../lib/format'
import type { FinancialSettings } from '../settings/settingsApi'
import { fractionToPercent } from './categoryForm'
import type { InventoryCategory } from './inventoryApi'
import { suggestedPrice, vatRateOf } from './pricing'

interface PricePanelProps {
  /** Costo de compra escrito y valido; null si falta o no es un numero. */
  cost: number | null
  category: InventoryCategory | undefined
  settings: FinancialSettings | undefined
}

/**
 * "Como se calcula el precio": resumen en vivo del formulario de producto con la misma
 * formula del backend (`pricing.ts`). Sin costo, categoria o configuracion muestra "—".
 */
export function PricePanel({ cost, category, settings }: PricePanelProps) {
  const ready = cost !== null && category !== undefined && settings !== undefined
  const result = ready
    ? suggestedPrice({
        purchaseCost: cost,
        vatRate: vatRateOf(category.taxTypes),
        targetMargin: category.targetMargin,
        expensesRate: settings.expensesRate,
        dianRate: settings.dianRate,
        icaRate: settings.icaRate,
      })
    : null
  const margin = category?.targetMargin ?? null

  return (
    <aside className="rounded-surface border border-border bg-surface p-6" aria-labelledby="price-panel-title">
      <h2 id="price-panel-title" className="text-section text-text">
        Cómo se calcula el precio
      </h2>
      <dl className="mt-4 flex flex-col gap-3 text-body" aria-live="polite">
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-text-muted">Costo de compra</dt>
          <dd className="monto text-text">{cost === null ? EMPTY_VALUE : formatCurrency(cost)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-text-muted">IVA del costo</dt>
          <dd className="monto text-text">{result ? formatCurrency(result.taxAmount) : EMPTY_VALUE}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-text-muted">Margen de la categoría</dt>
          <dd className="tabular text-text">{category ? `${fractionToPercent(margin ?? 0)} %` : EMPTY_VALUE}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-border pt-4">
          <dt className="font-semibold text-text">Precio sugerido sin IVA</dt>
          <dd className="text-figure text-text">{result ? formatCurrency(result.suggestedPrice) : EMPTY_VALUE}</dd>
        </div>
      </dl>
      {!ready && (
        <p className="mt-4 text-small text-text-muted">Elige una categoría y escribe el costo para ver el precio sugerido.</p>
      )}
      <p className="mt-4 text-small text-text-muted">El precio se recalcula al guardar con tu configuración actual.</p>
    </aside>
  )
}
