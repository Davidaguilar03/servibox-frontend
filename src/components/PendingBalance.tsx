import { EMPTY_VALUE, formatCurrency } from '../lib/format'

interface Invoice {
  status: 'PAGADA' | 'PENDIENTE' | 'ANULADA'
  /** `pendingBalance` del backend: lo que falta por cobrar o pagar; 0 en una ANULADA. */
  pendingBalance: number
}

/**
 * Saldo pendiente de una factura (rol monto): "—" si esta anulada, "$ 0" en tono neutro si ya
 * no debe nada y el saldo en texto normal si falta. El listado no distingue vencidas: sin rojo.
 */
export function PendingBalance({ invoice }: { invoice: Invoice }) {
  if (invoice.status === 'ANULADA') return <span className="monto whitespace-nowrap text-text-muted">{EMPTY_VALUE}</span>
  const tone = invoice.pendingBalance > 0 ? 'text-text' : 'text-text-muted'
  return <span className={`monto whitespace-nowrap ${tone}`}>{formatCurrency(invoice.pendingBalance)}</span>
}
