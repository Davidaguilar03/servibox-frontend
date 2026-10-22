import { describe, expect, it } from 'vitest'
import type { Account } from '../dashboard/dashboardApi'
import { businessToday } from '../lib/businessDate'
import type { TreasuryMovement } from './accountsApi'
import {
  accountMovements,
  accountsFiltersToParams,
  activeRange,
  formatSignedAmount,
  invoiceNumbers,
  movementOrigin,
  parseAccountsFilters,
  periodLabel,
  periodRange,
  periodTotals,
  type OriginContext,
  selectedAccountId,
} from './accountsView'

const account = (id: number, name: string, type: Account['type'], currentBalance = 0): Account => ({ id, name, type, currentBalance })

const movement = (id: number, fields: Partial<TreasuryMovement>): TreasuryMovement => ({
  id,
  accountId: 1,
  accountName: 'Caja General',
  type: 'INGRESO',
  category: 'INGRESO_OCASIONAL',
  concept: `Movimiento ${id}`,
  amount: 1000,
  date: '2026-10-10',
  notes: null,
  saleId: null,
  purchaseId: null,
  relatedMovementId: null,
  ...fields,
})

// Transferencia de 500.000 de Caja (1) a Bancolombia (2): el INGRESO apunta al EGRESO.
const movements = [
  movement(1, { category: 'RECAUDO_VENTA', amount: 540000, saleId: 31, date: '2026-10-05' }),
  movement(2, { type: 'EGRESO', category: 'GASTO_OPERATIVO', amount: 450000, date: '2026-10-08' }),
  movement(3, { type: 'EGRESO', category: 'TRANSFERENCIA', amount: 500000, date: '2026-10-08' }),
  movement(4, { accountId: 2, accountName: 'Bancolombia', category: 'TRANSFERENCIA', amount: 500000, date: '2026-10-08', relatedMovementId: 3 }),
  movement(5, { accountId: 2, accountName: 'Bancolombia', type: 'EGRESO', category: 'PAGO_COMPRA', amount: 357000, purchaseId: 7, date: '2026-10-12' }),
  movement(6, { accountId: 2, accountName: 'Bancolombia', category: 'INGRESO_OCASIONAL', amount: 2000000, date: '2026-10-01' }),
]

