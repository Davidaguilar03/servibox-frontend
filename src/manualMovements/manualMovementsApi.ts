import type { MovementCategory, TreasuryMovement } from '../accounts/accountsApi'
import { apiFetch } from '../lib/api'

// Gastos operativos e ingresos ocasionales: los movimientos manuales de tesoreria.

export type ManualCategory = Extract<MovementCategory, 'GASTO_OPERATIVO' | 'INGRESO_OCASIONAL'>

/** `MovementRequest` del backend, para crear y para editar (PUT con el movimiento completo). */
export interface ManualMovementRequest {
  accountId: number
  category: ManualCategory
  concept: string
  amount: number
  /** `yyyy-MM-dd`. Se envia siempre: en un PUT sin fecha el backend pondria la de hoy. */
  date: string
  notes: string | null
}

/** Movimientos activos de la categoria; sin desde ni hasta, todos. */
export function fetchManualMovements(category: ManualCategory, desde: string | null, hasta: string | null) {
  const range = desde && hasta ? `&desde=${desde}&hasta=${hasta}` : ''
  return apiFetch<TreasuryMovement[]>(`/treasury/movements?category=${category}${range}`)
}

export const createManualMovement = (body: ManualMovementRequest) =>
  apiFetch<TreasuryMovement>('/treasury/movements', { method: 'POST', body })

export const updateManualMovement = (id: number, body: ManualMovementRequest) =>
  apiFetch<TreasuryMovement>(`/treasury/movements/${id}`, { method: 'PUT', body })

export const deleteManualMovement = (id: number) =>
  apiFetch<void>(`/treasury/movements/${id}`, { method: 'DELETE' })
