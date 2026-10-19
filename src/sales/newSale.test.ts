import { describe, expect, it } from 'vitest'
import type { Category, Product } from '../dashboard/dashboardApi'
import { ApiError } from '../lib/api'
import {
  addDays,
  buildSaleRequest,
  defaultDueDate,
  invoiceTotals,
  isDuplicateNumberError,
  lineAmounts,
  paymentMethodsFor,
  round2,
  stockWarnings,
  validateSale,
  vatRate,
  type SaleForm,
  type SaleLine,
} from './newSale'

const product = (id: number, quantity: number, categoryId = 1): Product => ({
  id,
  code: `P-${id}`,
  description: `Producto ${id}`,
  quantity,
  suggestedPrice: 1000,
  categoryId,
})

const productsById = new Map([product(1, 50), product(2, 12), product(3, 4)].map((p) => [p.id, p]))
const categoriesById = new Map<number, Category>([
  [1, { id: 1, name: 'LLANTAS', yellowStockMin: 10, redStockMin: 3, taxTypes: [{ rate: 0.19, isVat: true }] }],
])

const line = (key: number, productId: number | null, quantity: string, price: string): SaleLine => ({
  key,
  productId,
  quantity,
  price,
})

function form(change: Partial<SaleForm> = {}): SaleForm {
  return {
    customerId: 7,
    invoiceDate: '2026-10-18',
    paymentType: 'CONTADO',
    dueDate: '2026-10-18',
    accountId: 10,
    paymentMethod: 'EFECTIVO',
    lines: [line(1, 1, '2', '180000')],
    ...change,
  }
}

describe('calculo de la factura', () => {
  it('redondea a 2 decimales mitad hacia arriba sobre el valor decimal', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(2.675)).toBe(2.68)
    expect(round2(0.125)).toBe(0.13)
    expect(round2(0.124)).toBe(0.12)
    expect(round2(1e-7)).toBe(0)
    expect(round2(476000)).toBe(476000)
  })

  it('la tasa es la suma de los impuestos de IVA de la categoria', () => {
    expect(vatRate({ taxTypes: [{ rate: 0.19, isVat: true }] })).toBe(0.19)
    expect(vatRate({ taxTypes: [{ rate: 0.19, isVat: true }, { rate: 0.04, isVat: false }] })).toBe(0.19)
    expect(vatRate({ taxTypes: [{ rate: 0.05, isVat: true }, { rate: null, isVat: true }] })).toBe(0.05)
    expect(vatRate({ taxTypes: [] })).toBe(0)
    expect(vatRate(undefined)).toBe(0)
  })

  it('cada linea es precio por cantidad y su IVA es base por tasa', () => {
    expect(lineAmounts({ quantity: 4, price: 180000, rate: 0.19 })).toEqual({ base: 720000, iva: 136800 })
    expect(lineAmounts({ quantity: 3, price: 33333.33, rate: 0.19 })).toEqual({ base: 99999.99, iva: 19000 })
  })

  it('suma varias lineas con tasas distintas: total es subtotal mas IVA', () => {
    const totals = invoiceTotals([
      { quantity: 4, price: 180000, rate: 0.19 },
      { quantity: 2, price: 38000, rate: 0.19 },
      { quantity: 1, price: 420000, rate: 0.19 },
      { quantity: 3, price: 50000, rate: 0.05 },
      { quantity: 1, price: 25000, rate: 0 },
    ])
    expect(totals).toEqual({ subtotal: 1391000, iva: 238540, total: 1629540 })
  })

  it('el caso del backend: 400.000 al 19 % da 476.000', () => {
    expect(invoiceTotals([{ quantity: 2, price: 200000, rate: 0.19 }])).toEqual({ subtotal: 400000, iva: 76000, total: 476000 })
  })

  it('redondea solo al final, como la columna NUMERIC(14,2)', () => {
    // 3 x 0.1 con IVA del 19 % en doubles: 0.30000000000000004 y 0.357...
    const totals = invoiceTotals([
      { quantity: 3, price: 0.1, rate: 0.19 },
      { quantity: 1, price: 1234.565, rate: 0.19 },
    ])
    expect(totals.subtotal).toBe(round2(0.1 * 3 + 1234.565))
    expect(totals.total).toBe(round2((0.1 * 3 + 1234.565) + (0.1 * 3 * 0.19 + 1234.565 * 0.19)))
    expect(totals.iva).toBe(round2(totals.total - totals.subtotal))
  })

  it('sin lineas todo es cero', () => {
    expect(invoiceTotals([])).toEqual({ subtotal: 0, iva: 0, total: 0 })
  })
})

describe('medio de pago por tipo de cuenta', () => {
  it('efectivo fija EFECTIVO y bloquea el campo', () => {
    expect(paymentMethodsFor('EFECTIVO')).toEqual({ options: ['EFECTIVO'], locked: true })
  })

  it('banco o digital permite transferencia o tarjeta', () => {
    const options = ['TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO']
    expect(paymentMethodsFor('BANCO')).toEqual({ options, locked: false })
    expect(paymentMethodsFor('DIGITAL')).toEqual({ options, locked: false })
  })

  it('sin cuenta no hay medio', () => {
    expect(paymentMethodsFor(undefined)).toEqual({ options: [], locked: true })
  })
})

