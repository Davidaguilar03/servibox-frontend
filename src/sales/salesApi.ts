import { apiFetch } from '../lib/api'

/** `MovementResponse` del backend, solo los campos que usa Ventas. */
export interface Movement {
  id: number
  type: 'INGRESO' | 'EGRESO'
  category: string
  amount: number
  date: string
  /** Venta de un RECAUDO_VENTA (contado o abono), o null. */
  saleId: number | null
}

/** Recaudos de venta entre desde y hasta (`yyyy-MM-dd`). Los de facturas anuladas no salen. */
export function fetchSaleCollections(desde: string, hasta: string) {
  return apiFetch<Movement[]>(`/treasury/movements?category=RECAUDO_VENTA&desde=${desde}&hasta=${hasta}`)
}
