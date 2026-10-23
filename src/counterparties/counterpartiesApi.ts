import { apiFetch } from '../lib/api'
import type { Counterparty, DocumentType } from '../sales/salesApi'

// Consultas de Clientes y Proveedores. El GET y el POST de terceros ya viven en salesApi y
// purchasesApi (los usan las facturas); aqui solo lo que agregan estas pantallas.

/** La misma clave de Nueva factura de venta: es la misma respuesta. */
export const CUSTOMERS_KEY = ['counterparties', 'CLIENTE']

/** Cuerpo de `PUT /api/counterparties/{id}`. Sin role: el backend no lo edita. */
export interface CounterpartyUpdateRequest {
  name: string
  documentType: DocumentType
  documentNumber: string
  email: string | null
  phone: string | null
}

/** 400 por un dato invalido, 409 si el documento es de otro tercero o es el Consumidor final. */
export const updateCounterparty = (id: number, request: CounterpartyUpdateRequest) =>
  apiFetch<Counterparty>(`/counterparties/${id}`, { method: 'PUT', body: request })

/**
 * Lo que usa el saldo de una factura de `GET /api/sales` o `GET /api/purchases`: la venta trae
 * `customer` y la compra `supplier`, los dos con el tercero completo. Se piden con las claves
 * de los listados (`['sales']`, `['purchases']`) porque es la misma respuesta.
 */
export interface BalanceInvoice {
  status: 'PAGADA' | 'PENDIENTE' | 'ANULADA'
  pendingBalance: number
  customer?: { id: number } | null
  supplier?: { id: number } | null
}

export const fetchSaleBalances = () => apiFetch<BalanceInvoice[]>('/sales')
export const fetchPurchaseBalances = () => apiFetch<BalanceInvoice[]>('/purchases')
