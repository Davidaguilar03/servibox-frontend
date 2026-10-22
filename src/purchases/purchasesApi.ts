import type { TreasuryMovement } from '../accounts/accountsApi'
import { apiFetch } from '../lib/api'
import type { Counterparty } from '../sales/salesApi'

// Consultas de Compras. Nombres iguales a los DTO del backend (PurchaseResponse,
// PurchaseRequest). La clave ['purchases'] es la misma que usa Cuentas: es la misma respuesta.

export const PURCHASES_KEY = ['purchases']
export const SUPPLIERS_KEY = ['counterparties', 'PROVEEDOR']

/** `PurchaseResponse` del backend. */
export interface Purchase {
  id: number
  /** Numero de la factura que expidio el proveedor, unico por tenant. */
  invoiceNumber: string
  supplier: Counterparty
  invoiceDate: string
  /** Solo en credito; null en contado. */
  dueDate: string | null
  paymentType: 'CONTADO' | 'CREDITO'
  paymentMethod: string | null
  status: 'PAGADA' | 'PENDIENTE' | 'ANULADA'
  /** Sin IVA. */
  subtotal: number
  /** IVA descontable. */
  ivaTotal: number
  total: number
  /** Lo que falta por pagar; 0 en una ANULADA. */
  pendingBalance: number
  details: Array<{
    id: number
    productId: number | null
    productCode: string | null
    productDescription: string | null
    quantity: number
    /** Costo unitario sin IVA. */
    price: number
    ivaAmount: number
  }>
}

/** Cuerpo de `POST /api/purchases`. */
export interface PurchaseRequest {
  supplierId: number | null
  invoiceNumber: string
  invoiceDate: string
  /** Solo en credito. */
  dueDate?: string
  paymentType: Purchase['paymentType']
  /** Solo en contado. */
  accountId?: number
  paymentMethod?: string
  details: Array<{ productId: number; quantity: number; price: number }>
}

export const fetchPurchaseInvoices = () => apiFetch<Purchase[]>('/purchases')

/** Pagos de compras entre desde y hasta (`yyyy-MM-dd`): el contado y los pagos a credito. */
export const fetchPurchasePayments = (desde: string, hasta: string) =>
  apiFetch<TreasuryMovement[]>(`/treasury/movements?category=PAGO_COMPRA&desde=${desde}&hasta=${hasta}`)

/** Proveedores del tenant (PROVEEDOR y AMBOS). */
export const fetchSuppliers = () => apiFetch<Counterparty[]>('/counterparties?role=PROVEEDOR')

/** 409 por numero repetido o por saldo insuficiente en la cuenta de contado. */
export const createPurchase = (request: PurchaseRequest) =>
  apiFetch<Purchase>('/purchases', { method: 'POST', body: request })

/** 404 si no existe o es de otro tenant. */
export const fetchPurchase = (id: number) => apiFetch<Purchase>(`/purchases/${id}`)

/** Pagos activos de una compra (el contado o los pagos a credito). Los de una anulada no salen. */
export const fetchPurchaseMovements = (purchaseId: number) =>
  apiFetch<TreasuryMovement[]>(`/treasury/movements?purchaseId=${purchaseId}&category=PAGO_COMPRA`)

/** Pago a una compra PENDIENTE. Responde el movimiento PAGO_COMPRA creado; 409 si la cuenta no alcanza. */
export const createPurchasePayment = (purchaseId: number, request: { accountId: number; amount: number; date: string }) =>
  apiFetch<TreasuryMovement>(`/purchases/${purchaseId}/payments`, { method: 'POST', body: request })

/** Anula la compra: quita el stock que sumo y revierte el saldo de sus pagos. 400 si ese stock ya se vendio. */
export const annulPurchase = (purchaseId: number) =>
  apiFetch<Purchase>(`/purchases/${purchaseId}/annul`, { method: 'POST' })
