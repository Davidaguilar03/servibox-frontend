import { describe, expect, it } from 'vitest'
import { businessToday } from '../lib/businessDate'
import { buildCollectionRequest, collectionDateRange, saleSummary } from '../sales/saleDetail'
import { purchaseActions, validatePayment } from './purchaseDetail'

describe('botones de la compra segun el estado', () => {
  it('PENDIENTE (credito, con o sin pagos): pagar y anular', () => {
    expect(purchaseActions({ status: 'PENDIENTE' })).toEqual({ canPay: true, canAnnul: true })
  })

  it('PAGADA (contado o credito saldado): solo anular', () => {
    expect(purchaseActions({ status: 'PAGADA' })).toEqual({ canPay: false, canAnnul: true })
  })

  it('ANULADA: solo lectura', () => {
    expect(purchaseActions({ status: 'ANULADA' })).toEqual({ canPay: false, canAnnul: false })
  })
})

describe('resumen de la compra', () => {
  it('credito con pagos: pagado es total menos saldo pendiente', () => {
    expect(saleSummary({ subtotal: 502469.14, total: 597938.28, pendingBalance: 497938.28, status: 'PENDIENTE' })).toEqual({
      subtotal: 502469.14,
      iva: 95469.14,
      total: 597938.28,
      paid: 100000,
      pending: 497938.28,
    })
  })

  it('contado: pagado el total y saldo cero', () => {
    expect(saleSummary({ subtotal: 231333.31, total: 275286.64, pendingBalance: 0, status: 'PAGADA' })).toMatchObject({
      paid: 275286.64,
      pending: 0,
    })
  })

  it('un saldo menor a un peso el backend lo da por pagado', () => {
    expect(saleSummary({ subtotal: 100, total: 119.5, pendingBalance: 0, status: 'PAGADA' }).paid).toBe(119.5)
  })

  it('una anulada no tiene pagado ni saldo', () => {
    expect(saleSummary({ subtotal: 100, total: 119, pendingBalance: 0, status: 'ANULADA' })).toMatchObject({
      paid: null,
      pending: null,
    })
  })
})

describe('pago a una compra', () => {
  const range = collectionDateRange('2026-10-05', businessToday(new Date('2026-10-19T03:00:00Z')))
  const draft = { accountId: 10, amount: '500000', date: '2026-10-18' }
  const account = { currentBalance: 1000000 }

  it('la fecha va de la factura a hoy en Bogota: a las 3 a. m. UTC del 19 todavia es 18', () => {
    expect(range).toEqual({ min: '2026-10-05', max: '2026-10-18' })
  })

  it('un pago dentro del saldo, del rango y de la cuenta es valido, en los limites incluidos', () => {
    expect(validatePayment(draft, 597938.28, range, account).valid).toBe(true)
    expect(validatePayment({ ...draft, amount: '597938.28', date: '2026-10-05' }, 597938.28, range, account).valid).toBe(true)
  })

  it('el valor debe ser mayor que cero', () => {
    expect(validatePayment({ ...draft, amount: '0' }, 597938.28, range, account).errors.amount).toBe(
      'El valor debe ser mayor que cero.',
    )
    expect(validatePayment({ ...draft, amount: '' }, 597938.28, range, account).valid).toBe(false)
    expect(validatePayment({ ...draft, amount: '-1' }, 597938.28, range, account).valid).toBe(false)
  })

  it('no puede superar el saldo pendiente', () => {
    expect(validatePayment({ ...draft, amount: '597938.29' }, 597938.28, range, account).errors.amount).toBe(
      'No puede superar el saldo pendiente de $ 597.938',
    )
  })

  it('la cuenta alcanza con saldo igual al valor y no con un peso menos', () => {
    expect(validatePayment(draft, 597938.28, range, { currentBalance: 500000 })).toMatchObject({ insufficient: false, valid: true })
    const short = validatePayment(draft, 597938.28, range, { currentBalance: 499999 })
    expect(short).toMatchObject({ insufficient: true, valid: false })
    expect(short.errors).toEqual({})
  })

  it('la fecha no puede ser anterior a la factura ni posterior a hoy', () => {
    const message = 'La fecha debe estar entre el 05/10/2026 y el 18/10/2026.'
    expect(validatePayment({ ...draft, date: '2026-10-04' }, 597938.28, range, account).errors.date).toBe(message)
    expect(validatePayment({ ...draft, date: '2026-10-19' }, 597938.28, range, account).errors.date).toBe(message)
  })

  it('pide la cuenta', () => {
    expect(validatePayment({ ...draft, accountId: null }, 597938.28, range, undefined).errors.account).toBe(
      'Elige la cuenta de la que sale el dinero.',
    )
  })

  it('el cuerpo del POST lleva cuenta, valor y fecha', () => {
    expect(buildCollectionRequest(draft)).toEqual({ accountId: 10, amount: 500000, date: '2026-10-18' })
  })
})
