import { normalizeText } from '../lib/text'
import { periodPrefix, type Period } from '../sales/salesList'

// Logica de las papeleras de ventas y compras. Reglas en docs/ai-context/03-DECISIONS.md.

/** Lo que la papelera usa de una venta o una compra. */
export interface TrashInvoice {
  id: number
  invoiceNumber: string
  invoiceDate: string
  paymentType: 'CONTADO' | 'CREDITO'
  status: 'PAGADA' | 'PENDIENTE' | 'ANULADA'
  total: number
}

export interface TrashFilters {
  q: string
  pago: TrashInvoice['paymentType'] | ''
  periodo: Period
  pagina: number
}

/** En la papelera el periodo por defecto es Todas: se busca una factura, no un mes. */
export const DEFAULT_TRASH_FILTERS: TrashFilters = { q: '', pago: '', periodo: 'todas', pagina: 1 }

const paymentTypes: Array<TrashInvoice['paymentType']> = ['CONTADO', 'CREDITO']
const periods: Period[] = ['este-mes', 'mes-anterior', 'este-ano', 'todas']

/** Filtros leidos de la query string; un valor desconocido vale lo de por defecto. */
export function parseTrashFilters(params: URLSearchParams): TrashFilters {
  const page = Number(params.get('pagina'))
  const pago = params.get('pago') as TrashFilters['pago']
  const periodo = params.get('periodo') as Period
  return {
    q: params.get('q') ?? '',
    pago: paymentTypes.includes(pago as TrashInvoice['paymentType']) ? pago : '',
    periodo: periods.includes(periodo) ? periodo : DEFAULT_TRASH_FILTERS.periodo,
    pagina: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** Query string de los filtros, sin los valores por defecto. */
export function trashFiltersToParams(filters: TrashFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.pago) params.set('pago', filters.pago)
  if (filters.periodo !== DEFAULT_TRASH_FILTERS.periodo) params.set('periodo', filters.periodo)
  if (filters.pagina > 1) params.set('pagina', String(filters.pagina))
  return params
}

/** Solo las anuladas, por fecha de factura descendente y, a igual fecha, por id descendente. */
export function annulledInvoices<T extends TrashInvoice>(invoices: T[]): T[] {
  return invoices
    .filter((invoice) => invoice.status === 'ANULADA')
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.id - a.id)
}

/** Anuladas que cumplen la busqueda (numero o tercero), la forma de pago y el periodo. */
export function filterTrash<T extends TrashInvoice>(
  invoices: T[],
  filters: TrashFilters,
  today: string,
  partyName: (invoice: T) => string,
): T[] {
  const prefix = periodPrefix(filters.periodo, today)
  const query = normalizeText(filters.q)
  return annulledInvoices(invoices).filter(
    (invoice) =>
      (prefix === null || invoice.invoiceDate.startsWith(prefix)) &&
      (!filters.pago || invoice.paymentType === filters.pago) &&
      (!query || normalizeText(invoice.invoiceNumber).includes(query) || normalizeText(partyName(invoice)).includes(query)),
  )
}
