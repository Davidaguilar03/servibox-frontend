import { apiFetch } from '../lib/api'

// Configuracion: perfil del tenant y configuracion financiera. Nombres iguales a los DTO del
// backend (TenantProfileResponse, FinancialSettingsRequest y Response).

export const TENANT_KEY = ['tenant']
export const FINANCIAL_SETTINGS_KEY = ['inventory', 'financial-settings']

/** `TenantProfileResponse`. nit y phone son null si no se registraron o se borraron. */
export interface TenantProfile {
  name: string
  slug: string
  nit: string | null
  phone: string | null
}

/** `PUT /api/tenant`: sin slug, que no se puede cambiar. En blanco el backend guarda null. */
export interface TenantProfileRequest {
  name: string
  nit: string | null
  phone: string | null
}

/**
 * Fracciones de 0 a 1. icaRate tambien es una fraccion: 0.0082 son 8,2 por mil. La comision
 * de tarjeta se guarda pero todavia no entra en ningun calculo del backend.
 */
export interface FinancialSettings {
  expensesRate: number
  dianRate: number
  icaRate: number
  cardCommissionRate: number
}

export const fetchTenantProfile = () => apiFetch<TenantProfile>('/tenant')

export const updateTenantProfile = (body: TenantProfileRequest) =>
  apiFetch<TenantProfile>('/tenant', { method: 'PUT', body })

/** Sin configuracion guardada el backend responde todo en cero. */
export const fetchFinancialSettings = () => apiFetch<FinancialSettings>('/inventory/financial-settings')

/** Guarda y recalcula el precio sugerido de todos los productos; responde solo la configuracion. */
export const updateFinancialSettings = (body: FinancialSettings) =>
  apiFetch<FinancialSettings>('/inventory/financial-settings', { method: 'PUT', body })
