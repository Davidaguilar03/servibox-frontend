import type { TreasuryMovement } from '../accounts/accountsApi'
import { accountMovements, periodRange } from '../accounts/accountsView'
import type { Account } from '../dashboard/dashboardApi'
import { parseAmount } from '../inventory/productForm'
import { defaultCashAccount } from '../lib/accountPayment'
import { formatCurrency } from '../lib/format'
import { normalizeText } from '../lib/text'
import { validateRange, type RangeErrors } from '../reports/reports'
import type { ManualCategory, ManualMovementRequest } from './manualMovementsApi'

// Logica de Gastos operativos e Ingresos ocasionales. Reglas en docs/ai-context/03-DECISIONS.md.

export type ManualPeriod = 'este-mes' | 'mes-anterior' | 'este-ano' | 'todas' | 'personalizado'

export const MANUAL_PERIOD_OPTIONS: Array<{ value: ManualPeriod; label: string }> = [
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'todas', label: 'Todas' },
  { value: 'personalizado', label: 'Personalizado' },
]

export interface ManualFilters {
  periodo: ManualPeriod
  /** Solo con Personalizado. */
  desde: string
  hasta: string
  /** Id de la cuenta; null es Todas. */
  cuenta: number | null
  q: string
  pagina: number
}

export const DEFAULT_MANUAL_FILTERS: ManualFilters = {
  periodo: 'este-mes',
  desde: '',
  hasta: '',
  cuenta: null,
  q: '',
  pagina: 1,
}

const periods = MANUAL_PERIOD_OPTIONS.map((option) => option.value)
const isoDate = /^\d{4}-\d{2}-\d{2}$/

