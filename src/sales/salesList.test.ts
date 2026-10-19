import { describe, expect, it } from 'vitest'
import type { Sale } from '../dashboard/dashboardApi'
import type { Movement } from './salesApi'
import {
  CLEARED_FILTERS,
  DEFAULT_FILTERS,
  businessToday,
  creditCollections,
  filterSales,
  filtersToParams,
  monthRange,
  parseFilters,
  periodPrefix,
  receivable,
} from './salesList'

function sale(id: number, fields: Partial<Sale>): Sale {
  return {
    id,
    invoiceNumber: `FV-${String(id).padStart(4, '0')}`,
    customer: { name: `Cliente ${id}` },
    invoiceDate: '2026-10-01',
    dueDate: null,
    paymentType: 'CONTADO',
    status: 'PAGADA',
    total: 1000,
    pendingBalance: 0,
    ...fields,
  }
}

const sales = [
  sale(1, { customer: { name: 'José Pérez' }, invoiceDate: '2026-10-05' }),
  sale(2, { customer: { name: 'Transportes Boyacá S.A.S.' }, invoiceDate: '2026-10-10', paymentType: 'CREDITO', status: 'PENDIENTE', pendingBalance: 1500 }),
  sale(3, { customer: { name: 'María Ruiz' }, invoiceDate: '2026-09-20', paymentType: 'CREDITO', status: 'PENDIENTE', pendingBalance: 700 }),
  sale(4, { customer: null, invoiceDate: '2026-10-10', status: 'ANULADA' }),
  sale(5, { invoiceDate: '2025-12-31', paymentType: 'CREDITO', status: 'PAGADA' }),
  sale(10, { invoiceDate: '2026-10-10' }),
]

const ids = (rows: Sale[]) => rows.map((row) => row.id)
const today = '2026-10-18'

describe('filtros en la URL', () => {
  it('sin parametros son los de por defecto: Este mes, pagina 1', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS)
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('ida y vuelta sin perder nada', () => {
    const filters = { q: 'pérez', estado: 'PENDIENTE', pago: 'CREDITO', periodo: 'mes-anterior', pagina: 3 } as const
    const params = filtersToParams(filters)

    expect(params.toString()).toBe('q=p%C3%A9rez&estado=PENDIENTE&pago=CREDITO&periodo=mes-anterior&pagina=3')
    expect(parseFilters(params)).toEqual(filters)
    expect(filtersToParams(CLEARED_FILTERS).toString()).toBe('periodo=todas')
  })

  it('un valor desconocido vale lo de por defecto', () => {
    const params = new URLSearchParams('estado=BORRADA&pago=x&periodo=siempre&pagina=-2')

    expect(parseFilters(params)).toEqual(DEFAULT_FILTERS)
    expect(parseFilters(new URLSearchParams('pagina=2.5')).pagina).toBe(1)
  })
})

describe('periodos', () => {
  it('hoy se toma en la zona de Bogota', () => {
    // 03:00 UTC del 1 de noviembre son las 22:00 del 31 de octubre en Bogota.
    expect(businessToday(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10-31')
    expect(businessToday(new Date('2026-11-01T06:00:00Z'))).toBe('2026-11-01')
    // Fecha por defecto de una factura nueva: 03:00 UTC del 19 es aun el 18 en Bogota.
    expect(businessToday(new Date('2026-10-19T03:00:00Z'))).toBe('2026-10-18')
  })

  it('cada periodo cubre su prefijo de fecha', () => {
    expect(periodPrefix('este-mes', today)).toBe('2026-10')
    expect(periodPrefix('mes-anterior', today)).toBe('2026-09')
    expect(periodPrefix('mes-anterior', '2026-01-15')).toBe('2025-12')
    expect(periodPrefix('este-ano', today)).toBe('2026')
    expect(periodPrefix('todas', today)).toBeNull()
  })

  it('el mes de los indicadores va del primer dia a hoy', () => {
    expect(monthRange(today)).toEqual({ desde: '2026-10-01', hasta: '2026-10-18' })
  })
})

describe('filterSales', () => {
  it('ordena por fecha descendente y luego por numero descendente', () => {
    expect(ids(filterSales(sales, CLEARED_FILTERS, today))).toEqual([10, 2, 1, 3, 5])
  })

  it('deja fuera las anuladas: van a la Papelera', () => {
    expect(ids(filterSales(sales, CLEARED_FILTERS, today))).not.toContain(4)
    expect(parseFilters(new URLSearchParams('estado=ANULADA')).estado).toBe('')
  })

  it('filtra por periodo', () => {
    expect(ids(filterSales(sales, DEFAULT_FILTERS, today))).toEqual([10, 2, 1])
    expect(ids(filterSales(sales, { ...CLEARED_FILTERS, periodo: 'mes-anterior' }, today))).toEqual([3])
    expect(ids(filterSales(sales, { ...CLEARED_FILTERS, periodo: 'este-ano' }, today))).toEqual([10, 2, 1, 3])
  })

  it('filtra por estado y por forma de pago', () => {
    expect(ids(filterSales(sales, { ...CLEARED_FILTERS, estado: 'PENDIENTE' }, today))).toEqual([2, 3])
    expect(ids(filterSales(sales, { ...CLEARED_FILTERS, pago: 'CREDITO' }, today))).toEqual([2, 3, 5])
    expect(ids(filterSales(sales, { ...CLEARED_FILTERS, pago: 'CONTADO', estado: 'PAGADA' }, today))).toEqual([10, 1])
  })

  it('busca por numero o cliente sin distinguir mayusculas ni tildes', () => {
    const search = (q: string) => ids(filterSales(sales, { ...CLEARED_FILTERS, q }, today))

    expect(search('jose perez')).toEqual([1])
    expect(search('PÉREZ')).toEqual([1])
    expect(search('maria')).toEqual([3])
    expect(search('boyaca')).toEqual([2])
    expect(search('fv-0003')).toEqual([3])
    expect(search('  FV-001')).toEqual([10])
    expect(search('consumidor')).toEqual([])
    expect(search('nadie')).toEqual([])
  })
})

describe('indicadores', () => {
  it('por cobrar suma el saldo pendiente de las PENDIENTE', () => {
    expect(receivable(sales)).toEqual({ amount: 2200, count: 2 })
    expect(receivable([])).toEqual({ amount: 0, count: 0 })
  })

  it('abonos del mes cuenta solo recaudos de ventas a credito', () => {
    const movement = (id: number, saleId: number | null, amount: number): Movement => ({
      id,
      type: 'INGRESO',
      category: 'RECAUDO_VENTA',
      amount,
      date: '2026-10-12',
      saleId,
    })
    const movements = [
      movement(1, 1, 1000), // contado: no es abono
      movement(2, 2, 500),
      movement(3, 3, 300),
      movement(4, 10, 1000), // contado
      movement(5, null, 99),
      movement(6, 77, 50), // venta que no esta en la lista
    ]

    expect(creditCollections(movements, sales)).toBe(800)
    expect(creditCollections([], sales)).toBe(0)
  })
})
