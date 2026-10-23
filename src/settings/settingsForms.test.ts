import { describe, expect, it } from 'vitest'
import type { InventoryCategory } from '../inventory/inventoryApi'
import {
  buildFinancialRequest,
  buildTenantRequest,
  categoriesAtCost,
  financialFormFrom,
  formatDecimal,
  isUnconfigured,
  parseDecimal,
  parseSettingsTab,
  validateFinancialForm,
  validateTenantForm,
  type FinancialFormValues,
} from './settingsForms'

const category = (id: number, name: string, targetMargin: number | null): InventoryCategory => ({
  id,
  name,
  color: '#000000',
  yellowStockMin: null,
  redStockMin: null,
  targetMargin,
  taxTypes: [],
})

const financial = (fields: Partial<FinancialFormValues> = {}): FinancialFormValues => ({
  expensesRate: '10',
  dianRate: '5',
  icaRate: '8,2',
  cardCommissionRate: '3',
  ...fields,
})

describe('pestanas', () => {
  it('lee la pestana de la URL y cae en datos con un valor desconocido', () => {
    expect(parseSettingsTab('financiera')).toBe('financiera')
    expect(parseSettingsTab('usuarios')).toBe('usuarios')
    expect(parseSettingsTab('otra')).toBe('datos')
    expect(parseSettingsTab(null)).toBe('datos')
  })
})

describe('datos de la serviteca', () => {
  it('el NIT acepta puntos y espacios y se valida normalizado', () => {
    expect(validateTenantForm({ name: 'Demo', nit: '900.123.456-7', phone: '' })).toEqual({})
    expect(validateTenantForm({ name: 'Demo', nit: ' 900 123 456 ', phone: '' })).toEqual({})
    expect(validateTenantForm({ name: 'Demo', nit: '900.123.456-78', phone: '' }).nit).toMatch(/^Usa solo dígitos/)
    expect(validateTenantForm({ name: 'Demo', nit: '9-'.padEnd(26, '1'), phone: '' }).nit).toBe('Usa máximo 25 caracteres.')
    // Los puntos no cuentan para el maximo de 25.
    expect(validateTenantForm({ name: 'Demo', nit: '11.111.111.111.111.111.111.111.111', phone: '' }).nit).toBe(
      'Usa máximo 25 caracteres.',
    )
    expect(validateTenantForm({ name: 'Demo', nit: '1.111.111.111.111.111.111.111.111', phone: '' }).nit).toBeUndefined()
  })

  it('nombre obligatorio; NIT y telefono opcionales con las reglas del registro', () => {
    expect(validateTenantForm({ name: ' ', nit: '', phone: '' })).toEqual({ name: 'Escribe el nombre comercial.' })
    expect(validateTenantForm({ name: 'a'.repeat(151), nit: '', phone: '' }).name).toBe('Usa máximo 150 caracteres.')
    expect(validateTenantForm({ name: 'Demo', nit: '', phone: '300-abc' }).phone).toBe(
      'Usa solo dígitos, espacios, +, - y paréntesis.',
    )
  })

  it('cuerpo del PUT sin slug, NIT normalizado y vacios como null', () => {
    expect(buildTenantRequest({ name: '  Serviteca Demo ', nit: '900.123.456-7', phone: ' 300 123 4567 ' })).toEqual({
      name: 'Serviteca Demo',
      nit: '900123456-7',
      phone: '300 123 4567',
    })
    expect(buildTenantRequest({ name: 'Demo', nit: ' . ', phone: '  ' })).toEqual({ name: 'Demo', nit: null, phone: null })
  })
})

