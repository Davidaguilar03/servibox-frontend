import { normalizeText } from '../lib/text'
import type { Counterparty } from '../sales/salesApi'
import type { BalanceInvoice } from './counterpartiesApi'

// Logica del listado de Clientes y de Proveedores. Reglas en docs/ai-context/03-DECISIONS.md.

/** Documento con el que el backend identifica al Consumidor final (`CounterpartyService`). */
export const CONSUMIDOR_FINAL_DOCUMENT = '222222222222'

/** El Consumidor final lo mantiene el sistema: no se edita. */
export function isSystemCounterparty(counterparty: Pick<Counterparty, 'documentNumber'>): boolean {
  return counterparty.documentNumber === CONSUMIDOR_FINAL_DOCUMENT
}

export interface Balance {
  /** Suma de `pendingBalance` de sus facturas PENDIENTE. */
  amount: number
  /** Cuantas facturas PENDIENTE tiene. */
  count: number
}

export const ZERO_BALANCE: Balance = { amount: 0, count: 0 }

/**
 * Saldo por tercero: solo las facturas PENDIENTE (las pagadas no deben nada y las anuladas
 * quedan en 0 y en la papelera). La venta trae `customer` y la compra `supplier`.
 */
export function balancesByCounterparty(invoices: BalanceInvoice[]): Map<number, Balance> {
  const balances = new Map<number, Balance>()
  for (const invoice of invoices) {
    const id = invoice.customer?.id ?? invoice.supplier?.id
    if (invoice.status !== 'PENDIENTE' || id === undefined) continue
    const current = balances.get(id) ?? ZERO_BALANCE
    balances.set(id, { amount: current.amount + invoice.pendingBalance, count: current.count + 1 })
  }
  return balances
}

export interface CounterpartyIndicators {
  /** Terceros registrados, sin el Consumidor final. */
  total: number
  /** Terceros (Consumidor final incluido) con saldo mayor que cero. */
  withBalance: number
  /** Suma de los saldos de los terceros de la lista. */
  amount: number
}

/** Indicadores sobre la lista completa del rol; no dependen de los filtros. Sin saldos, solo el total. */
export function counterpartyIndicators(
  counterparties: Counterparty[],
  balances: Map<number, Balance> | undefined,
): CounterpartyIndicators {
  const listed = counterparties.map((counterparty) => balances?.get(counterparty.id) ?? ZERO_BALANCE)
  return {
    total: counterparties.filter((counterparty) => !isSystemCounterparty(counterparty)).length,
    withBalance: listed.filter((balance) => balance.amount > 0).length,
    amount: listed.reduce((sum, balance) => sum + balance.amount, 0),
  }
}

export interface CounterpartyFilters {
  q: string
  saldo: '' | 'pendiente'
  orden: 'nombre' | 'saldo'
  pagina: number
}

export const DEFAULT_COUNTERPARTY_FILTERS: CounterpartyFilters = { q: '', saldo: '', orden: 'nombre', pagina: 1 }

/** Filtros leidos de la query string; un valor desconocido vale lo de por defecto. */
export function parseCounterpartyFilters(params: URLSearchParams): CounterpartyFilters {
  const page = Number(params.get('pagina'))
  return {
    q: params.get('q') ?? '',
    saldo: params.get('saldo') === 'pendiente' ? 'pendiente' : '',
    orden: params.get('orden') === 'saldo' ? 'saldo' : 'nombre',
    pagina: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** Query string de los filtros, sin los valores por defecto. */
export function counterpartyFiltersToParams(filters: CounterpartyFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.saldo) params.set('saldo', filters.saldo)
  if (filters.orden !== 'nombre') params.set('orden', filters.orden)
  if (filters.pagina > 1) params.set('pagina', String(filters.pagina))
  return params
}

const byName = (a: Counterparty, b: Counterparty) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

/**
 * Busqueda por nombre, documento o correo (sin mayusculas ni tildes), filtro de saldo y orden.
 * Sin saldos cargados el filtro de saldo y el orden por saldo no se aplican: no hay con que.
 */
export function filterCounterparties(
  counterparties: Counterparty[],
  filters: CounterpartyFilters,
  balances: Map<number, Balance> | undefined,
): Counterparty[] {
  const query = normalizeText(filters.q)
  const amount = (counterparty: Counterparty) => balances?.get(counterparty.id)?.amount ?? 0
  const filtered = counterparties.filter(
    (counterparty) =>
      (!query ||
        normalizeText(counterparty.name).includes(query) ||
        normalizeText(counterparty.documentNumber).includes(query) ||
        normalizeText(counterparty.email ?? '').includes(query)) &&
      (filters.saldo !== 'pendiente' || !balances || amount(counterparty) > 0),
  )
  return filtered.sort(
    filters.orden === 'saldo' && balances ? (a, b) => amount(b) - amount(a) || byName(a, b) : byName,
  )
}
