import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Pagination } from '../components/Pagination'
import { StatusBadge, type BadgeStatus } from '../components/StatusBadge'
import { iconSm } from '../components/icons'
import { EMPTY_VALUE, formatCurrency, formatInteger, formatPercent, formatShortDate, formatSignedCurrency } from '../lib/format'
import { paginate } from '../lib/pagination'
import {
  AGING_LABELS,
  STOCK_BADGES,
  reportTotals,
  signedRowAmount,
  sortRows,
  type LiveReportDefinition,
  type ReportColumn,
  type ReportRow,
  type SortDirection,
} from './liveReports'
import type { StockStatus } from '../lib/stock'

const PAYMENT_LABELS: Record<string, string> = { CONTADO: 'Contado', CREDITO: 'Crédito' }
const ITEM_TYPE_LABELS: Record<string, string> = { PRODUCTO: 'Producto', SERVICIO: 'Servicio' }
const NUMERIC = new Set(['currency', 'integer', 'percent', 'signedAmount'])

/** Monto con signo explicito (+ o -, sin signo en cero): el color acompana, no es la unica senal. */
function signedAmount(value: number) {
  const text = formatSignedCurrency(value)
  return <span className={`monto whitespace-nowrap ${text.startsWith('-') ? 'text-error' : ''}`}>{text}</span>
}

function cell(column: ReportColumn, value: string | number | null | undefined, row?: ReportRow): ReactNode {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE
  switch (column.format) {
    case 'currency':
      return <span className="monto whitespace-nowrap">{formatCurrency(Number(value))}</span>
    case 'integer':
      return <span className="tabular">{formatInteger(Number(value))}</span>
    case 'percent':
      return <span className="tabular whitespace-nowrap">{formatPercent(Number(value))}</span>
    case 'date':
      return <span className="whitespace-nowrap">{formatShortDate(String(value))}</span>
    case 'code':
      return <span className="codigo whitespace-nowrap">{value}</span>
    case 'status':
      return <StatusBadge status={String(value) as BadgeStatus} />
    case 'paymentType':
      return PAYMENT_LABELS[String(value)] ?? value
    case 'itemType':
      return ITEM_TYPE_LABELS[String(value)] ?? value
    case 'aging':
      return <span className="whitespace-nowrap">{AGING_LABELS[String(value)] ?? value}</span>
    case 'text':
      // Una linea con puntos suspensivos y el texto completo en el titulo: un nombre largo cede ancho
      // cuando la tabla no cabe y se ve entero cuando sobra espacio.
      return <span className="line-clamp-1 break-all" title={String(value)}>{value}</span>
    case 'stockStatus':
      return <StatusBadge status={STOCK_BADGES[String(value) as StockStatus] ?? (String(value) as BadgeStatus)} />
    case 'direction':
      return <StatusBadge status={value === 'SALIDA' ? 'SALIDA' : 'ENTRADA'} />
    case 'signedAmount':
      return signedAmount(signedRowAmount(row, Number(value)))
    default:
      return value
  }
}

/**
 * Tabla de un reporte en vivo: orden por columna en el cliente, fila de totales y paginas de
 * 25 sobre el conjunto completo. En movil se desplaza dentro de su contenedor.
 */
export function ReportTable({ definition, rows }: { definition: LiveReportDefinition; rows: ReportRow[] }) {
  const [sort, setSort] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: 'asc' })
  const [pageNumber, setPageNumber] = useState(1)
  const sorted = definition.fixedOrder ? rows : sortRows(rows, sort.key, sort.direction)
  const keyOf = (row: ReportRow) => (typeof definition.rowKey === 'function' ? definition.rowKey(row) : String(row[definition.rowKey]))
  const page = paginate(sorted, pageNumber)
  const totals = reportTotals(definition, rows)
  const align = (column: ReportColumn) => (NUMERIC.has(column.format) ? 'text-right' : 'text-left')

  function toggle(key: string) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
    setPageNumber(1)
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="overflow-x-auto rounded-surface border border-t-2 border-border border-t-border-accent bg-surface">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {definition.columns.map((column) => {
                const active = sort.key === column.key
                const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
                if (definition.fixedOrder) {
                  return (
                    <th key={column.key} scope="col" className={`bg-canvas px-2 py-3 text-label text-text-muted uppercase ${align(column)}`}>
                      {column.header}
                    </th>
                  )
                }
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`bg-canvas px-2 py-2 text-label text-text-muted uppercase ${align(column)}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(column.key)}
                      className={`inline-flex min-h-touch items-center gap-1 rounded-control uppercase focus-ring lg:min-h-control ${align(column)} ${active ? 'text-text' : 'hover:text-text'}`}
                    >
                      {column.header}
                      <Icon {...iconSm} aria-hidden className={active ? '' : 'text-text-subtle'} />
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row) => (
              <tr
                key={keyOf(row)}
                className={`h-row border-b border-border ${definition.emphasize?.(row) ? 'bg-canvas font-semibold' : 'even:bg-row-alt hover:bg-neutral-100'}`}
              >
                {definition.columns.map((column) => (
                  <td key={column.key} className={`px-2 text-small text-text ${align(column)}`}>
                    {cell(column, row[column.key], row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="h-row bg-canvas font-semibold">
                {definition.columns.map((column, index) => (
                  index === 0 ? (
                    <th key={column.key} scope="row" className="px-2 text-left text-small text-text">Total</th>
                  ) : (
                    <td key={column.key} className={`px-2 text-small text-text ${align(column)}`}>
                      {column.key in totals ? cell(column, totals[column.key]) : null}
                    </td>
                  )
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {definition.inTotals && totals && <p className="text-small text-text-muted">Las facturas anuladas se listan pero no suman en el total.</p>}
      <Pagination page={page} itemLabel="filas" onPageChange={setPageNumber} />
    </div>
  )
}
