import { describe, expect, it } from 'vitest'
import type { TreasuryMovement } from '../accounts/accountsApi'
import { formatSignedAmount } from '../accounts/accountsView'
import type { Account } from '../dashboard/dashboardApi'
import {
  DEFAULT_MANUAL_FILTERS,
  buildManualRequest,
  deleteEffectText,
  emptyManualForm,
  filterManualMovements,
  formFromMovement,
  manualFiltersToParams,
  manualRange,
  manualTotals,
  parseManualFilters,
  saveShortfalls,
  shortfallMessage,
  validateManualForm,
  type ManualFormValues,
} from './manualMovements'

const today = '2026-10-19'

const accounts: Account[] = [
  { id: 2, name: 'Bancolombia', type: 'BANCO', currentBalance: 500000 },
  { id: 3, name: 'Caja Menor', type: 'EFECTIVO', currentBalance: 0 },
  { id: 1, name: 'Caja General', type: 'EFECTIVO', currentBalance: 100000 },
]

const expense = (id: number, fields: Partial<TreasuryMovement> = {}): TreasuryMovement => ({
  id,
  accountId: 1,
  accountName: 'Caja General',
  type: 'EGRESO',
  category: 'GASTO_OPERATIVO',
  concept: `Gasto ${id}`,
  amount: 1000,
  date: '2026-10-10',
  notes: null,
  saleId: null,
  purchaseId: null,
  relatedMovementId: null,
  ...fields,
})

const form = (fields: Partial<ManualFormValues> = {}): ManualFormValues => ({
  concept: 'Pago de arriendo',
  date: '2026-10-18',
  accountId: '1',
  amount: '50000',
  notes: '',
  ...fields,
})

describe('filtros en la URL', () => {
  it('sin parametros son los de por defecto y no escriben nada', () => {
    const filters = parseManualFilters(new URLSearchParams())
    expect(filters).toEqual(DEFAULT_MANUAL_FILTERS)
    expect(manualFiltersToParams(filters).toString()).toBe('')
  })

  it('ida y vuelta con todos los filtros', () => {
    const params = new URLSearchParams('q=luz&cuenta=2&periodo=personalizado&desde=2026-09-01&hasta=2026-09-30&pagina=3')
    expect(manualFiltersToParams(parseManualFilters(params)).toString()).toBe(params.toString())
  })

  it('descarta valores invalidos y fechas fuera de Personalizado', () => {
    expect(parseManualFilters(new URLSearchParams('periodo=hoy&cuenta=x&pagina=-2&desde=ayer'))).toEqual(DEFAULT_MANUAL_FILTERS)
    expect(manualFiltersToParams({ ...DEFAULT_MANUAL_FILTERS, periodo: 'todas', desde: '2026-01-01' }).toString()).toBe('periodo=todas')
  })
})

describe('periodos en Bogota', () => {
  const range = (periodo: string, extra = '') => manualRange(parseManualFilters(new URLSearchParams(`periodo=${periodo}${extra}`)), today)

  it('este mes, mes anterior y este ano', () => {
    expect(range('este-mes')).toMatchObject({ desde: '2026-10-01', hasta: today, valid: true })
    expect(range('mes-anterior')).toMatchObject({ desde: '2026-09-01', hasta: '2026-09-30', valid: true })
    expect(range('este-ano')).toMatchObject({ desde: '2026-01-01', hasta: today, valid: true })
  })

  it('todas no manda fechas', () => {
    expect(range('todas')).toMatchObject({ desde: null, hasta: null, valid: true })
  })

  it('personalizado exige las dos fechas en orden', () => {
    expect(range('personalizado', '&desde=2026-09-01')).toMatchObject({ valid: false })
    expect(range('personalizado', '&desde=2026-09-10&hasta=2026-09-01').errors.hasta).toBe('Hasta no puede ser anterior a Desde.')
    expect(range('personalizado', '&desde=2026-09-01&hasta=2026-09-10')).toMatchObject({ desde: '2026-09-01', hasta: '2026-09-10', valid: true })
  })
})

describe('listado', () => {
  const list = [
    expense(1, { concept: 'Pago de energía', date: '2026-10-05' }),
    expense(2, { concept: 'Papelería', date: '2026-10-08', accountId: 2, accountName: 'Bancolombia', amount: 25000 }),
    expense(3, { concept: 'ENERGIA bodega', date: '2026-10-08', amount: 4000 }),
  ]

  it('ordena por fecha descendente y luego por id descendente', () => {
    expect(filterManualMovements(list, DEFAULT_MANUAL_FILTERS).map((m) => m.id)).toEqual([3, 2, 1])
  })

  it('filtra por cuenta y por concepto sin mayusculas ni tildes', () => {
    expect(filterManualMovements(list, { ...DEFAULT_MANUAL_FILTERS, cuenta: 2 }).map((m) => m.id)).toEqual([2])
    expect(filterManualMovements(list, { ...DEFAULT_MANUAL_FILTERS, q: 'Energía' }).map((m) => m.id)).toEqual([3, 1])
    expect(filterManualMovements(list, { ...DEFAULT_MANUAL_FILTERS, q: 'PAPELERIA' }).map((m) => m.id)).toEqual([2])
  })

  it('indicadores: suma y cantidad de lo filtrado', () => {
    expect(manualTotals(list)).toEqual({ amount: 30000, count: 3 })
    expect(manualTotals([])).toEqual({ amount: 0, count: 0 })
  })

  it('monto con signo siempre visible', () => {
    expect(formatSignedAmount(expense(1, { amount: 450000 }))).toBe('-$ 450.000')
    expect(formatSignedAmount({ type: 'INGRESO', amount: 180000 })).toBe('+$ 180.000')
  })
})

