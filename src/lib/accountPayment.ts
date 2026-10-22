import type { Account, AccountType } from '../dashboard/dashboardApi'

// Cuenta y medio de pago de una factura de contado (venta o compra). Reglas en
// docs/ai-context/03-DECISIONS.md.

/** Valores validos de un medio de pago: el de efectivo y los de banco o billetera. */
export interface PaymentMethodCatalog<M extends string> {
  cash: M
  nonCash: M[]
}

/** El medio sale del tipo de la cuenta, no de su nombre. El primero es el de por defecto. */
export function accountPaymentMethods<M extends string>(
  type: AccountType | undefined,
  catalog: PaymentMethodCatalog<M>,
): { options: M[]; locked: boolean } {
  if (type === 'EFECTIVO') return { options: [catalog.cash], locked: true }
  if (type === 'BANCO' || type === 'DIGITAL') return { options: catalog.nonCash, locked: false }
  return { options: [], locked: true }
}

/** La primera cuenta de tipo EFECTIVO por id ascendente: la que se propone en contado. */
export function defaultCashAccount(accounts: Account[] | undefined): Account | undefined {
  return [...(accounts ?? [])].sort((a, b) => a.id - b.id).find((account) => account.type === 'EFECTIVO')
}
