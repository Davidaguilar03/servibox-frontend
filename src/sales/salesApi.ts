import type { Sale } from '../dashboard/dashboardApi'
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

export type DocumentType = 'CC' | 'NIT' | 'CE' | 'RUT' | 'PASAPORTE'

/** `CounterpartyResponse` del backend. */
export interface Counterparty {
  id: number
  role: 'CLIENTE' | 'PROVEEDOR' | 'AMBOS'
  name: string
  documentType: DocumentType
  documentNumber: string
  email: string | null
  phone: string | null
}

export interface CounterpartyRequest {
  role: 'CLIENTE'
  name: string
  documentType: DocumentType
  documentNumber: string
  email?: string
  phone?: string
}

/** Clientes del tenant (CLIENTE y AMBOS), con el Consumidor final incluido. */
export const fetchCustomers = () => apiFetch<Counterparty[]>('/counterparties?role=CLIENTE')

/** 201 si el documento es nuevo; 200 si era proveedor y pasa a AMBOS; 409 si ya es cliente. */
export const createCounterparty = (request: CounterpartyRequest) =>
  apiFetch<Counterparty>('/counterparties', { method: 'POST', body: request })

/** El numero que asignaria ahora el backend. No lo reserva. */
export const fetchNextInvoiceNumber = () => apiFetch<{ invoiceNumber: string }>('/sales/next-invoice-number')

/** Cuerpo de `POST /api/sales`. Sin `invoiceNumber`: el backend asigna el consecutivo. */
export interface SaleRequest {
  customerId: number | null
  invoiceDate: string
  dueDate?: string
  paymentType: Sale['paymentType']
  accountId?: number
  paymentMethod?: string
  details: Array<{ productId: number; quantity: number; price: number }>
}

export const createSale = (request: SaleRequest) => apiFetch<Sale>('/sales', { method: 'POST', body: request })