describe('formulario', () => {
  it('alta de gasto: hoy y la primera cuenta EFECTIVO por id; ingreso sin cuenta', () => {
    expect(emptyManualForm('GASTO_OPERATIVO', today, accounts)).toEqual({ concept: '', date: today, accountId: '1', amount: '', notes: '' })
    expect(emptyManualForm('INGRESO_OCASIONAL', today, accounts).accountId).toBe('')
  })

  it('precarga de la edicion', () => {
    expect(formFromMovement(expense(4, { amount: 75000, notes: 'Recibo 12' }))).toEqual({
      concept: 'Gasto 4',
      date: '2026-10-10',
      accountId: '1',
      amount: '75000',
      notes: 'Recibo 12',
    })
  })

  it('valida concepto, fecha, cuenta, monto y observaciones', () => {
    expect(validateManualForm(form(), today)).toEqual({})
    expect(validateManualForm(form({ concept: ' ', date: '', accountId: '', amount: '' }), today)).toEqual({
      concept: 'Escribe el concepto.',
      date: 'Elige la fecha.',
      accountId: 'Elige la cuenta.',
      amount: 'Escribe el monto.',
    })
    expect(validateManualForm(form({ concept: 'a'.repeat(255) }), today).concept).toBeUndefined()
    expect(validateManualForm(form({ concept: 'a'.repeat(256) }), today).concept).toBe('Usa máximo 255 caracteres.')
    expect(validateManualForm(form({ notes: 'a'.repeat(256) }), today).notes).toBe('Usa máximo 255 caracteres.')
    expect(validateManualForm(form({ date: today }), today).date).toBeUndefined()
    expect(validateManualForm(form({ date: '2026-10-20' }), today).date).toBe('La fecha no puede ser posterior a hoy.')
    expect(validateManualForm(form({ amount: '0' }), today).amount).toBe('El monto debe ser mayor que cero.')
    expect(validateManualForm(form({ amount: 'abc' }), today).amount).toBe('El monto debe ser mayor que cero.')
  })

  it('cuerpo exacto con la categoria fija y observaciones vacias en null', () => {
    expect(buildManualRequest(form({ concept: '  Arriendo ', amount: '1.200.000' }), 'GASTO_OPERATIVO')).toEqual({
      accountId: 1,
      category: 'GASTO_OPERATIVO',
      concept: 'Arriendo',
      amount: 1200000,
      date: '2026-10-18',
      notes: null,
    })
    expect(buildManualRequest(form({ notes: ' Recibo ' }), 'INGRESO_OCASIONAL')).toMatchObject({
      category: 'INGRESO_OCASIONAL',
      notes: 'Recibo',
    })
  })
})

describe('aviso de saldo', () => {
  it('un gasto igual al saldo no avisa; uno mas, si', () => {
    expect(saveShortfalls('GASTO_OPERATIVO', form({ amount: '100000' }), accounts)).toEqual([])
    const [shortfall] = saveShortfalls('GASTO_OPERATIVO', form({ amount: '100001' }), accounts)
    expect(shortfall && shortfallMessage(shortfall)).toBe(
      'Saldo insuficiente en Caja General: disponible $ 100.000, necesitas $ 100.001',
    )
  })

  it('un ingreso nuevo nunca avisa', () => {
    expect(saveShortfalls('INGRESO_OCASIONAL', form({ amount: '999999999', accountId: '3' }), accounts)).toEqual([])
  })

  it('editar un gasto en la misma cuenta cuenta lo que ya habia salido', () => {
    const original = expense(5, { amount: 40000 })
    expect(saveShortfalls('GASTO_OPERATIVO', form({ amount: '140000' }), accounts, original)).toEqual([])
    expect(saveShortfalls('GASTO_OPERATIVO', form({ amount: '140001' }), accounts, original)).toHaveLength(1)
  })

  it('mover un ingreso de cuenta puede dejar la anterior en negativo', () => {
    const original = { ...expense(6, { amount: 150000 }), type: 'INGRESO' as const, category: 'INGRESO_OCASIONAL' as const }
    const [shortfall] = saveShortfalls('INGRESO_OCASIONAL', form({ accountId: '2', amount: '150000' }), accounts, original)
    expect(shortfall && shortfallMessage(shortfall)).toBe(
      'Saldo insuficiente en Caja General: disponible $ 100.000, necesitas $ 150.000',
    )
  })

  it('sacar un gasto de una cuenta en negativo no la marca', () => {
    const overdrawn = accounts.map((account) => (account.id === 1 ? { ...account, currentBalance: -173750 } : account))
    expect(saveShortfalls('GASTO_OPERATIVO', form({ accountId: '2', amount: '200000' }), overdrawn, expense(12, { amount: 120000 }))).toEqual([])
  })
})

describe('texto de eliminar', () => {
  it('un gasto devuelve el monto a la cuenta', () => {
    expect(deleteEffectText(expense(1, { amount: 30000 }), accounts)).toBe(
      'Vuelven $ 30.000 a Caja General: su saldo pasa de $ 100.000 a $ 130.000.',
    )
  })

  it('un ingreso lo descuenta y avisa si queda en negativo', () => {
    const income = { ...expense(2, { amount: 150000 }), type: 'INGRESO' as const, category: 'INGRESO_OCASIONAL' as const }
    expect(deleteEffectText(income, accounts)).toBe(
      'Se descuentan $ 150.000 de Caja General: su saldo pasa de $ 100.000 a -$ 50.000. La cuenta queda en negativo.',
    )
  })

  it('sin cuentas cargadas solo dice el efecto', () => {
    expect(deleteEffectText(expense(1, { amount: 30000 }), undefined)).toBe('Vuelven $ 30.000 a Caja General.')
  })
})
