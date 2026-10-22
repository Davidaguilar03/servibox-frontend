import type { Account, AccountType } from '../dashboard/dashboardApi'
import { apiFetch } from '../lib/api'

// Consultas de Cuentas. Nombres iguales a los DTO del backend (AccountResponse,
// MovementResponse, TransferRequest). Todas cuelgan de la clave ['treasury'].

export const ACCOUNTS_KEY = ['treasury', 'accounts']
export const BALANCE_KEY = ['treasury', 'balance']

export type MovementCategory = 'GASTO_OPERATIVO' | 'INGRESO_OCASIONAL' | 'TRANSFERENCIA' | 'PAGO_COMPRA' | 'RECAUDO_VENTA'

/** `MovementResponse` del backend. */
export interface TreasuryMovement {
  id: number
  accountId: number | null
  accountName: string | null
  type: 'INGRESO' | 'EGRESO'
  category: MovementCategory
  concept: string
  amount: number
  /** `yyyy-MM-dd`. */
  date: string
  notes: string | null
  saleId: number | null
  purchaseId: number | null
  /** Solo en la pata INGRESO de una transferencia: el id de la pata EGRESO. */
  relatedMovementId: number | null
}

/** Solo los campos de `PurchaseResponse` que usa la columna Origen. */
export interface PurchaseSummary {
  id: number
  invoiceNumber: string
}

export interface AccountRequest {
  name: string
  type: AccountType
  initialBalance: number
}

/** `POST /api/treasury/transfers`. No lleva fecha: el backend la fecha hoy (Bogota). */
export interface TransferRequest {
  originAccountId: number
  destinationAccountId: number
  concept?: string
  amount: number
}

/** Movimientos activos de todas las cuentas entre desde y hasta, los dos incluidos. */
export const fetchPeriodMovements = (desde: string, hasta: string) =>
  apiFetch<TreasuryMovement[]>(`/treasury/movements?desde=${desde}&hasta=${hasta}`)

export const fetchPurchases = () => apiFetch<PurchaseSummary[]>('/purchases')

export const createAccount = (body: AccountRequest) =>
  apiFetch<Account>('/treasury/accounts', { method: 'POST', body })

export const createTransfer = (body: TransferRequest) =>
  apiFetch<unknown>('/treasury/transfers', { method: 'POST', body })
