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
  /** Un tercero nuevo es CLIENTE o PROVEEDOR; AMBOS lo asigna el backend. */
  role: 'CLIENTE' | 'PROVEEDOR'
  name: string
  documentType: DocumentType
  documentNumber: string
  email?: string
  phone?: string
}

/** Clientes del tenant (CLIENTE y AMBOS), con el Consumidor final incluido. */
export const fetchCustomers = () => apiFetch<Counterparty[]>('/counterparties?role=CLIENTE')

/** 201 si el documento es nuevo; 200 si tenia el otro rol y pasa a AMBOS; 409 si ya tiene este rol. */
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

/** `SaleResponse` completo de `GET /api/sales/{id}`: cliente con sus datos y las lineas. */
export interface SaleDetail extends Omit<Sale, 'customer'> {
  customer: Counterparty | null
  paymentMethod: string | null
  subtotal: number
  details: Array<{
    id: number
    productId: number | null
    productCode: string | null
    productDescription: string | null
    quantity: number
    price: number
    /** IVA congelado al facturar. */
    ivaAmount: number
  }>
}

/** 404 si no existe o es de otro tenant. */
export const fetchSale = (id: number) => apiFetch<SaleDetail>(`/sales/${id}`)

/** Recaudos activos de una venta (el contado o los abonos). Los de una anulada no salen. */
export const fetchSaleMovements = (saleId: number) =>
  apiFetch<Array<Movement & { accountId: number | null; accountName: string | null }>>(
    `/treasury/movements?saleId=${saleId}&category=RECAUDO_VENTA`,
  )

/** Abono a una factura PENDIENTE. Responde el movimiento RECAUDO_VENTA creado. */
export const createCollection = (saleId: number, request: { accountId: number; amount: number; date: string }) =>
  apiFetch<Movement>(`/sales/${saleId}/collections`, { method: 'POST', body: request })

/** Anula la factura: devuelve el stock y revierte el saldo de sus movimientos. */
export const annulSale = (saleId: number) => apiFetch<SaleDetail>(`/sales/${saleId}/annul`, { method: 'POST' })

/** Saca la factura de la papelera. 409 si una linea ya no tiene stock; 400 si no esta anulada. */
export const restoreSale = (saleId: number) => apiFetch<SaleDetail>(`/sales/${saleId}/restore`, { method: 'POST' })