export function parseManualFilters(params: URLSearchParams): ManualFilters {
  const periodo = params.get('periodo') as ManualPeriod
  const cuenta = Number(params.get('cuenta'))
  const page = Number(params.get('pagina'))
  const date = (key: string) => {
    const value = params.get(key) ?? ''
    return isoDate.test(value) ? value : ''
  }
  return {
    periodo: periods.includes(periodo) ? periodo : DEFAULT_MANUAL_FILTERS.periodo,
    desde: date('desde'),
    hasta: date('hasta'),
    cuenta: Number.isInteger(cuenta) && cuenta > 0 ? cuenta : null,
    q: params.get('q') ?? '',
    pagina: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** Query string sin los valores por defecto; desde y hasta solo con Personalizado. */
export function manualFiltersToParams(filters: ManualFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.cuenta !== null) params.set('cuenta', String(filters.cuenta))
  if (filters.periodo !== DEFAULT_MANUAL_FILTERS.periodo) params.set('periodo', filters.periodo)
  if (filters.periodo === 'personalizado') {
    if (filters.desde) params.set('desde', filters.desde)
    if (filters.hasta) params.set('hasta', filters.hasta)
  }
  if (filters.pagina > 1) params.set('pagina', String(filters.pagina))
  return params
}

/**
 * Rango que se pide al backend, con los periodos de Cuentas en Bogota. Todas no manda fechas;
 * Personalizado necesita un rango valido (las reglas de Cuentas y Reportes).
 */
export function manualRange(filters: ManualFilters, today: string) {
  if (filters.periodo === 'todas') return { desde: null, hasta: null, errors: {} as RangeErrors, valid: true }
  const { desde, hasta } = filters.periodo === 'personalizado' ? filters : periodRange(filters.periodo, today)
  return { desde, hasta, ...validateRange(desde, hasta) }
}

/** Cuenta y concepto (sin mayusculas ni tildes), por fecha descendente y luego id descendente. */
export function filterManualMovements(movements: TreasuryMovement[], filters: ManualFilters): TreasuryMovement[] {
  const query = normalizeText(filters.q)
  return accountMovements(movements, filters.cuenta).filter(
    (movement) => !query || normalizeText(movement.concept).includes(query),
  )
}

/** Total del periodo y Movimientos: suma de los montos y cantidad de los filtrados. */
export function manualTotals(movements: TreasuryMovement[]) {
  return { amount: movements.reduce((sum, movement) => sum + movement.amount, 0), count: movements.length }
}

// Formulario.

/** Largo de `concepto` y `notas` en la tabla MOVIMIENTOS (VARCHAR 255). */
export const CONCEPT_MAX = 255
export const NOTES_MAX = 255

export interface ManualFormValues {
  concept: string
  date: string
  /** Id como texto; vacio es sin elegir. */
  accountId: string
  amount: string
  notes: string
}

export type ManualFormErrors = Partial<Record<keyof ManualFormValues, string>>

/** Alta: hoy en Bogota y, en gastos, la primera cuenta EFECTIVO por id. */
export function emptyManualForm(category: ManualCategory, today: string, accounts: Account[] | undefined): ManualFormValues {
  const account = category === 'GASTO_OPERATIVO' ? defaultCashAccount(accounts) : undefined
  return { concept: '', date: today, accountId: account ? String(account.id) : '', amount: '', notes: '' }
}

export function formFromMovement(movement: TreasuryMovement): ManualFormValues {
  return {
    concept: movement.concept,
    date: movement.date,
    accountId: movement.accountId === null ? '' : String(movement.accountId),
    amount: String(movement.amount),
    notes: movement.notes ?? '',
  }
}

export function validateManualForm(values: ManualFormValues, today: string): ManualFormErrors {
  const errors: ManualFormErrors = {}
  const concept = values.concept.trim()
  if (!concept) errors.concept = 'Escribe el concepto.'
  else if (concept.length > CONCEPT_MAX) errors.concept = `Usa máximo ${CONCEPT_MAX} caracteres.`
  if (!values.date) errors.date = 'Elige la fecha.'
  else if (values.date > today) errors.date = 'La fecha no puede ser posterior a hoy.'
  if (!values.accountId) errors.accountId = 'Elige la cuenta.'
  if (!values.amount.trim()) errors.amount = 'Escribe el monto.'
  else if (!(parseAmount(values.amount) > 0)) errors.amount = 'El monto debe ser mayor que cero.'
  if (values.notes.trim().length > NOTES_MAX) errors.notes = `Usa máximo ${NOTES_MAX} caracteres.`
  return errors
}

export function buildManualRequest(values: ManualFormValues, category: ManualCategory): ManualMovementRequest {
  const notes = values.notes.trim()
  return {
    accountId: Number(values.accountId),
    category,
    concept: values.concept.trim(),
    amount: parseAmount(values.amount),
    date: values.date,
    notes: notes || null,
  }
}

// Saldos.

export interface BalanceShortfall {
  account: Account
  /** Saldo actual mas lo que esta operacion le devuelve o le suma. */
  available: number
  /** Lo que esta operacion le resta. */
  needed: number
}

type Effect = { accountId: number | null; amount: number; sign: 1 | -1 }

/** +1 si suma al saldo (ingreso), -1 si resta (gasto). */
const signOf = (category: ManualCategory) => (category === 'INGRESO_OCASIONAL' ? 1 : -1)

/**
 * Cuentas que quedarian en negativo. El backend no revisa el saldo de un movimiento manual:
 * editar revierte el efecto anterior en la cuenta anterior y aplica el nuevo en la nueva;
 * eliminar solo revierte. Un saldo que queda justo en cero no avisa.
 */
function shortfalls(effects: Effect[], accounts: Account[] | undefined): BalanceShortfall[] {
  const byAccount = new Map<number, { credits: number; debits: number }>()
  for (const { accountId, amount, sign } of effects) {
    if (accountId === null || !(amount > 0)) continue
    const entry = byAccount.get(accountId) ?? { credits: 0, debits: 0 }
    if (sign > 0) entry.credits += amount
    else entry.debits += amount
    byAccount.set(accountId, entry)
  }
  const result: BalanceShortfall[] = []
  byAccount.forEach(({ credits, debits }, accountId) => {
    const account = accounts?.find((item) => item.id === accountId)
    if (!account) return
    const available = account.currentBalance + credits
    // Una cuenta a la que esta operacion solo le suma no avisa, aunque ya este en negativo.
    if (debits > 0 && debits > available) result.push({ account, available, needed: debits })
  })
  return result
}

/** Aviso del alta o la edicion: `original` es el movimiento que se edita. */
export function saveShortfalls(
  category: ManualCategory,
  values: ManualFormValues,
  accounts: Account[] | undefined,
  original?: TreasuryMovement,
): BalanceShortfall[] {
  const sign = signOf(category)
  const effects: Effect[] = [{ accountId: values.accountId ? Number(values.accountId) : null, amount: parseAmount(values.amount), sign }]
  if (original) effects.push({ accountId: original.accountId, amount: original.amount, sign: sign > 0 ? -1 : 1 })
  return shortfalls(effects, accounts)
}

export function shortfallMessage({ account, available, needed }: BalanceShortfall): string {
  return `Saldo insuficiente en ${account.name}: disponible ${formatCurrency(available)}, necesitas ${formatCurrency(needed)}`
}

/** Que le pasa al saldo de la cuenta al eliminar: un gasto devuelve el monto, un ingreso lo resta. */
export function deleteEffectText(movement: TreasuryMovement, accounts: Account[] | undefined): string {
  const account = accounts?.find((item) => item.id === movement.accountId)
  const name = account?.name ?? movement.accountName ?? 'la cuenta'
  const amount = formatCurrency(movement.amount)
  const isIncome = movement.category === 'INGRESO_OCASIONAL'
  const action = isIncome ? `Se descuentan ${amount} de ${name}` : `Vuelven ${amount} a ${name}`
  if (!account) return `${action}.`
  const after = account.currentBalance + (isIncome ? -movement.amount : movement.amount)
  const negative = after < 0 ? ' La cuenta queda en negativo.' : ''
  return `${action}: su saldo pasa de ${formatCurrency(account.currentBalance)} a ${formatCurrency(after)}.${negative}`
}
