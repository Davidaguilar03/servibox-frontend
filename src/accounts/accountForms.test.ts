import { describe, expect, it } from 'vitest'
import type { Account } from '../dashboard/dashboardApi'
import { EMPTY_ACCOUNT_FORM, buildAccountRequest, buildTransferRequest, validateAccount, validateTransfer } from './accountForms'

const accounts: Account[] = [
  { id: 1, name: 'Caja General', type: 'EFECTIVO', currentBalance: 1946250 },
  { id: 2, name: 'Bancolombia', type: 'BANCO', currentBalance: 2230650 },
]

describe('nueva cuenta', () => {
  it('exige nombre y un saldo inicial mayor o igual a cero', () => {
    expect(validateAccount(EMPTY_ACCOUNT_FORM)).toEqual({ name: 'Escribe el nombre de la cuenta.' })
    expect(validateAccount({ ...EMPTY_ACCOUNT_FORM, name: 'Nequi', initialBalance: '-5' }).initialBalance).toBe(
      'El saldo inicial debe ser un valor mayor o igual a cero.',
    )
    expect(validateAccount({ ...EMPTY_ACCOUNT_FORM, name: 'Nequi', initialBalance: '' })).toEqual({})
  })

  it('arma el cuerpo con el nombre sin espacios y el saldo en pesos', () => {
    expect(buildAccountRequest({ name: ' Nequi ', type: 'DIGITAL', initialBalance: '150.000' })).toEqual({
      name: 'Nequi',
      type: 'DIGITAL',
      initialBalance: 150000,
    })
    expect(buildAccountRequest({ name: 'Caja menor', type: 'EFECTIVO', initialBalance: '' }).initialBalance).toBe(0)
  })
})

describe('nueva transferencia', () => {
  const values = { originAccountId: '1', destinationAccountId: '2', amount: '500.000', concept: '' }

  it('exige cuentas distintas', () => {
    expect(validateTransfer({ ...values, destinationAccountId: '1' }, accounts).destinationAccountId).toBe(
      'La cuenta de destino tiene que ser distinta de la de origen.',
    )
    expect(validateTransfer({ ...values, destinationAccountId: '' }, accounts).destinationAccountId).toBe('Elige la cuenta de destino.')
  })

  it('el monto es mayor que cero y no mayor que el saldo del origen', () => {
    expect(validateTransfer({ ...values, amount: '0' }, accounts).amount).toBe('El monto debe ser mayor que cero.')
    expect(validateTransfer({ ...values, amount: '1.946.251' }, accounts).amount).toBe('Fondos insuficientes en Caja General.')
    expect(validateTransfer({ ...values, amount: '1.946.250' }, accounts)).toEqual({})
  })

  it('arma el cuerpo sin fecha y sin concepto vacio', () => {
    expect(buildTransferRequest(values)).toEqual({ originAccountId: 1, destinationAccountId: 2, amount: 500000 })
    expect(buildTransferRequest({ ...values, concept: ' Consignacion ' })).toEqual({
      originAccountId: 1,
      destinationAccountId: 2,
      amount: 500000,
      concept: 'Consignacion',
    })
  })
})
