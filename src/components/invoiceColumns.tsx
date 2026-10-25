import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { INVOICE_TABLE_FULL, INVOICE_TABLE_MEDIUM } from '../lib/useElementWidth'
import { CellLink } from './CellLink'
import type { Column } from './DataTable'
import { PendingBalance } from './PendingBalance'
import { StatusBadge } from './StatusBadge'

interface InvoiceRow {
  id: number
  invoiceNumber: string
  invoiceDate: string
  dueDate: string | null
  paymentType: 'CONTADO' | 'CREDITO'
  status: 'PAGADA' | 'PENDIENTE' | 'ANULADA'
  total: number
  pendingBalance: number
}

const paymentTypeLabels: Record<InvoiceRow['paymentType'], string> = { CONTADO: 'Contado', CREDITO: 'Crédito' }

interface InvoiceColumnsOptions<T> {
  partyLabel: string
  partyName: (row: T) => string
  detailPath: (row: T) => string
  /** Ancho real del recuadro de la tabla (`useElementWidth`), no el de la ventana. */
  width: number
}

/**
 * Columnas de Facturas de venta y de compra segun el ancho del recuadro. Numero, tercero,
 * estado, total, saldo y acciones siempre; Vence y Forma de pago, y luego la Fecha, pasan a
 * una segunda linea bajo el tercero cuando no caben. Asi la tabla no se desplaza.
 */
export function invoiceColumns<T extends InvoiceRow>({ partyLabel, partyName, detailPath, width }: InvoiceColumnsOptions<T>): Column<T>[] {
  const full = width >= INVOICE_TABLE_FULL
  const withDate = width >= INVOICE_TABLE_MEDIUM
  const due = (row: T) => (row.paymentType === 'CONTADO' ? EMPTY_VALUE : formatDate(row.dueDate))

  const party = (row: T) => {
    if (full) return partyName(row)
    const details = [
      !withDate && formatDate(row.invoiceDate),
      paymentTypeLabels[row.paymentType],
      row.paymentType === 'CREDITO' && `Vence ${formatDate(row.dueDate)}`,
    ].filter(Boolean)
    return (
      <span className="flex flex-col">
        <span>{partyName(row)}</span>
        <span className="text-small text-text-muted">{details.join(' · ')}</span>
      </span>
    )
  }

  return [
    { header: 'N.º factura', render: (row) => <span className="codigo">{row.invoiceNumber}</span> },
    ...(withDate ? [{ header: 'Fecha', render: (row: T) => formatDate(row.invoiceDate) }] : []),
    { header: partyLabel, render: party },
    ...(full
      ? [
          { header: 'Vence', render: due },
          { header: 'Forma de pago', render: (row: T) => paymentTypeLabels[row.paymentType] ?? EMPTY_VALUE },
        ]
      : []),
    { header: 'Estado', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Total', align: 'right', render: (row) => <span className="monto whitespace-nowrap">{formatCurrency(row.total)}</span> },
    { header: 'Saldo pendiente', align: 'right', render: (row) => <PendingBalance invoice={row} /> },
    { header: '', render: (row) => <CellLink to={detailPath(row)}>Ver detalle</CellLink> },
  ]
}
