import type { Account, AccountType } from '../dashboard/dashboardApi'
import { defaultCashAccount } from '../lib/accountPayment'
import { addDays } from '../lib/businessDate'
import { formatCurrency, formatDate } from '../lib/format'
import { validateRange } from '../reports/reports'
import type { TreasuryMovement } from './accountsApi'

// Logica de la pantalla Cuentas. Reglas en docs/ai-context/03-DECISIONS.md.

export type PeriodKey = 'hoy' | 'esta-semana' | 'este-mes' | 'mes-anterior' | 'este-ano' | 'personalizado'

export const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'esta-semana', label: 'Esta semana' },
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'personalizado', label: 'Personalizado' },
]

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  EFECTIVO: 'Efectivo',
  BANCO: 'Banco',
  DIGITAL: 'Digital',
}

/** Valor de `cuenta` en la URL para Todas las cuentas. */
export const ALL_ACCOUNTS = 'todas'

export interface AccountsFilters {
  /** Id de la cuenta, 'todas', o null si la URL no dice (se usa la de por defecto). */
  cuenta: number | typeof ALL_ACCOUNTS | null
  periodo: PeriodKey
  /** Solo con Personalizado. */
  desde: string
  hasta: string
  pagina: number
}

const DEFAULT_PERIOD: PeriodKey = 'este-mes'
const periods = PERIOD_OPTIONS.map((option) => option.value)
const isoDate = /^\d{4}-\d{2}-\d{2}$/

