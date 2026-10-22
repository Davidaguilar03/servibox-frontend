import { describe, expect, it } from 'vitest'
import type { InventoryProduct } from '../inventory/inventoryApi'
import { defaultCashAccount } from '../lib/accountPayment'
import { ApiError } from '../lib/api'
import {
  buildPurchaseRequest,
  insufficientBalance,
  isDuplicatePurchaseNumberError,
  isInsufficientBalanceError,
  purchasePaymentMethodsFor,
  purchaseTotals,
  validatePurchase,
  type PurchaseForm,
  type PurchaseLine,
} from './newPurchase'

const product = (id: number): InventoryProduct => ({
  id,
  code: `P-${id}`,
  description: `Producto ${id}`,
  purchaseCost: 1000,
  quantity: 0,
  taxAmount: null,
  suggestedPrice: null,
  categoryId: 1,
  categoryName: 'LLANTAS',
})

const productsById = new Map([product(1), product(2)].map((p) => [p.id, p]))

const line = (key: number, productId: number | null, quantity: string, price: string): PurchaseLine => ({
  key,
  productId,
  quantity,
  price,
})

function form(change: Partial<PurchaseForm> = {}): PurchaseForm {
  return {
    supplierId: 7,
    invoiceNumber: 'DB-18452',
    invoiceDate: '2026-10-22',
    paymentType: 'CONTADO',
    dueDate: '2026-10-22',
    accountId: 10,
    paymentMethod: 'EFECTIVO',
    lines: [line(1, 1, '2', '168000')],
    ...change,
  }
}

describe('calculo de la compra', () => {
  it('el caso de la captura: tres productos al 19 % dan 3.540.000 + 672.600 = 4.212.600', () => {
    expect(
      purchaseTotals([
        { quantity: 12, price: 168000, rate: 0.19 },
        { quantity: 6, price: 210000, rate: 0.19 },
        { quantity: 12, price: 22000, rate: 0.19 },
      ]),
    ).toEqual({ subtotal: 3540000, iva: 672600, total: 4212600, exactTotal: 4212600 })
  })

  it('suma productos con tasas distintas y un producto sin IVA aporta solo su base', () => {
    const totals = purchaseTotals([
      { quantity: 5, price: 100000, rate: 0.19 },
      { quantity: 2, price: 50000, rate: 0.05 },
      { quantity: 3, price: 20000, rate: 0 },
    ])
    expect(totals.subtotal).toBe(660000)
    expect(totals.iva).toBe(95000 + 5000)
    expect(totals.total).toBe(760000)
  })

  it('el caso del backend (PurchasesFlowTest): 5 x 100.000 al 19 % da 595.000', () => {
    expect(purchaseTotals([{ quantity: 5, price: 100000, rate: 0.19 }])).toMatchObject({
      subtotal: 500000,
      iva: 95000,
      total: 595000,
    })
  })

  it('redondea el IVA sobre la suma, no linea por linea', () => {
    // Cada linea tiene 0,004 de IVA: redondeadas por separado darian 0.
    expect(purchaseTotals([
      { quantity: 1, price: 0.02, rate: 0.2 },
      { quantity: 1, price: 0.02, rate: 0.2 },
    ]).iva).toBe(0.01)
  })

  it('subtotal, IVA y total se redondean cada uno como su columna', () => {
    // 0,025 + 0,005: las columnas guardan 0,03, 0,01 y 0,03, aunque 0,03 + 0,01 no sea 0,03.
    expect(purchaseTotals([{ quantity: 1, price: 0.025, rate: 0.2 }])).toMatchObject({
      subtotal: 0.03,
      iva: 0.01,
      total: 0.03,
    })
  })

  it('sin lineas todo es cero', () => {
    expect(purchaseTotals([])).toEqual({ subtotal: 0, iva: 0, total: 0, exactTotal: 0 })
  })
})

describe('saldo de la cuenta', () => {
  it('alcanza si el saldo es igual al total y no si falta un peso', () => {
    expect(insufficientBalance(4212600, 4212600)).toBe(false)
    expect(insufficientBalance(4212601, 4212600)).toBe(false)
    expect(insufficientBalance(4212599, 4212600)).toBe(true)
    expect(insufficientBalance(3250000, 4212600)).toBe(true)
  })
})

