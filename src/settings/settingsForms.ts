import { businessNameError, nitError, normalizeNit, phoneError } from '../auth/registerForm'
import type { InventoryCategory } from '../inventory/inventoryApi'
import type { FinancialSettings, TenantProfile, TenantProfileRequest } from './settingsApi'

// Formularios de Configuracion. Reglas en docs/ai-context/03-DECISIONS.md.

export type SettingsTab = 'datos' | 'usuarios' | 'financiera'

export const SETTINGS_TABS: Array<{ value: SettingsTab; label: string }> = [
  { value: 'datos', label: 'Datos de la serviteca' },
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'financiera', label: 'Configuración financiera' },
]

/** La pestana de `?tab=`; un valor desconocido o ausente es Datos de la serviteca. */
export function parseSettingsTab(value: string | null): SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.value === value) ? (value as SettingsTab) : 'datos'
}

// Datos de la serviteca.

export interface TenantFormValues {
  name: string
  nit: string
  phone: string
}

export type TenantFormErrors = Partial<Record<keyof TenantFormValues, string>>

export function tenantFormFrom(profile: TenantProfile): TenantFormValues {
  return { name: profile.name, nit: profile.nit ?? '', phone: profile.phone ?? '' }
}

/** Las reglas del registro, con NIT y telefono opcionales. El NIT se valida ya normalizado. */
export function validateTenantForm(values: TenantFormValues): TenantFormErrors {
  const errors: TenantFormErrors = {}
  const name = businessNameError(values.name)
  if (name) errors.name = name
  const nit = normalizeNit(values.nit)
  const nitMessage = nit ? nitError(nit) : undefined
  if (nitMessage) errors.nit = nitMessage
  const phone = values.phone.trim()
  const phoneMessage = phone ? phoneError(phone) : undefined
  if (phoneMessage) errors.phone = phoneMessage
  return errors
}

/** Cuerpo del PUT: nombre recortado, NIT normalizado y los opcionales vacios como null. */
export function buildTenantRequest(values: TenantFormValues): TenantProfileRequest {
  const nit = normalizeNit(values.nit)
  const phone = values.phone.trim()
  return { name: values.name.trim(), nit: nit || null, phone: phone || null }
}

// Configuracion financiera.

export type FinancialField = keyof FinancialSettings

export type FinancialFormValues = Record<FinancialField, string>

export type FinancialFormErrors = Partial<Record<FinancialField, string>>

/**
 * Unidades que ve el usuario y su conversion a la fraccion del backend: porcentajes de 0 a
 * 100 (dividir por 100) y el ICA en por mil de 0 a 1000 (dividir por 1000). El ICA admite 3
 * decimales y no 4: la columna guarda 6 decimales de la fraccion.
 */
export const FINANCIAL_FIELDS: Array<{ field: FinancialField; scale: number; max: number; decimals: number }> = [
  { field: 'expensesRate', scale: 100, max: 100, decimals: 4 },
  { field: 'dianRate', scale: 100, max: 100, decimals: 4 },
  { field: 'icaRate', scale: 1000, max: 1000, decimals: 3 },
  { field: 'cardCommissionRate', scale: 100, max: 100, decimals: 4 },
]

/** 8.2 o 8,2 a 8.2; NaN si no es un numero no negativo con coma o punto decimal. */
export function parseDecimal(text: string): number {
  const clean = text.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(clean) ? Number(clean) : Number.NaN
}

const decimalsOf = (text: string) => text.trim().replace(',', '.').split('.')[1]?.length ?? 0

/** Numero con coma decimal y sin ceros sobrantes: 8.2 es "8,2". */
export function formatDecimal(value: number, decimals = 4): string {
  return String(Number(value.toFixed(decimals))).replace('.', ',')
}

/** De la fraccion del backend a lo que ve el usuario: 0.0082 de ICA es "8,2". */
export function financialFormFrom(settings: FinancialSettings): FinancialFormValues {
  const values = {} as FinancialFormValues
  for (const { field, scale, decimals } of FINANCIAL_FIELDS) {
    values[field] = formatDecimal((settings[field] ?? 0) * scale, decimals)
  }
  return values
}

export function validateFinancialForm(values: FinancialFormValues): FinancialFormErrors {
  const errors: FinancialFormErrors = {}
  for (const { field, max, decimals } of FINANCIAL_FIELDS) {
    const text = values[field]
    const value = parseDecimal(text)
    if (!text.trim()) errors[field] = 'Escribe un valor. Usa 0 si no aplica.'
    else if (Number.isNaN(value)) errors[field] = 'Escribe un número mayor o igual a 0, por ejemplo 8,2.'
    else if (decimalsOf(text) > decimals) errors[field] = `Usa máximo ${decimals} decimales.`
    else if (value > max) errors[field] = `Usa un valor entre 0 y ${formatDecimal(max)}.`
  }
  return errors
}

/**
 * De lo que ve el usuario a la fraccion del backend, sin el ruido de la division binaria:
 * con los decimales ya acotados, 8,2 por mil es exactamente 0.0082.
 */
export function buildFinancialRequest(values: FinancialFormValues): FinancialSettings {
  const result = {} as FinancialSettings
  for (const { field, scale } of FINANCIAL_FIELDS) {
    result[field] = Number((parseDecimal(values[field]) / scale).toFixed(10))
  }
  return result
}

/** El backend responde ceros sin configuracion guardada: no distingue "guardada en cero". */
export function isUnconfigured(settings: FinancialSettings): boolean {
  return FINANCIAL_FIELDS.every(({ field }) => !settings[field])
}

/**
 * Categorias cuyo precio sugerido queda igual al costo: solo la condicion de validez del
 * backend (divisor = k - ICA - margen <= 0, con k = (1 - gastos) * (1 - DIAN)), no el precio.
 */
export function categoriesAtCost(settings: FinancialSettings, categories: InventoryCategory[]): InventoryCategory[] {
  const k = (1 - settings.expensesRate) * (1 - settings.dianRate)
  return categories.filter((category) => k - settings.icaRate - (category.targetMargin ?? 0) <= 0)
}