describe('vencimiento', () => {
  it('por defecto es la fecha mas 30 dias', () => {
    expect(defaultDueDate('2026-10-18')).toBe('2026-11-17')
    expect(defaultDueDate('2026-12-15')).toBe('2027-01-14')
  })

  it('los botones suman 30, 60 y 90 dias desde la fecha', () => {
    expect(addDays('2026-10-18', 30)).toBe('2026-11-17')
    expect(addDays('2026-10-18', 60)).toBe('2026-12-17')
    expect(addDays('2026-10-18', 90)).toBe('2027-01-16')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('validateSale', () => {
  it('una factura completa es valida', () => {
    expect(validateSale(form(), productsById)).toEqual({ lines: {}, form: [], valid: true })
  })

  it('sin lineas no se puede guardar', () => {
    const result = validateSale(form({ lines: [] }), productsById)
    expect(result.valid).toBe(false)
    expect(result.form).toContain('Agrega al menos un producto.')
  })

  it('la cantidad no puede superar el stock ni ser cero o decimal', () => {
    expect(validateSale(form({ lines: [line(1, 3, '5', '1000')] }), productsById).lines[1]?.quantity).toBe(
      'Solo hay 4 unidades disponibles.',
    )
    expect(validateSale(form({ lines: [line(1, 3, '4', '1000')] }), productsById).valid).toBe(true)
    expect(validateSale(form({ lines: [line(1, 3, '0', '1000')] }), productsById).lines[1]?.quantity).toBeDefined()
    expect(validateSale(form({ lines: [line(1, 3, '1.5', '1000')] }), productsById).lines[1]?.quantity).toBeDefined()
  })

  it('el precio debe ser mayor que cero', () => {
    const result = validateSale(form({ lines: [line(1, 1, '1', '0')] }), productsById)
    expect(result.valid).toBe(false)
    expect(result.lines[1]?.price).toBe('El precio debe ser mayor que cero.')
  })

  it('una linea sin producto no es valida', () => {
    expect(validateSale(form({ lines: [line(1, null, '1', '')] }), productsById).lines[1]?.product).toBe('Elige un producto.')
  })

  it('en contado pide cuenta y medio de pago', () => {
    expect(validateSale(form({ accountId: null }), productsById).form).toEqual(['Elige la cuenta donde entra el dinero.'])
    expect(validateSale(form({ paymentMethod: '' }), productsById).form).toEqual(['Elige el medio de pago.'])
  })

  it('en credito no pide cuenta y el vencimiento no puede ser anterior a la fecha', () => {
    const credit = form({ paymentType: 'CREDITO', accountId: null, paymentMethod: '', dueDate: '2026-11-17' })
    expect(validateSale(credit, productsById).valid).toBe(true)
    expect(validateSale({ ...credit, dueDate: '2026-10-17' }, productsById).valid).toBe(false)
    expect(validateSale({ ...credit, dueDate: '2026-10-18' }, productsById).valid).toBe(true)
  })
})

describe('buildSaleRequest', () => {
  it('contado: sin numero ni vencimiento, con cuenta y medio', () => {
    const body = buildSaleRequest(form())
    expect(body).toEqual({
      customerId: 7,
      invoiceDate: '2026-10-18',
      paymentType: 'CONTADO',
      accountId: 10,
      paymentMethod: 'EFECTIVO',
      details: [{ productId: 1, quantity: 2, price: 180000 }],
    })
    expect(body).not.toHaveProperty('invoiceNumber')
    expect(body).not.toHaveProperty('dueDate')
  })

  it('credito: con vencimiento, sin cuenta ni medio', () => {
    const body = buildSaleRequest(form({ paymentType: 'CREDITO', dueDate: '2026-12-17', accountId: 10, paymentMethod: 'EFECTIVO' }))
    expect(JSON.parse(JSON.stringify(body))).toEqual({
      customerId: 7,
      invoiceDate: '2026-10-18',
      paymentType: 'CREDITO',
      dueDate: '2026-12-17',
      details: [{ productId: 1, quantity: 2, price: 180000 }],
    })
  })
})

describe('stockWarnings', () => {
  it('avisa con la regla de stock sobre lo que quedaria', () => {
    const warnings = stockWarnings(
      [line(1, 1, '40', '1'), line(2, 2, '2', '1'), line(3, 3, '3', '1'), line(4, 1, '1', '1')],
      productsById,
      categoriesById,
    )
    expect(warnings.map(({ code, remaining, tone, title }) => [code, remaining, tone, title])).toEqual([
      ['P-1', 10, 'warning', 'Stock bajo'],
      ['P-2', 10, 'warning', 'Stock bajo'],
      ['P-3', 1, 'error', 'Stock crítico'],
    ])
  })

  it('quedar en cero es sin stock y una cantidad invalida no avisa', () => {
    expect(stockWarnings([line(1, 3, '4', '1')], productsById, categoriesById)[0]?.title).toBe('Sin stock')
    expect(stockWarnings([line(1, 3, '9', '1'), line(2, 2, 'x', '1')], productsById, categoriesById)).toEqual([])
  })

  it('sin umbrales usa los de Autollantas: amarillo 5 y rojo 2', () => {
    const noCategory = new Map([[9, { ...product(9, 8), categoryId: null }]])
    expect(stockWarnings([line(1, 9, '3', '1')], noCategory, categoriesById)[0]?.title).toBe('Stock bajo')
    expect(stockWarnings([line(1, 9, '6', '1')], noCategory, categoriesById)[0]?.title).toBe('Stock crítico')
    expect(stockWarnings([line(1, 9, '2', '1')], noCategory, categoriesById)).toEqual([])
  })
})

describe('isDuplicateNumberError', () => {
  it('solo el 409 de numero repetido se reintenta', () => {
    expect(isDuplicateNumberError(new ApiError('Ya existe una factura con el numero FV-0002', 409))).toBe(true)
    expect(isDuplicateNumberError(new ApiError('Stock insuficiente para Llanta: hay 4 y se piden 5', 409))).toBe(false)
    expect(isDuplicateNumberError(new ApiError('Ya existe una factura con el numero FV-0002', 400))).toBe(false)
    expect(isDuplicateNumberError(new Error('x'))).toBe(false)
  })
})
