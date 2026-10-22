import type { Account, AccountType } from '../dashboard/dashboardApi'
import { parseAmount } from '../inventory/productForm'
import type { AccountRequest, TransferRequest } from './accountsApi'

// Formularios de Nueva cuenta y Nueva transferencia. Reglas en docs/ai-context/03-DECISIONS.md.

export interface AccountFormValues {
  name: string
  type: AccountType
  /** Vacio cuenta como 0. */
  initialBalance: string
}

export const EMPTY_ACCOUNT_FORM: AccountFormValues = { name: '', type: 'EFECTIVO', initialBalance: '0' }

export type AccountErrors = Partial<Record<keyof AccountFormValues, string>>

const amountOf = (text: string) => (text.trim() ? parseAmount(text) : 0)

export function validateAccount(values: AccountFormValues): AccountErrors {
  const errors: AccountErrors = {}
  if (!values.name.trim()) errors.name = 'Escribe el nombre de la cuenta.'
  if (!(amountOf(values.initialBalance) >= 0)) errors.initialBalance = 'El saldo inicial debe ser un valor mayor o igual a cero.'
  return errors
}

export function buildAccountRequest(values: AccountFormValues): AccountRequest {
  return { name: values.name.trim(), type: values.type, initialBalance: amountOf(values.initialBalance) }
}

export interface TransferFormValues {
  /** Ids como texto; vacio es sin elegir. */
  originAccountId: string
  destinationAccountId: string
  amount: string
  concept: string
}

export type TransferErrors = Partial<Record<keyof TransferFormValues, string>>

/**
 * Cuentas distintas y monto mayor que cero y no mayor que el saldo actual del origen. El
 * backend no revisa el saldo de una transferencia (si lo hace en las compras), asi que el
 * cliente lo exige para no dejar una cuenta en negativo.
 */
export function validateTransfer(values: TransferFormValues, accounts: Account[]): TransferErrors {
  const errors: TransferErrors = {}
  const origin = accounts.find((account) => String(account.id) === values.originAccountId)
  if (!origin) errors.originAccountId = 'Elige la cuenta de origen.'
  if (!values.destinationAccountId) errors.destinationAccountId = 'Elige la cuenta de destino.'
  else if (values.destinationAccountId === values.originAccountId)
    errors.destinationAccountId = 'La cuenta de destino tiene que ser distinta de la de origen.'
  const amount = parseAmount(values.amount)
  if (!values.amount.trim()) errors.amount = 'Escribe el monto.'
  else if (!(amount > 0)) errors.amount = 'El monto debe ser mayor que cero.'
  else if (origin && amount > origin.currentBalance) errors.amount = `Fondos insuficientes en ${origin.name}.`
  return errors
}

export function buildTransferRequest(values: TransferFormValues): TransferRequest {
  const concept = values.concept.trim()
  return {
    originAccountId: Number(values.originAccountId),
    destinationAccountId: Number(values.destinationAccountId),
    amount: parseAmount(values.amount),
    ...(concept ? { concept } : {}),
  }
}
