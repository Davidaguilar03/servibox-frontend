import type { Account } from '../dashboard/dashboardApi'
import { formatCurrency, formatDate } from '../lib/format'
import { round2 } from '../sales/newSale'
import type { Purchase } from './purchasesApi'

// Logica del detalle de factura de compra. El resumen, el id de la ruta, el total de linea,
// el orden de los movimientos, el rango de fecha y el cuerpo del POST son los del detalle
// de venta (saleDetail.ts). Reglas en docs/ai-context/03-DECISIONS.md.

/**
 * Registrar pago solo en una PENDIENTE (el backend rechaza las demas). Anular en una
 * PAGADA o PENDIENTE, con o sin pagos. Una ANULADA queda en solo lectura.
 */
export function purchaseActions(purchase: Pick<Purchase, 'status'>) {
  return { canPay: purchase.status === 'PENDIENTE', canAnnul: purchase.status !== 'ANULADA' }
}

export interface PaymentDraft {
  accountId: number | null
  amount: string
  date: string
}

export interface PaymentErrors {
  account?: string
  amount?: string
  date?: string
}

/**
 * Validacion del pago: cuenta, valor mayor que cero y no mayor que el saldo pendiente,
 * fecha en el rango. Aparte, `insufficient` refleja `exigirSaldoSuficiente`: la cuenta no
 * alcanza si su saldo es menor que el valor.
 */
export function validatePayment(
  draft: PaymentDraft,
  pending: number,
  range: { min: string; max: string },
  account: Pick<Account, 'currentBalance'> | undefined,
) {
  const errors: PaymentErrors = {}
  if (draft.accountId === null) errors.account = 'Elige la cuenta de la que sale el dinero.'
  const amount = Number(draft.amount)
  const validAmount = draft.amount.trim() !== '' && Number.isFinite(amount) && amount > 0
  if (!validAmount) {
    errors.amount = 'El valor debe ser mayor que cero.'
  } else if (round2(amount) > round2(pending)) {
    errors.amount = `No puede superar el saldo pendiente de ${formatCurrency(pending)}`
  }
  if (!draft.date || draft.date < range.min || draft.date > range.max) {
    errors.date = `La fecha debe estar entre el ${formatDate(range.min)} y el ${formatDate(range.max)}.`
  }
  const insufficient = validAmount && account !== undefined && account.currentBalance < amount
  return { errors, insufficient, valid: Object.keys(errors).length === 0 && !insufficient }
}
