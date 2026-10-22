import type { TreasuryMovement } from '../accounts/accountsApi'
import { normalizeText } from '../lib/text'
import { periodPrefix, type SalesFilters } from '../sales/salesList'
import type { Purchase } from './purchasesApi'

// Logica del listado de facturas de compra. Los filtros y su query string son los de
// Facturas de venta (salesList.ts). Reglas en docs/ai-context/03-DECISIONS.md.

/** Por fecha de factura descendente y, a igual fecha, por id descendente. */
export function sortPurchases(purchases: Purchase[]): Purchase[] {
  return [...purchases].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.id - a.id)
}

/** Las facturas del listado: todas menos las anuladas, que estan en la Papelera. */
export function activePurchases(purchases: Purchase[]): Purchase[] {
  return purchases.filter((purchase) => purchase.status !== 'ANULADA')
}

/** Aplica busqueda, estado, forma de pago y periodo, y ordena. La pagina va aparte. */
export function filterPurchases(purchases: Purchase[], filters: SalesFilters, today: string): Purchase[] {
  const prefix = periodPrefix(filters.periodo, today)
  const query = normalizeText(filters.q)
  return sortPurchases(
    activePurchases(purchases).filter(
      (purchase) =>
        (prefix === null || purchase.invoiceDate.startsWith(prefix)) &&
        (!filters.estado || purchase.status === filters.estado) &&
        (!filters.pago || purchase.paymentType === filters.pago) &&
        (!query ||
          normalizeText(purchase.invoiceNumber).includes(query) ||
          normalizeText(purchase.supplier.name).includes(query)),
    ),
  )
}

/** Por pagar: saldo pendiente de las facturas PENDIENTE y cuantas son. */
export function payable(purchases: Purchase[]) {
  const pending = purchases.filter((purchase) => purchase.status === 'PENDIENTE')
  return { amount: pending.reduce((sum, purchase) => sum + purchase.pendingBalance, 0), count: pending.length }
}

/**
 * Pagos del mes: pagos de compra cuya factura es a credito. El egreso de una compra de
 * contado es su pago completo al registrarla, no un pago a un saldo.
 */
export function creditPayments(movements: TreasuryMovement[], purchases: Purchase[]): number {
  const creditIds = new Set(purchases.filter((purchase) => purchase.paymentType === 'CREDITO').map((purchase) => purchase.id))
  return movements
    .filter(
      (movement) =>
        movement.category === 'PAGO_COMPRA' && movement.purchaseId !== null && creditIds.has(movement.purchaseId),
    )
    .reduce((sum, movement) => sum + movement.amount, 0)
}