describe('medio de pago de compra por tipo de cuenta', () => {
  it('efectivo fija EFECTIVO y bloquea el campo', () => {
    expect(purchasePaymentMethodsFor('EFECTIVO')).toEqual({ options: ['EFECTIVO'], locked: true })
  })

  it('banco o digital ofrecen TRANSFERENCIA y CHEQUE, los del diccionario', () => {
    const options = ['TRANSFERENCIA', 'CHEQUE']
    expect(purchasePaymentMethodsFor('BANCO')).toEqual({ options, locked: false })
    expect(purchasePaymentMethodsFor('DIGITAL')).toEqual({ options, locked: false })
  })

  it('sin cuenta no hay medio', () => {
    expect(purchasePaymentMethodsFor(undefined)).toEqual({ options: [], locked: true })
  })

  it('propone la primera cuenta de efectivo por id', () => {
    expect(
      defaultCashAccount([
        { id: 12, name: 'Caja Norte', type: 'EFECTIVO', currentBalance: 0 },
        { id: 3, name: 'Banco', type: 'BANCO', currentBalance: 0 },
        { id: 10, name: 'Caja General', type: 'EFECTIVO', currentBalance: 0 },
      ])?.id,
    ).toBe(10)
  })
})

describe('validatePurchase', () => {
  it('una compra completa es valida', () => {
    expect(validatePurchase(form(), productsById).valid).toBe(true)
  })

  it('pide proveedor, numero de factura y al menos una linea', () => {
    const result = validatePurchase(form({ supplierId: null, invoiceNumber: '  ', lines: [] }), productsById)
    expect(result.valid).toBe(false)
    expect(result.form).toEqual([
      'Elige el proveedor.',
      'Escribe el número de factura del proveedor.',
      'Agrega al menos un producto.',
    ])
  })

  it('la cantidad es entera mayor que cero, sin tope de stock', () => {
    expect(validatePurchase(form({ lines: [line(1, 1, '500', '1000')] }), productsById).valid).toBe(true)
    for (const quantity of ['0', '-1', '1.5', '']) {
      expect(validatePurchase(form({ lines: [line(1, 1, quantity, '1000')] }), productsById).lines[1]?.quantity).toBe(
        'Escribe una cantidad entera mayor que cero.',
      )
    }
  })

  it('el precio debe ser mayor que cero', () => {
    for (const price of ['0', '-5', '']) {
      expect(validatePurchase(form({ lines: [line(1, 1, '1', price)] }), productsById).lines[1]?.price).toBe(
        'El precio debe ser mayor que cero.',
      )
    }
  })

  it('en contado pide cuenta y medio de pago', () => {
    expect(validatePurchase(form({ accountId: null }), productsById).form).toEqual([
      'Elige la cuenta de la que sale el dinero.',
    ])
    expect(validatePurchase(form({ paymentMethod: '' }), productsById).form).toEqual(['Elige el método de pago.'])
  })

  it('en credito no pide cuenta y el vencimiento no puede ser anterior a la fecha', () => {
    const credit = { paymentType: 'CREDITO' as const, accountId: null, paymentMethod: '' }
    expect(validatePurchase(form({ ...credit, dueDate: '2026-11-21' }), productsById).valid).toBe(true)
    expect(validatePurchase(form({ ...credit, dueDate: '2026-10-21' }), productsById).valid).toBe(false)
  })
})

describe('buildPurchaseRequest', () => {
  it('contado: con cuenta y medio, sin vencimiento, y el numero sin espacios', () => {
    expect(buildPurchaseRequest(form({ invoiceNumber: ' DB-18452 ', dueDate: '2026-11-21' }))).toEqual({
      supplierId: 7,
      invoiceNumber: 'DB-18452',
      invoiceDate: '2026-10-22',
      paymentType: 'CONTADO',
      accountId: 10,
      paymentMethod: 'EFECTIVO',
      details: [{ productId: 1, quantity: 2, price: 168000 }],
    })
  })

  it('credito: con vencimiento, sin cuenta ni medio', () => {
    expect(
      buildPurchaseRequest(form({ paymentType: 'CREDITO', dueDate: '2026-12-21', accountId: 10, paymentMethod: 'EFECTIVO' })),
    ).toEqual({
      supplierId: 7,
      invoiceNumber: 'DB-18452',
      invoiceDate: '2026-10-22',
      paymentType: 'CREDITO',
      dueDate: '2026-12-21',
      details: [{ productId: 1, quantity: 2, price: 168000 }],
    })
  })
})

describe('errores del backend', () => {
  it('distingue el 409 de numero repetido del de saldo insuficiente', () => {
    const duplicate = new ApiError('Ya existe una factura de compra con el numero DB-1', 409)
    const balance = new ApiError('Saldo insuficiente en Caja General: hay 100.0 y se requieren 200.0', 409)
    expect(isDuplicatePurchaseNumberError(duplicate)).toBe(true)
    expect(isInsufficientBalanceError(duplicate)).toBe(false)
    expect(isInsufficientBalanceError(balance)).toBe(true)
    expect(isDuplicatePurchaseNumberError(balance)).toBe(false)
    expect(isDuplicatePurchaseNumberError(new ApiError('Ya existe una factura de compra con el numero DB-1', 400))).toBe(false)
  })
})
