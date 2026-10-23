import { describe, expect, it } from 'vitest'
import type { Counterparty } from '../sales/salesApi'
import type { BalanceInvoice } from './counterpartiesApi'
import {
  DEFAULT_COUNTERPARTY_FILTERS,
  balancesByCounterparty,
  counterpartyFiltersToParams,
  counterpartyIndicators,
  filterCounterparties,
  isSystemCounterparty,
  parseCounterpartyFilters,
} from './counterpartyList'

const party = (id: number, fields: Partial<Counterparty> = {}): Counterparty => ({
  id,
  role: 'CLIENTE',
  name: `Tercero ${id}`,
  documentType: 'CC',
  documentNumber: `10${id}`,
  email: null,
  phone: null,
  ...fields,
})

const sale = (customerId: number | null, status: BalanceInvoice['status'], pendingBalance: number): BalanceInvoice => ({
  status,
  pendingBalance,
  customer: customerId === null ? null : { id: customerId },
})

describe('balancesByCounterparty', () => {
  it('suma el saldo y cuenta las facturas PENDIENTE de cada tercero', () => {
    const balances = balancesByCounterparty([
      sale(1, 'PENDIENTE', 100000),
      sale(1, 'PENDIENTE', 50000),
      sale(1, 'PAGADA', 0),
      sale(1, 'ANULADA', 0),
      sale(2, 'PAGADA', 0),
      sale(3, 'PENDIENTE', 20000),
      sale(null, 'PENDIENTE', 999),
    ])
    expect(balances.get(1)).toEqual({ amount: 150000, count: 2 })
    expect(balances.get(2)).toBeUndefined()
    expect(balances.get(3)).toEqual({ amount: 20000, count: 1 })
    expect(balances.size).toBe(2)
  })

  it('lee el proveedor de una compra', () => {
    const balances = balancesByCounterparty([
      { status: 'PENDIENTE', pendingBalance: 300000, supplier: { id: 5 } },
      { status: 'ANULADA', pendingBalance: 0, supplier: { id: 5 } },
      { status: 'PENDIENTE', pendingBalance: 45000, supplier: { id: 5 } },
    ])
    expect(balances.get(5)).toEqual({ amount: 345000, count: 2 })
  })
})

describe('counterpartyIndicators', () => {
  const list = [
    party(1, { name: 'Consumidor final', documentType: 'NIT', documentNumber: '222222222222' }),
    party(2),
    party(3, { role: 'AMBOS' }),
    party(4),
  ]

  it('cuenta los terceros sin el Consumidor final y suma los saldos de la lista', () => {
    const balances = balancesByCounterparty([sale(1, 'PENDIENTE', 10000), sale(2, 'PENDIENTE', 5000), sale(9, 'PENDIENTE', 7)])
    expect(counterpartyIndicators(list, balances)).toEqual({ total: 3, withBalance: 2, amount: 15000 })
  })

  it('sin saldos solo el total es real', () => {
    expect(counterpartyIndicators(list, undefined)).toEqual({ total: 3, withBalance: 0, amount: 0 })
  })
})

describe('isSystemCounterparty', () => {
  it('reconoce el Consumidor final por su documento', () => {
    expect(isSystemCounterparty({ documentNumber: '222222222222' })).toBe(true)
    expect(isSystemCounterparty({ documentNumber: '2222222222' })).toBe(false)
  })
})

describe('filtros en la URL', () => {
  it('lee los valores conocidos y descarta los demas', () => {
    expect(parseCounterpartyFilters(new URLSearchParams('q=ana&saldo=pendiente&orden=saldo&pagina=3'))).toEqual({
      q: 'ana',
      saldo: 'pendiente',
      orden: 'saldo',
      pagina: 3,
    })
    expect(parseCounterpartyFilters(new URLSearchParams('saldo=x&orden=y&pagina=-2'))).toEqual(DEFAULT_COUNTERPARTY_FILTERS)
  })

  it('solo escribe lo distinto de los valores por defecto', () => {
    expect(counterpartyFiltersToParams(DEFAULT_COUNTERPARTY_FILTERS).toString()).toBe('')
    expect(counterpartyFiltersToParams({ q: 'José', saldo: 'pendiente', orden: 'saldo', pagina: 2 }).toString()).toBe(
      'q=Jos%C3%A9&saldo=pendiente&orden=saldo&pagina=2',
    )
  })
})

describe('filterCounterparties', () => {
  const list = [
    party(1, { name: 'Óscar Peña', email: 'OSCAR@taller.co' }),
    party(2, { name: 'ana Ruiz', documentNumber: '900123456' }),
    party(3, { name: 'Bernardo Díaz' }),
  ]
  const balances = balancesByCounterparty([sale(3, 'PENDIENTE', 9000), sale(1, 'PENDIENTE', 1000)])
  const names = (result: Counterparty[]) => result.map((item) => item.name)

  it('ordena por nombre sin distinguir mayusculas ni tildes', () => {
    expect(names(filterCounterparties(list, DEFAULT_COUNTERPARTY_FILTERS, balances))).toEqual(['ana Ruiz', 'Bernardo Díaz', 'Óscar Peña'])
  })

  it('busca por nombre, documento o correo sin mayusculas ni tildes', () => {
    const search = (q: string) => names(filterCounterparties(list, { ...DEFAULT_COUNTERPARTY_FILTERS, q }, balances))
    expect(search('OSCAR PENA')).toEqual(['Óscar Peña'])
    expect(search('90012')).toEqual(['ana Ruiz'])
    expect(search('@TALLER')).toEqual(['Óscar Peña'])
    expect(search('diaz')).toEqual(['Bernardo Díaz'])
  })

  it('filtra los que tienen saldo y ordena por saldo de mayor a menor', () => {
    expect(names(filterCounterparties(list, { ...DEFAULT_COUNTERPARTY_FILTERS, saldo: 'pendiente' }, balances))).toEqual([
      'Bernardo Díaz',
      'Óscar Peña',
    ])
    expect(names(filterCounterparties(list, { ...DEFAULT_COUNTERPARTY_FILTERS, orden: 'saldo' }, balances))).toEqual([
      'Bernardo Díaz',
      'Óscar Peña',
      'ana Ruiz',
    ])
  })

  it('sin saldos no aplica el filtro de saldo ni el orden por saldo', () => {
    expect(names(filterCounterparties(list, { ...DEFAULT_COUNTERPARTY_FILTERS, saldo: 'pendiente', orden: 'saldo' }, undefined))).toEqual([
      'ana Ruiz',
      'Bernardo Díaz',
      'Óscar Peña',
    ])
  })
})
