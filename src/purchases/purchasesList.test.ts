import { describe, expect, it } from 'vitest'
import type { TreasuryMovement } from '../accounts/accountsApi'
import { CLEARED_FILTERS, DEFAULT_FILTERS } from '../sales/salesList'
import type { Purchase } from './purchasesApi'
import { activePurchases, creditPayments, filterPurchases, payable, sortPurchases } from './purchasesList'

function purchase(id: number, fields: Partial<Purchase> & { supplierName?: string }): Purchase {
  const { supplierName = `Proveedor ${id}`, ...rest } = fields
  return {
    id,
    invoiceNumber: `FC-${id}`,
    supplier: { id: 100 + id, role: 'PROVEEDOR', name: supplierName, documentType: 'NIT', documentNumber: String(900 + id), email: null, phone: null },
    invoiceDate: '2026-10-01',
    dueDate: null,
    paymentType: 'CONTADO',
    paymentMethod: 'EFECTIVO',
    status: 'PAGADA',
    subtotal: 1000,
    ivaTotal: 190,
    total: 1190,
    pendingBalance: 0,
    details: [],
    ...rest,
  }
}

const purchases = [
  purchase(1, { supplierName: 'Distrillantas Boyacá S.A.S.', invoiceNumber: 'DB-18452', invoiceDate: '2026-10-05' }),
  purchase(2, { invoiceDate: '2026-10-10', paymentType: 'CREDITO', status: 'PENDIENTE', pendingBalance: 1500 }),
  purchase(3, { invoiceDate: '2026-09-20', paymentType: 'CREDITO', status: 'PENDIENTE', pendingBalance: 700 }),
  purchase(4, { invoiceDate: '2026-10-10', status: 'ANULADA' }),
  purchase(5, { invoiceDate: '2025-12-31', paymentType: 'CREDITO', status: 'PAGADA' }),
  purchase(9, { invoiceDate: '2026-10-10', supplierName: 'Lubricantes Ñáñez' }),
]

const ids = (rows: Purchase[]) => rows.map((row) => row.id)
const today = '2026-10-22'
const all = { ...CLEARED_FILTERS }

describe('listado de compras', () => {
  it('ordena por fecha descendente y luego por id descendente', () => {
    expect(ids(sortPurchases(activePurchases(purchases)))).toEqual([9, 2, 1, 3, 5])
  })

  it('deja fuera las anuladas: van a la Papelera', () => {
    expect(ids(filterPurchases(purchases, all, today))).not.toContain(4)
    expect(ids(filterPurchases(purchases, { ...all, estado: '' }, today))).toHaveLength(5)
  })

  it('filtra por periodo de la fecha de la factura', () => {
    expect(ids(filterPurchases(purchases, DEFAULT_FILTERS, today))).toEqual([9, 2, 1])
    expect(ids(filterPurchases(purchases, { ...all, periodo: 'mes-anterior' }, today))).toEqual([3])
    expect(ids(filterPurchases(purchases, { ...all, periodo: 'este-ano' }, today))).toEqual([9, 2, 1, 3])
    expect(ids(filterPurchases(purchases, all, today))).toEqual([9, 2, 1, 3, 5])
  })

  it('filtra por estado y por forma de pago', () => {
    expect(ids(filterPurchases(purchases, { ...all, estado: 'PENDIENTE' }, today))).toEqual([2, 3])
    expect(ids(filterPurchases(purchases, { ...all, pago: 'CREDITO' }, today))).toEqual([2, 3, 5])
    expect(ids(filterPurchases(purchases, { ...all, estado: 'PAGADA', pago: 'CONTADO' }, today))).toEqual([9, 1])
  })

  it('busca por numero o proveedor sin distinguir mayusculas ni tildes', () => {
    expect(ids(filterPurchases(purchases, { ...all, q: 'db-184' }, today))).toEqual([1])
    expect(ids(filterPurchases(purchases, { ...all, q: 'BOYACA' }, today))).toEqual([1])
    expect(ids(filterPurchases(purchases, { ...all, q: 'nanez' }, today))).toEqual([9])
    expect(ids(filterPurchases(purchases, { ...all, q: 'no existe' }, today))).toEqual([])
  })
})

describe('indicadores de compras', () => {
  it('por pagar suma el saldo pendiente de las PENDIENTE y las cuenta', () => {
    expect(payable(purchases)).toEqual({ amount: 2200, count: 2 })
  })

  it('pagos del mes cuenta solo los pagos de compras a credito', () => {
    const movement = (id: number, purchaseId: number | null, amount: number): TreasuryMovement => ({
      id,
      accountId: 1,
      accountName: 'Caja General',
      type: 'EGRESO',
      category: 'PAGO_COMPRA',
      concept: 'Pago',
      amount,
      date: '2026-10-15',
      notes: null,
      saleId: null,
      purchaseId,
      relatedMovementId: null,
    })
    const movements = [
      movement(1, 2, 500), // pago a credito
      movement(2, 1, 1190), // egreso de una compra de contado: no cuenta
      movement(3, 5, 300), // otra compra a credito
      movement(4, null, 999),
      movement(5, 77, 50), // compra que no esta en la lista
    ]
    expect(creditPayments(movements, purchases)).toBe(800)
  })
})
