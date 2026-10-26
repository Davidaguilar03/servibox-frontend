import { describe, expect, it } from 'vitest'
import { buildAccountRequest, buildAccountUpdateRequest, buildTransferRequest, validateTransfer } from '../accounts/accountForms'
import { validatePayment } from '../purchases/purchaseDetail'
import { insufficientBalance, purchaseTotals } from '../purchases/newPurchase'
import { invoiceTotals, lineAmounts } from '../sales/newSale'
import { buildCollectionRequest, saleSummary, validateCollection } from '../sales/saleDetail'
import { addMoney, round2 } from './money'

const range = { min: '2026-10-01', max: '2026-10-25' }
const draft = { accountId: 1, amount: '0.105', date: range.max }

describe('normalizacion monetaria', () => {
  it('suma las lineas definitivas igual al resumen de venta y compra', () => {
    const lines = [0.03, 5.67, 0.01].map((price) => ({ price, quantity: 3, rate: 0.19 }))
    const amounts = lines.map(lineAmounts)
    for (const totals of [invoiceTotals(lines), purchaseTotals(lines)]) {
      expect(totals.subtotal).toBe(amounts.reduce((sum, line) => addMoney(sum, line.base), 0))
      expect(totals.iva).toBe(amounts.reduce((sum, line) => addMoney(sum, line.iva), 0))
      expect(totals.total).toBe(addMoney(totals.subtotal, totals.iva))
    }
  })

  it('compra de dos centavos alcanza exactamente y rechaza un centavo menos', () => {
    const total = purchaseTotals(Array.from({ length: 2 }, () => ({ price: 0.01, quantity: 1, rate: 0.19 }))).total
    expect(total).toBe(0.02)
    expect(insufficientBalance(0.02, total)).toBe(false)
    expect(addMoney(0.02, -total)).toBe(0)
    expect(insufficientBalance(0.01, total)).toBe(true)
    expect(insufficientBalance(0.3, 0.1 + 0.2)).toBe(false)
  })

  it('HALF_UP conserva mitades positivas y negativas sin redondeo binario', () => {
    expect(round2(2.335)).toBe(2.34)
    expect(round2(-2.335)).toBe(-2.34)
    expect(addMoney(0.3, -0.2)).toBe(0.1)
  })

  it('pagos y abonos comparan el monto normalizado sin rechazar su precision', () => {
    expect(validatePayment(draft, 0.11, range, { currentBalance: 0.11 }).valid).toBe(true)
    expect(validatePayment(draft, 0.11, range, { currentBalance: 0.10 }).insufficient).toBe(true)
    expect(validateCollection(draft, 0.11, range).valid).toBe(true)
    expect(validateCollection(draft, 0.10, range).valid).toBe(false)
    expect(buildCollectionRequest(draft).amount).toBe(0.105)
    expect(validatePayment({ ...draft, amount: '0.004' }, 1, range, { currentBalance: 1 }).valid).toBe(false)
    expect(validateCollection({ ...draft, amount: '0.004' }, 1, range).valid).toBe(false)
  })

  it('transferencias normalizan para comparar fondos y conservan el envio al servidor', () => {
    const accounts = [{ id: 1, name: 'Caja', type: 'EFECTIVO' as const, initialBalance: 0, currentBalance: 0.11 }]
    const values = { originAccountId: '1', destinationAccountId: '2', amount: '0,105', concept: '' }
    expect(validateTransfer(values, accounts)).toEqual({})
    expect(buildTransferRequest(values).amount).toBe(0.105)
    expect(validateTransfer({ ...values, amount: '0,115' }, accounts).amount).toBeDefined()
    expect(validateTransfer({ ...values, amount: '0,004' }, accounts).amount).toBeDefined()
  })

  it('alta y edicion de cuenta delegan HALF_UP al servidor sin limitar precision', () => {
    const values = { name: 'Caja', type: 'EFECTIVO' as const, initialBalance: '100,105' }
    expect(buildAccountRequest(values).initialBalance).toBe(100.105)
    expect(buildAccountUpdateRequest(values).initialBalance).toBe(100.105)
  })

  it('el resumen historico conserva el total guardado aunque no coincida con IVA recalculado', () => {
    expect(saleSummary({ subtotal: 0.06, total: 0.07, pendingBalance: 0, status: 'PAGADA' }))
      .toEqual({ subtotal: 0.06, iva: 0.01, total: 0.07, paid: 0.07, pending: 0 })
  })
})
