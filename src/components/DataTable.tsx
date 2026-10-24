import type { ReactNode } from 'react'
import { EmptyState, ErrorState, Skeleton } from './states'

export interface Column<T> {
  header: string
  /** Numeros y montos a la derecha; texto a la izquierda. */
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  loading: boolean
  error: boolean
  onRetry: () => void
  emptyMessage: string
  skeletonRows?: number
  /** Vista de tarjetas bajo md: con ella la tabla solo se muestra desde md. */
  card?: (row: T) => ReactNode
  /** Nombre accesible de la lista de tarjetas. */
  cardsLabel?: string
}

/**
 * Tabla de datos del manual: encabezado fijo en mayusculas, filas de 48 px con fila alterna
 * y hover, numeros tabulares. Resuelve tambien los estados de carga, vacio y error.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  emptyMessage,
  skeletonRows = 4,
  card,
  cardsLabel,
}: DataTableProps<T>) {
  if (error) return <ErrorState message="No pudimos cargar esta información." onRetry={onRetry} />
  if (!loading && rows?.length === 0) return <EmptyState message={emptyMessage} />

  const alignClass = (column: Column<T>) => (column.align === 'right' ? 'text-right' : 'text-left')

  const table = (
    <div className={`overflow-x-auto ${card ? 'hidden md:block' : ''}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`sticky top-0 bg-canvas px-3 py-3 text-label whitespace-nowrap text-text-muted uppercase first:rounded-l-control last:rounded-r-control ${alignClass(column)}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={loading || undefined}>
          {loading
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={index} className="h-row border-b border-border last:border-b-0">
                  {columns.map((column) => (
                    <td key={column.header} className="px-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            : rows?.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="h-row border-b border-border transition-colors duration-(--duration-fast) last:border-b-0 even:bg-row-alt hover:bg-neutral-100"
                >
                  {columns.map((column) => (
                    <td key={column.header} className={`px-3 text-small text-text ${alignClass(column)}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
  if (!card) return table

  // Bajo md la tabla se oculta y se muestran tarjetas con la misma informacion; las dos
  // quedan en el DOM y el cambio es solo por CSS, como en los listados.
  return (
    <>
      {table}
      {loading ? (
        <div className="flex flex-col gap-3 md:hidden" aria-busy>
          {Array.from({ length: skeletonRows }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-control" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3 md:hidden" aria-label={cardsLabel}>
          {rows?.map((row) => (
            <li key={rowKey(row)} className="flex flex-col gap-2 rounded-control border border-border p-4">
              {card(row)}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