describe('unidades de la configuracion financiera', () => {
  it('coma o punto decimal', () => {
    expect(parseDecimal('8,2')).toBe(8.2)
    expect(parseDecimal(' 8.2 ')).toBe(8.2)
    expect(parseDecimal('-1')).toBeNaN()
    expect(parseDecimal('1,2,3')).toBeNaN()
    expect(formatDecimal(8.2)).toBe('8,2')
    expect(formatDecimal(10)).toBe('10')
  })

  it('ida y vuelta: porcentajes sobre 100 y el ICA sobre 1000', () => {
    const request = buildFinancialRequest(financial())
    expect(request).toEqual({ expensesRate: 0.1, dianRate: 0.05, icaRate: 0.0082, cardCommissionRate: 0.03 })
    expect(financialFormFrom(request)).toEqual({ expensesRate: '10', dianRate: '5', icaRate: '8,2', cardCommissionRate: '3' })
  })

  it('limites 0 y maximos', () => {
    expect(buildFinancialRequest(financial({ expensesRate: '0', icaRate: '1000', dianRate: '100' }))).toMatchObject({
      expensesRate: 0,
      dianRate: 1,
      icaRate: 1,
    })
    expect(validateFinancialForm(financial({ expensesRate: '100', icaRate: '1000', dianRate: '0' }))).toEqual({})
    expect(validateFinancialForm(financial({ expensesRate: '100,0001' })).expensesRate).toBe('Usa un valor entre 0 y 100.')
    expect(validateFinancialForm(financial({ dianRate: '150' })).dianRate).toBe('Usa un valor entre 0 y 100.')
    expect(validateFinancialForm(financial({ icaRate: '1000,001' })).icaRate).toBe('Usa un valor entre 0 y 1000.')
  })

  it('muchos decimales: 4 en porcentajes y 3 en el ICA, sin ruido de redondeo', () => {
    expect(buildFinancialRequest(financial({ expensesRate: '34,3333', icaRate: '9,966' }))).toMatchObject({
      expensesRate: 0.343333,
      icaRate: 0.009966,
    })
    expect(validateFinancialForm(financial({ expensesRate: '34,33333' })).expensesRate).toBe('Usa máximo 4 decimales.')
    expect(validateFinancialForm(financial({ icaRate: '8,2345' })).icaRate).toBe('Usa máximo 3 decimales.')
    expect(financialFormFrom({ expensesRate: 0.343333, dianRate: 0.35, icaRate: 0.009966, cardCommissionRate: 0.025 })).toEqual({
      expensesRate: '34,3333',
      dianRate: '35',
      icaRate: '9,966',
      cardCommissionRate: '2,5',
    })
  })

  it('vacio, texto o negativo son error', () => {
    expect(validateFinancialForm(financial({ expensesRate: '' })).expensesRate).toBe('Escribe un valor. Usa 0 si no aplica.')
    expect(validateFinancialForm(financial({ dianRate: 'abc' })).dianRate).toBe(
      'Escribe un número mayor o igual a 0, por ejemplo 8,2.',
    )
    expect(validateFinancialForm(financial({ cardCommissionRate: '-2' })).cardCommissionRate).toBe(
      'Escribe un número mayor o igual a 0, por ejemplo 8,2.',
    )
  })

  it('sin configuracion guardada todo viene en cero', () => {
    expect(isUnconfigured({ expensesRate: 0, dianRate: 0, icaRate: 0, cardCommissionRate: 0 })).toBe(true)
    expect(isUnconfigured({ expensesRate: 0, dianRate: 0, icaRate: 0, cardCommissionRate: 0.03 })).toBe(false)
  })
})

describe('advertencia del divisor', () => {
  const categories = [category(1, 'LLANTAS', 0.3), category(2, 'BATERIAS', 0.5), category(3, 'SIN MARGEN', null)]

  it('sin categorias afectadas', () => {
    expect(categoriesAtCost(buildFinancialRequest(financial()), categories)).toEqual([])
  })

  it('en el limite exacto: divisor cero cuenta como afectada', () => {
    // k = 0,5 * 1 = 0,5; BATERIAS: 0,5 - 0 - 0,5 = 0.
    const settings = buildFinancialRequest(financial({ expensesRate: '50', dianRate: '0', icaRate: '0' }))
    expect(categoriesAtCost(settings, categories).map((c) => c.name)).toEqual(['BATERIAS'])
  })

  it('gastos 60 y DIAN 60 dejan el divisor negativo en las categorias con margen', () => {
    // k = 0,4 * 0,4 = 0,16.
    const settings = buildFinancialRequest(financial({ expensesRate: '60', dianRate: '60', icaRate: '0' }))
    expect(categoriesAtCost(settings, categories).map((c) => c.name)).toEqual(['LLANTAS', 'BATERIAS'])
  })
})
