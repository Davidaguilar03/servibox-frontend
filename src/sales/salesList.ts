import type { Sale } from '../dashboard/dashboardApi'
import { normalizeText } from '../lib/text'
import type { Movement } from './salesApi'

// Logica del listado de facturas de venta. Reglas en docs/ai-context/03-DECISIONS.md.

export type Period = 'este-mes' | 'mes-anterior' | 'este-ano' | 'todas'

export interface SalesFilters {
  q: string
  /** Las anuladas no estan en el listado: van a la Papelera. */
  estado: Exclude<Sale['status'], 'ANULADA'> | ''
  pago: Sale['paymentType'] | ''
  periodo: Period
  pagina: number
}

export const DEFAULT_FILTERS: SalesFilters = { q: '', estado: '', pago: '', periodo: 'este-mes', pagina: 1 }

/** Lo que deja Limpiar: sin busqueda, todos los estados, todas las formas de pago y periodos. */
export const CLEARED_FILTERS: SalesFilters = { ...DEFAULT_FILTERS, periodo: 'todas' }

const statuses: Array<SalesFilters['estado']> = ['PAGADA', 'PENDIENTE']
const paymentTypes: Array<Sale['paymentType']> = ['CONTADO', 'CREDITO']
const periods: Period[] = ['este-mes', 'mes-anterior', 'este-ano', 'todas']

export const CONSUMIDOR_FINAL = 'Consumidor final'

function pick<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** Filtros leidos de la query string; un valor desconocido vale lo de por defecto. */
export function parseFilters(params: URLSearchParams): SalesFilters {
  const page = Number(params.get('pagina'))
  return {
    q: params.get('q') ?? '',
    estado: pick<SalesFilters['estado']>(params.get('estado'), statuses, ''),
    pago: pick<SalesFilters['pago']>(params.get('pago'), paymentTypes, ''),
    periodo: pick(params.get('periodo'), periods, DEFAULT_FILTERS.periodo),
    pagina: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** Query string de los filtros, sin los valores por defecto. */
export function filtersToParams(filters: SalesFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.pago) params.set('pago', filters.pago)
  if (filters.periodo !== DEFAULT_FILTERS.periodo) params.set('periodo', filters.periodo)
  if (filters.pagina > 1) params.set('pagina', String(filters.pagina))
  return params
}

/** Del primer dia del mes de hoy a hoy, para los indicadores del mes. */
export function monthRange(today: string) {
  return { desde: `${today.slice(0, 8)}01`, hasta: today }
}

/** Prefijo de `invoiceDate` que cubre el periodo, o null si es Todas. */
export function periodPrefix(period: Period, today: string): string | null {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  switch (period) {
    case 'este-mes':
      return today.slice(0, 7)
    case 'mes-anterior': {
      const previousYear = month === 1 ? year - 1 : year
      const previousMonth = month === 1 ? 12 : month - 1
      return `${previousYear}-${String(previousMonth).padStart(2, '0')}`
    }
    case 'este-ano':
      return today.slice(0, 4)
    case 'todas':
      return null
  }
}

export function customerName(sale: Sale): string {
  return sale.customer?.name ?? CONSUMIDOR_FINAL
}

/** Por fecha de factura descendente y, a igual fecha, por numero descendente. */
export function sortSales(sales: Sale[]): Sale[] {
  return [...sales].sort(
    (a, b) =>
      b.invoiceDate.localeCompare(a.invoiceDate) ||
      b.invoiceNumber.localeCompare(a.invoiceNumber, undefined, { numeric: true }),
  )
}

/** Las facturas del listado: todas menos las anuladas, que estan en la Papelera. */
export function activeSales(sales: Sale[]): Sale[] {
  return sales.filter((sale) => sale.status !== 'ANULADA')
}

/** Aplica busqueda, estado, forma de pago y periodo, y ordena. La pagina va aparte. */
export function filterSales(sales: Sale[], filters: SalesFilters, today: string): Sale[] {
  const prefix = periodPrefix(filters.periodo, today)
  const query = normalizeText(filters.q)
  return sortSales(
    activeSales(sales).filter(
      (sale) =>
        (prefix === null || sale.invoiceDate.startsWith(prefix)) &&
        (!filters.estado || sale.status === filters.estado) &&
        (!filters.pago || sale.paymentType === filters.pago) &&
        (!query ||
          normalizeText(sale.invoiceNumber).includes(query) ||
          normalizeText(customerName(sale)).includes(query)),
    ),
  )
}

/** Por cobrar: saldo pendiente de las facturas PENDIENTE y cuantas son. */
export function receivable(sales: Sale[]) {
  const pending = sales.filter((sale) => sale.status === 'PENDIENTE')
  return { amount: pending.reduce((sum, sale) => sum + sale.pendingBalance, 0), count: pending.length }
}

/**
 * Abonos del mes: recaudos de venta cuya factura es a credito. El recaudo de una venta de
 * contado es el pago completo al emitirla, no un abono.
 */
export function creditCollections(movements: Movement[], sales: Sale[]): number {
  const creditSaleIds = new Set(sales.filter((sale) => sale.paymentType === 'CREDITO').map((sale) => sale.id))
  return movements
    .filter(
      (movement) =>
        movement.category === 'RECAUDO_VENTA' && movement.saleId !== null && creditSaleIds.has(movement.saleId),
    )
    .reduce((sum, movement) => sum + movement.amount, 0)
}
