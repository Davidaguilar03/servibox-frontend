import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { IndicatorCard } from '../components/IndicatorCard'
import { Pagination } from '../components/Pagination'
import { SearchField } from '../components/SearchField'
import { SelectField } from '../components/SelectField'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState } from '../components/states'
import { fetchKpis, fetchSales, type Sale } from '../dashboard/dashboardApi'
import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { paginate } from '../lib/pagination'
import { fetchSaleCollections } from '../sales/salesApi'
import {
  CLEARED_FILTERS,
  activeSales,
  businessToday,
  creditCollections,
  customerName,
  filterSales,
  filtersToParams,
  monthRange,
  parseFilters,
  receivable,
  type SalesFilters,
} from '../sales/salesList'

const paymentTypeLabels: Record<Sale['paymentType'], string> = {
  CONTADO: 'Contado',
  CREDITO: 'Crédito',
}

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'PAGADA', label: 'Pagada' },
  { value: 'PENDIENTE', label: 'Pendiente' },
]

const paymentOptions = [
  { value: '', label: 'Todas' },
  { value: 'CONTADO', label: 'Contado' },
  { value: 'CREDITO', label: 'Crédito' },
]

const periodOptions = [
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'todas', label: 'Todas' },
]

const linkClass =
  'rounded-tag text-small font-medium whitespace-nowrap text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const card = 'rounded-card border border-border bg-surface shadow-card'

const columns: Column<Sale>[] = [
  { header: 'N.º factura', render: (s) => <span className="font-mono">{s.invoiceNumber}</span> },
  { header: 'Cliente', render: (s) => customerName(s) },
  { header: 'Fecha', render: (s) => formatDate(s.invoiceDate) },
  { header: 'Vence', render: (s) => (s.paymentType === 'CONTADO' ? EMPTY_VALUE : formatDate(s.dueDate)) },
  { header: 'Forma de pago', render: (s) => paymentTypeLabels[s.paymentType] ?? EMPTY_VALUE },
  { header: 'Total', align: 'right', render: (s) => formatCurrency(s.total) },
  { header: 'Estado', render: (s) => <StatusBadge status={s.status} /> },
  {
    header: '',
    render: (s) => (
      <Link to={`/ventas/${s.id}`} className={linkClass}>
        Ver detalle
      </Link>
    ),
  },
]

