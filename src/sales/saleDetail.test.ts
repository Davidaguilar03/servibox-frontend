import { describe, expect, it } from 'vitest'
import {
  buildCollectionRequest,
  collectionDateRange,
  lineTotal,
  parseSaleId,
  saleActions,
  saleSummary,
  sortCollections,
  validateCollection,
} from './saleDetail'
import { businessToday } from './salesList'

describe('botones segun el estado', () => {
  it('PENDIENTE (credito, con o sin abonos): abonar y anular', () => {
    expect(saleActions({ status: 'PENDIENTE' })).toEqual({ canCollect: true, canAnnul: true })
  })

  it('PAGADA (contado o credito saldado): solo anular', () => {
    expect(saleActions({ status: 'PAGADA' })).toEqual({ canCollect: false, canAnnul: true })
  })

  it('ANULADA: solo lectura', () => {
    expect(saleActions({ status: 'ANULADA' })).toEqual({ canCollect: false, canAnnul: false })
  })
})

describe('parseSaleId', () => {
  it('solo acepta digitos', () => {
    expect(parseSaleId('12')).toBe(12)
    for (const value of ['abc', '12a', '-1', '1.5', '', ' 3', undefined]) expect(parseSaleId(value)).toBeNull()
  })
})

describe('resumen', () => {
  it('credito con abono: abonado es total menos saldo y coincide con los abonos', () => {
    const summary = saleSummary({ subtotal: 2000000, total: 2380000, pendingBalance: 1880000, status: 'PENDIENTE' })
    expect(summary).toEqual({ subtotal: 2000000, iva: 380000, total: 2380000, paid: 500000, pending: 1880000 })
  })

  it('contado: todo abonado, saldo cero', () => {
    const summary = saleSummary({ subtotal: 395590.79, total: 470753.04, pendingBalance: 0, status: 'PAGADA' })
    expect(summary).toMatchObject({ iva: 75162.25, paid: 470753.04, pending: 0 })
  })

  it('con centavos bajo la tolerancia de un peso el backend da saldo cero y abonado el total', () => {
    // Abonos por 209.876 de una factura de 209.876,53: el backend deja 0,53 como saldado.
    const summary = saleSummary({ subtotal: 176366.83, total: 209876.53, pendingBalance: 0, status: 'PAGADA' })
    expect(summary.paid).toBe(209876.53)
  })

  it('una anulada no tiene abonado ni saldo', () => {
    expect(saleSummary({ subtotal: 100, total: 119, pendingBalance: 0, status: 'ANULADA' })).toMatchObject({
      paid: null,
      pending: null,
    })
  })

  it('el total de una linea es precio por cantidad mas su IVA', () => {
    expect(lineTotal({ price: 200000, quantity: 8, ivaAmount: 304000 })).toBe(1904000)
    expect(lineTotal({ price: 176366.83, quantity: 2, ivaAmount: 67019.4 })).toBe(419753.06)
  })

  it('ordena los abonos por fecha descendente', () => {
    const rows = sortCollections([
      { id: 1, date: '2026-10-01' },
      { id: 3, date: '2026-10-15' },
      { id: 2, date: '2026-10-15' },
    ])
    expect(rows.map((row) => row.id)).toEqual([3, 2, 1])
  })
})

describe('abono', () => {
  const range = collectionDateRange('2026-10-05', '2026-10-18')
  const draft = { accountId: 10, amount: '500000', date: '2026-10-18' }

  it('la fecha va de la factura a hoy, y hoy es Bogota', () => {
    expect(range).toEqual({ min: '2026-10-05', max: '2026-10-18' })
    expect(businessToday(new Date('2026-10-19T03:00:00Z'))).toBe('2026-10-18')
  })

  it('un abono dentro del saldo y del rango es valido, en los limites incluidos', () => {
    expect(validateCollection(draft, 1880000, range).valid).toBe(true)
    expect(validateCollection({ ...draft, amount: '1880000', date: '2026-10-05' }, 1880000, range).valid).toBe(true)
  })

  it('el valor debe ser mayor que cero', () => {
    expect(validateCollection({ ...draft, amount: '0' }, 1880000, range).errors.amount).toBe('El valor debe ser mayor que cero.')
    expect(validateCollection({ ...draft, amount: '' }, 1880000, range).valid).toBe(false)
    expect(validateCollection({ ...draft, amount: '-5' }, 1880000, range).valid).toBe(false)
  })

  it('no puede superar el saldo pendiente', () => {
    expect(validateCollection({ ...draft, amount: '1880000.01' }, 1880000, range).errors.amount).toBe(
      'No puede superar el saldo pendiente de $ 1.880.000',
    )
  })

  it('la fecha no puede ser anterior a la factura ni posterior a hoy', () => {
    const message = 'La fecha debe estar entre el 05/10/2026 y el 18/10/2026.'
    expect(validateCollection({ ...draft, date: '2026-10-04' }, 1880000, range).errors.date).toBe(message)
    expect(validateCollection({ ...draft, date: '2026-10-19' }, 1880000, range).errors.date).toBe(message)
    expect(validateCollection({ ...draft, date: '' }, 1880000, range).valid).toBe(false)
  })

  it('pide la cuenta', () => {
    expect(validateCollection({ ...draft, accountId: null }, 1880000, range).errors.account).toBeDefined()
  })

  it('el cuerpo del POST lleva cuenta, valor y fecha', () => {
    expect(buildCollectionRequest(draft)).toEqual({ accountId: 10, amount: 500000, date: '2026-10-18' })
  })
})