export function parseAccountsFilters(params: URLSearchParams): AccountsFilters {
  const cuenta = params.get('cuenta')
  const id = Number(cuenta)
  const periodo = params.get('periodo') as PeriodKey
  const page = Number(params.get('pagina'))
  const date = (key: string) => {
    const value = params.get(key) ?? ''
    return isoDate.test(value) ? value : ''
  }
  return {
    cuenta: cuenta === ALL_ACCOUNTS ? ALL_ACCOUNTS : Number.isInteger(id) && id > 0 ? id : null,
    periodo: periods.includes(periodo) ? periodo : DEFAULT_PERIOD,
    desde: date('desde'),
    hasta: date('hasta'),
    pagina: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** Query string sin los valores por defecto; desde y hasta solo con Personalizado. */
export function accountsFiltersToParams(filters: AccountsFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.cuenta !== null) params.set('cuenta', String(filters.cuenta))
  if (filters.periodo !== DEFAULT_PERIOD) params.set('periodo', filters.periodo)
  if (filters.periodo === 'personalizado') {
    if (filters.desde) params.set('desde', filters.desde)
    if (filters.hasta) params.set('hasta', filters.hasta)
  }
  if (filters.pagina > 1) params.set('pagina', String(filters.pagina))
  return params
}

/** Lunes 0 a domingo 6 de una fecha `yyyy-MM-dd`, sin pasar por la zona del navegador. */
function weekdayFromMonday(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7
}

/**
 * Rango de un periodo, con `today` en la zona del negocio (`businessToday`). Los que
 * empiezan en el pasado terminan hoy; Mes anterior cubre el mes completo.
 */
export function periodRange(periodo: Exclude<PeriodKey, 'personalizado'>, today: string) {
  const firstOfMonth = `${today.slice(0, 8)}01`
  switch (periodo) {
    case 'hoy':
      return { desde: today, hasta: today }
    case 'esta-semana':
      return { desde: addDays(today, -weekdayFromMonday(today)), hasta: today }
    case 'este-mes':
      return { desde: firstOfMonth, hasta: today }
    case 'mes-anterior': {
      const lastOfPrevious = addDays(firstOfMonth, -1)
      return { desde: `${lastOfPrevious.slice(0, 8)}01`, hasta: lastOfPrevious }
    }
    case 'este-ano':
      return { desde: `${today.slice(0, 4)}-01-01`, hasta: today }
  }
}

/**
 * Rango activo y si es consultable: los periodos fijos siempre lo son; Personalizado
 * necesita las dos fechas, desde no posterior a hasta y a lo sumo 366 dias (el limite del
 * reporte, que es el mismo rango que se exporta).
 */
export function activeRange(filters: AccountsFilters, today: string) {
  const { desde, hasta } = filters.periodo === 'personalizado' ? filters : periodRange(filters.periodo, today)
  const { errors, valid } = validateRange(desde, hasta)
  return { desde, hasta, errors, valid }
}

/** Nombre del periodo para el titulo: "Este mes" o "01/10/2026 a 18/10/2026". */
export function periodLabel(filters: AccountsFilters): string {
  if (filters.periodo === 'personalizado') {
    return filters.desde && filters.hasta ? `${formatDate(filters.desde)} a ${formatDate(filters.hasta)}` : 'Personalizado'
  }
  return PERIOD_OPTIONS.find((option) => option.value === filters.periodo)?.label ?? ''
}

/**
 * Cuenta seleccionada: la de la URL si existe; si no, la primera EFECTIVO por id; si no hay,
 * la primera por id. null es Todas las cuentas (o ninguna cuenta).
 */
export function selectedAccountId(cuenta: AccountsFilters['cuenta'], accounts: Account[]): number | null {
  if (cuenta === ALL_ACCOUNTS) return null
  if (cuenta !== null && accounts.some((account) => account.id === cuenta)) return cuenta
  const byId = [...accounts].sort((a, b) => a.id - b.id)
  return (defaultCashAccount(byId) ?? byId[0])?.id ?? null
}

/** Movimientos de la cuenta (o todos con null), por fecha descendente y luego id descendente. */
export function accountMovements(movements: TreasuryMovement[], accountId: number | null): TreasuryMovement[] {
  return movements
    .filter((movement) => accountId === null || movement.accountId === accountId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

/** Ingresos y egresos de los movimientos dados, transferencias incluidas. */
export function periodTotals(movements: TreasuryMovement[]) {
  return movements.reduce(
    (totals, movement) =>
      movement.type === 'INGRESO'
        ? { ...totals, income: totals.income + movement.amount }
        : { ...totals, expense: totals.expense + movement.amount },
    { income: 0, expense: 0 },
  )
}

/** "+$ 100.000" o "-$ 100.000": el signo siempre visible, no solo el color. */
export function formatSignedAmount(movement: Pick<TreasuryMovement, 'type' | 'amount'>): string {
  return movement.type === 'INGRESO' ? `+${formatCurrency(movement.amount)}` : formatCurrency(-movement.amount)
}

export interface OriginContext {
  /** Todos los movimientos del periodo, para encontrar la otra pata de una transferencia. */
  movements: TreasuryMovement[]
  /** Numero de factura por id; undefined si no se cargaron o fallaron. */
  saleNumbers?: Map<number, string>
  purchaseNumbers?: Map<number, string>
}

/**
 * Origen del movimiento. Ventas y compras con su numero de factura; gastos, ingresos
 * ocasionales y transferencias no tienen consecutivo en el backend, asi que no se inventa
 * uno: la transferencia nombra la otra cuenta, buscando su otra pata (el INGRESO apunta al
 * EGRESO con relatedMovementId).
 */
export function movementOrigin(movement: TreasuryMovement, context: OriginContext): string {
  const withNumber = (label: string, number: string | undefined) => (number ? `${label} ${number}` : label)
  switch (movement.category) {
    case 'RECAUDO_VENTA':
      return withNumber('VENTA', movement.saleId === null ? undefined : context.saleNumbers?.get(movement.saleId))
    case 'PAGO_COMPRA':
      return withNumber(
        'COMPRA',
        movement.purchaseId === null ? undefined : context.purchaseNumbers?.get(movement.purchaseId),
      )
    case 'GASTO_OPERATIVO':
      return 'GASTO OPERATIVO'
    case 'INGRESO_OCASIONAL':
      return 'INGRESO OCASIONAL'
    case 'TRANSFERENCIA': {
      const other =
        movement.type === 'INGRESO'
          ? context.movements.find((item) => item.id === movement.relatedMovementId)
          : context.movements.find((item) => item.relatedMovementId === movement.id)
      if (!other?.accountName) return 'TRANSFERENCIA'
      return `TRANSFERENCIA ${movement.type === 'INGRESO' ? 'desde' : 'a'} ${other.accountName}`
    }
  }
}

export function invoiceNumbers(items: Array<{ id: number; invoiceNumber: string }> | undefined) {
  return items ? new Map(items.map((item) => [item.id, item.invoiceNumber])) : undefined
}
