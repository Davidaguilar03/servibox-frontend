import { formatCurrency, formatDate } from '../lib/format'
import { round2 } from './newSale'
import type { Movement, SaleDetail } from './salesApi'

// Logica del detalle de factura de venta. Reglas en docs/ai-context/03-DECISIONS.md.

/**
 * Registrar abono solo en una PENDIENTE (el backend rechaza las demas). Anular en una
 * PAGADA o PENDIENTE, con o sin abonos. Una ANULADA queda en solo lectura.
 */
export function saleActions(sale: Pick<SaleDetail, 'status'>) {
  return { canCollect: sale.status === 'PENDIENTE', canAnnul: sale.status !== 'ANULADA' }
}

/** Id de la ruta: solo digitos; cualquier otra cosa es una factura que no existe. */
export function parseSaleId(value: string | undefined): number | null {
  return value && /^\d+$/.test(value) ? Number(value) : null
}

/**
 * Resumen de la factura. Abonado es total menos `pendingBalance`, y el saldo es el
 * `pendingBalance` del backend. En una ANULADA el backend fija el saldo en 0 y oculta sus
 * movimientos, asi que abonado y saldo no aplican (null).
 */
export function saleSummary(sale: Pick<SaleDetail, 'subtotal' | 'total' | 'pendingBalance' | 'status'>) {
  const annulled = sale.status === 'ANULADA'
  return {
    subtotal: sale.subtotal,
    iva: round2(sale.total - sale.subtotal),
    total: sale.total,
    paid: annulled ? null : round2(sale.total - sale.pendingBalance),
    pending: annulled ? null : sale.pendingBalance,
  }
}

/** Total de una linea: precio por cantidad mas su IVA congelado. */
export function lineTotal(line: Pick<SaleDetail['details'][number], 'price' | 'quantity' | 'ivaAmount'>): number {
  return round2(line.price * line.quantity + line.ivaAmount)
}

/** Recaudos por fecha descendente y, a igual fecha, el mas reciente primero. */
export function sortCollections<M extends Pick<Movement, 'id' | 'date'>>(movements: M[]): M[] {
  return [...movements].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

/** Fechas validas de un abono: desde la fecha de la factura hasta hoy (Bogota). */
export function collectionDateRange(invoiceDate: string, today: string) {
  return { min: invoiceDate, max: today }
}

export interface CollectionDraft {
  accountId: number | null
  amount: string
  date: string
}

export interface CollectionErrors {
  account?: string
  amount?: string
  date?: string
}

export function validateCollection(draft: CollectionDraft, pending: number, range: { min: string; max: string }) {
  const errors: CollectionErrors = {}
  if (draft.accountId === null) errors.account = 'Elige la cuenta donde entra el dinero.'
  const amount = Number(draft.amount)
  if (draft.amount.trim() === '' || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'El valor debe ser mayor que cero.'
  } else if (round2(amount) > round2(pending)) {
    errors.amount = `No puede superar el saldo pendiente de ${formatCurrency(pending)}`
  }
  if (!draft.date || draft.date < range.min || draft.date > range.max) {
    errors.date = `La fecha debe estar entre el ${formatDate(range.min)} y el ${formatDate(range.max)}.`
  }
  return { errors, valid: Object.keys(errors).length === 0 }
}

/** Cuerpo exacto de `POST /api/sales/{id}/collections`. */
export function buildCollectionRequest(draft: CollectionDraft) {
  return { accountId: draft.accountId ?? 0, amount: Number(draft.amount), date: draft.date }
}