/** Facturas de venta: indicadores, filtros en la URL y listado paginado. */
export function SalesInvoicesPage() {
  const [today] = useState(() => businessToday())
  const { desde, hasta } = monthRange(today)
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)

  const sales = useQuery({ queryKey: ['sales'], queryFn: fetchSales })
  const kpis = useQuery({ queryKey: ['kpis', desde, hasta], queryFn: () => fetchKpis(desde, hasta) })
  const collections = useQuery({
    queryKey: ['treasury', 'movements', 'RECAUDO_VENTA', desde, hasta],
    queryFn: () => fetchSaleCollections(desde, hasta),
  })

  // Cambiar un filtro vuelve a la primera pagina. Escribir en el buscador reemplaza la
  // entrada del historial para no dejar una por letra.
  function updateFilters(change: Partial<SalesFilters>, replace = false) {
    setSearchParams(filtersToParams({ ...filters, pagina: 1, ...change }), { replace })
  }
  const clearFilters = () => updateFilters(CLEARED_FILTERS)

  const pending = sales.data ? receivable(sales.data) : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">Facturas de venta</h1>
          <p className="mt-1 text-small text-text-muted">
            Ventas de contado y a crédito. Las facturas anuladas están en la papelera.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/ventas/papelera" className={buttonClasses('secondary')}>
            Papelera
          </Link>
          <Link to="/ventas/nueva" className={buttonClasses('primary')}>
            Nueva factura
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <IndicatorCard
          label="Ventas del mes"
          value={kpis.data ? formatCurrency(kpis.data.totalSales) : undefined}
          error={kpis.isError}
          onRetry={() => void kpis.refetch()}
        />
        <IndicatorCard
          label="Por cobrar"
          value={pending ? formatCurrency(pending.amount) : undefined}
          detail={pending && `${pending.count} ${pending.count === 1 ? 'factura pendiente' : 'facturas pendientes'} de abono`}
          error={sales.isError}
          onRetry={() => void sales.refetch()}
        />
        <IndicatorCard
          label="Abonos del mes"
          value={collections.data && sales.data ? formatCurrency(creditCollections(collections.data, sales.data)) : undefined}
          error={collections.isError || sales.isError}
          onRetry={() => {
            if (collections.isError) void collections.refetch()
            if (sales.isError) void sales.refetch()
          }}
        />
      </div>

      <div className={`${card} grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end`}>
        <SearchField
          label="Buscar"
          placeholder="Número de factura o cliente"
          value={filters.q}
          onChange={(event) => updateFilters({ q: event.target.value }, true)}
        />
        <SelectField
          label="Estado"
          options={statusOptions}
          value={filters.estado}
          onChange={(event) => updateFilters({ estado: event.target.value as SalesFilters['estado'] })}
        />
        <SelectField
          label="Forma de pago"
          options={paymentOptions}
          value={filters.pago}
          onChange={(event) => updateFilters({ pago: event.target.value as SalesFilters['pago'] })}
        />
        <SelectField
          label="Periodo"
          options={periodOptions}
          value={filters.periodo}
          onChange={(event) => updateFilters({ periodo: event.target.value as SalesFilters['periodo'] })}
        />
        <Button variant="secondary" onClick={clearFilters}>
          Limpiar
        </Button>
      </div>

      <SalesTable
        sales={sales.data}
        loading={sales.isPending}
        error={sales.isError}
        onRetry={() => void sales.refetch()}
        filters={filters}
        today={today}
        onPageChange={(pagina) => setSearchParams(filtersToParams({ ...filters, pagina }))}
        onClear={clearFilters}
      />
    </div>
  )
}

interface SalesTableProps {
  sales: Sale[] | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  filters: SalesFilters
  today: string
  onPageChange: (page: number) => void
  onClear: () => void
}

function SalesTable({ sales, loading, error, onRetry, filters, today, onPageChange, onClear }: SalesTableProps) {
  let content: ReactNode
  if (error) {
    content = <ErrorState message="No pudimos cargar las facturas." onRetry={onRetry} />
  } else if (loading || !sales) {
    content = (
      <DataTable columns={columns} rows={undefined} rowKey={(s) => s.id} loading error={false} onRetry={onRetry} emptyMessage="" skeletonRows={8} />
    )
  } else if (activeSales(sales).length === 0) {
    content = (
      <EmptyState
        message="Aún no registras ventas. Crea tu primera factura."
        action={
          <Link to="/ventas/nueva" className={buttonClasses('primary')}>
            Nueva factura
          </Link>
        }
      />
    )
  } else {
    const page = paginate(filterSales(sales, filters, today), filters.pagina)
    content =
      page.total === 0 ? (
        <EmptyState
          message="No hay facturas con esos filtros."
          action={
            <Button variant="secondary" onClick={onClear}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} rows={page.rows} rowKey={(s) => s.id} loading={false} error={false} onRetry={onRetry} emptyMessage="" />
          </div>
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Facturas">
            {page.rows.map((sale) => (
              <li key={sale.id}>
                <Link
                  to={`/ventas/${sale.id}`}
                  className="flex items-start justify-between gap-4 rounded-control border border-border p-4 transition-colors duration-(--duration-fast) hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-small text-text">{sale.invoiceNumber}</span>
                    <span className="truncate text-body text-text">{customerName(sale)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabular text-body font-medium text-text">{formatCurrency(sale.total)}</span>
                    <StatusBadge status={sale.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-4">
            <Pagination page={page} itemLabel="facturas" onPageChange={onPageChange} />
          </div>
        </>
      )
  }

  return <section className={`${card} p-4`}>{content}</section>
}