describe('periodos en Bogota', () => {
  // 03:00 UTC del 19 es todavia el 18 de octubre (domingo) en Bogota.
  const today = businessToday(new Date('2026-10-19T03:00:00Z'))

  it('hoy es el 18 de octubre en la zona del negocio', () => {
    expect(today).toBe('2026-10-18')
    expect(periodRange('hoy', today)).toEqual({ desde: '2026-10-18', hasta: '2026-10-18' })
  })

  it('esta semana empieza el lunes, tambien si hoy es domingo', () => {
    expect(periodRange('esta-semana', today)).toEqual({ desde: '2026-10-12', hasta: '2026-10-18' })
    expect(periodRange('esta-semana', '2026-10-12')).toEqual({ desde: '2026-10-12', hasta: '2026-10-12' })
    expect(periodRange('esta-semana', '2026-10-01')).toEqual({ desde: '2026-09-28', hasta: '2026-10-01' })
  })

  it('este mes, mes anterior (tambien en enero) y este ano', () => {
    expect(periodRange('este-mes', today)).toEqual({ desde: '2026-10-01', hasta: '2026-10-18' })
    expect(periodRange('mes-anterior', today)).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' })
    expect(periodRange('mes-anterior', '2026-01-15')).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' })
    expect(periodRange('mes-anterior', '2028-03-10')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' })
    expect(periodRange('este-ano', today)).toEqual({ desde: '2026-01-01', hasta: '2026-10-18' })
  })

  it('personalizado exige las dos fechas en orden y a lo sumo 366 dias', () => {
    const base = parseAccountsFilters(new URLSearchParams('periodo=personalizado'))
    expect(activeRange(base, today).valid).toBe(false)
    expect(activeRange({ ...base, desde: '2026-10-10', hasta: '2026-10-01' }, today).valid).toBe(false)
    expect(activeRange({ ...base, desde: '2025-01-01', hasta: '2026-10-01' }, today).valid).toBe(false)
    expect(activeRange({ ...base, desde: '2026-10-01', hasta: '2026-10-10' }, today)).toMatchObject({
      desde: '2026-10-01',
      hasta: '2026-10-10',
      valid: true,
    })
    expect(periodLabel({ ...base, desde: '2026-10-01', hasta: '2026-10-10' })).toBe('01/10/2026 a 10/10/2026')
  })
})

describe('query string', () => {
  it('lee cuenta, periodo, fechas y pagina, y descarta lo desconocido', () => {
    expect(parseAccountsFilters(new URLSearchParams('cuenta=2&periodo=personalizado&desde=2026-10-01&hasta=2026-10-10&pagina=3'))).toEqual({
      cuenta: 2,
      periodo: 'personalizado',
      desde: '2026-10-01',
      hasta: '2026-10-10',
      pagina: 3,
    })
    expect(parseAccountsFilters(new URLSearchParams('cuenta=todas'))).toMatchObject({ cuenta: 'todas', periodo: 'este-mes' })
    expect(parseAccountsFilters(new URLSearchParams('cuenta=x&periodo=siempre&desde=ayer'))).toEqual({
      cuenta: null,
      periodo: 'este-mes',
      desde: '',
      hasta: '',
      pagina: 1,
    })
  })

  it('escribe solo lo distinto de lo de por defecto y las fechas solo en Personalizado', () => {
    const filters = parseAccountsFilters(new URLSearchParams())
    expect(accountsFiltersToParams(filters).toString()).toBe('')
    expect(accountsFiltersToParams({ ...filters, cuenta: 'todas', periodo: 'hoy', desde: '2026-10-01' }).toString()).toBe(
      'cuenta=todas&periodo=hoy',
    )
    expect(accountsFiltersToParams({ ...filters, cuenta: 3, periodo: 'personalizado', desde: '2026-10-01', hasta: '2026-10-05', pagina: 2 }).toString()).toBe(
      'cuenta=3&periodo=personalizado&desde=2026-10-01&hasta=2026-10-05&pagina=2',
    )
  })
})

describe('seleccion de cuenta', () => {
  const accounts = [account(3, 'Nequi', 'DIGITAL'), account(2, 'Caja menor', 'EFECTIVO'), account(1, 'Bancolombia', 'BANCO')]

  it('usa la de la URL si existe', () => {
    expect(selectedAccountId(3, accounts)).toBe(3)
    expect(selectedAccountId('todas', accounts)).toBeNull()
  })

  it('si no, la primera EFECTIVO por id; si no hay, la primera por id', () => {
    expect(selectedAccountId(null, accounts)).toBe(2)
    expect(selectedAccountId(99, accounts)).toBe(2)
    expect(selectedAccountId(null, [account(5, 'Nequi', 'DIGITAL'), account(4, 'Banco', 'BANCO')])).toBe(4)
    expect(selectedAccountId(null, [])).toBeNull()
  })
})

describe('movimientos e indicadores', () => {
  it('filtra por cuenta y ordena por fecha y luego id, descendentes', () => {
    expect(accountMovements(movements, 1).map((m) => m.id)).toEqual([3, 2, 1])
    expect(accountMovements(movements, null).map((m) => m.id)).toEqual([5, 4, 3, 2, 1, 6])
  })

  it('ingresos y egresos de una cuenta incluyen sus transferencias', () => {
    expect(periodTotals(accountMovements(movements, 1))).toEqual({ income: 540000, expense: 950000 })
    expect(periodTotals(accountMovements(movements, 2))).toEqual({ income: 2500000, expense: 357000 })
  })

  it('con Todas suma todas las cuentas, las dos patas de la transferencia incluidas', () => {
    expect(periodTotals(movements)).toEqual({ income: 3040000, expense: 1307000 })
    const withoutTransfers = movements.filter((m) => m.category !== 'TRANSFERENCIA')
    expect(periodTotals(withoutTransfers)).toEqual({ income: 2540000, expense: 807000 })
  })

  it('el monto lleva el signo siempre', () => {
    expect(formatSignedAmount({ type: 'INGRESO', amount: 100000 })).toBe('+$ 100.000')
    expect(formatSignedAmount({ type: 'EGRESO', amount: 100000 })).toBe('-$ 100.000')
  })
})

describe('origen', () => {
  const context: OriginContext = {
    movements,
    saleNumbers: invoiceNumbers([{ id: 31, invoiceNumber: 'FV-0003' }]),
    purchaseNumbers: invoiceNumbers([{ id: 7, invoiceNumber: 'PROV-1001' }]),
  }
  const origin = (id: number, ctx: OriginContext = context) => movementOrigin(movements.find((m) => m.id === id) as TreasuryMovement, ctx)

  it('venta y compra con su numero de factura', () => {
    expect(origin(1)).toBe('VENTA FV-0003')
    expect(origin(5)).toBe('COMPRA PROV-1001')
  })

  it('gasto e ingreso ocasional sin codigos inventados', () => {
    expect(origin(2)).toBe('GASTO OPERATIVO')
    expect(origin(6)).toBe('INGRESO OCASIONAL')
  })

  it('la transferencia nombra la otra cuenta desde cualquiera de sus patas', () => {
    expect(origin(3)).toBe('TRANSFERENCIA a Bancolombia')
    expect(origin(4)).toBe('TRANSFERENCIA desde Caja General')
    expect(origin(3, { ...context, movements: [] })).toBe('TRANSFERENCIA')
  })

  it('sin las listas de facturas queda VENTA o COMPRA sin numero', () => {
    const failed = { movements }
    expect(origin(1, failed)).toBe('VENTA')
    expect(origin(5, failed)).toBe('COMPRA')
  })
})
